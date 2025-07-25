import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import telegramConfig from '../config/telegram.js';
import databaseService from './databaseService.js';

class TelegramParser {
  constructor() {
    this.client = null;
    this.isAuthenticated = false;
    this.config = telegramConfig;
    this.bot = null; // Telegram bot instance для отправки сообщений
    this.userSubscriptions = []; // Подписки пользователей
    this.channels = []; // Каналы для парсинга из базы данных
    this.categories = {}; // Категории из базы данных
    
    // Регулярные выражения для извлечения данных
    this.patterns = {
      budget: /(?:бюджет|budget|цена|стоимость|оплата)[\s:]*(\d+(?:\s*[-–—]\s*\d+)?)\s*([₽$€]|руб|дол|евро)/i,
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /(?:\+7|8)[\s\-\(\)]?(?:\d[\s\-\(\)]?){10}/g,
      telegram: /@[a-zA-Z0-9_]+/g,
      deadline: /(?:срок|deadline|до)[\s:]*(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]?\d{2,4}?)/i
    };
  }

  // Устанавливает bot instance и подписки пользователей
  setBotAndSubscriptions(bot, userSubscriptions) {
    this.bot = bot;
    this.userSubscriptions = userSubscriptions;
  }

  async init() {
    try {
      if (!this.config.apiId || !this.config.apiHash) {
        throw new Error('API ID и API Hash должны быть установлены в src/config/telegram.js');
      }

      const session = new StringSession(this.config.session || '');
      
      this.client = new TelegramClient(session, this.config.apiId, this.config.apiHash, {
        connectionRetries: 5,
        deviceModel: this.config.settings.deviceModel,
        appVersion: this.config.settings.appVersion
      });

      if (!this.config.session) {
        console.log('⚠️ Session не найдена, требуется авторизация');
        return false;
      }

      await this.client.connect();
      this.isAuthenticated = await this.client.checkAuthorization();
      
      if (!this.isAuthenticated) {
        console.log('⚠️ Telegram client not authenticated');
        return false;
      }

      console.log('✅ Telegram client успешно инициализирован');
      return true;
    } catch (error) {
      console.error('❌ Telegram client initialization error:', error);
      return false;
    }
  }

  async parseAllChannels() {
    if (!this.isAuthenticated) {
      console.log('❌ Telegram client не авторизован');
      return 0;
    }

    if (!this.bot) {
      console.log('❌ Bot instance не установлен');
      return 0;
    }

    try {
      // Загружаем каналы из базы данных
      await this.loadChannelsFromDatabase();
      
      if (this.channels.length === 0) {
        console.log('⚠️ Нет активных каналов для парсинга');
        return 0;
      }

      let totalJobs = 0;
      console.log(`📋 Каналов для парсинга: ${this.channels.length}`);
      console.log(`👥 Активных пользователей с подписками: ${this.userSubscriptions.length}`);

      for (const channel of this.channels) {
        try {
          console.log(`🔍 Парсинг канала: ${channel.name} (@${channel.username}) [${channel.categories.name}]`);
          const channelJobs = await this.parseChannel(channel);
          totalJobs += channelJobs;
          console.log(`✅ ${channel.name}: ${channelJobs} новых заказов отправлено`);
          
          // Обновляем время последнего парсинга
          await databaseService.updateChannelLastParsed(channel.id);
          
          // Пауза между каналами
          await this.sleep(this.config.settings.pauseBetweenChannels);
        } catch (error) {
          console.error(`❌ Ошибка парсинга ${channel.name}:`, error);
        }
      }

      console.log(`🎉 Всего обработано и отправлено: ${totalJobs} заказов`);
      return totalJobs;
    } catch (error) {
      console.error('❌ Telegram parsing error:', error);
      return 0;
    }
  }

  // Загружает каналы и категории из базы данных
  async loadChannelsFromDatabase() {
    try {
      this.channels = await databaseService.getParsingChannels();
      
      // Создаем мапу категорий для быстрого доступа
      this.categories = {};
      for (const channel of this.channels) {
        this.categories[channel.categories.slug] = channel.categories;
      }
      
      console.log(`📋 Загружено каналов: ${this.channels.length}`);
      console.log(`📂 Категорий: ${Object.keys(this.categories).length}`);
    } catch (error) {
      console.error('❌ Ошибка загрузки каналов из базы данных:', error);
      this.channels = [];
      this.categories = {};
    }
  }

  async parseChannel(channel) {
    try {
      // Получаем entity канала
      const entity = await this.client.getEntity(channel.username);
      
      // Получаем последние сообщения (за последние N часов)
      const timeWindow = this.config.settings.timeWindow * 60 * 60; // часы в секунды
      const messages = await this.client.getMessages(entity, {
        limit: this.config.settings.messageLimit,
        offsetDate: Math.floor(Date.now() / 1000) - timeWindow
      });

      let jobsCount = 0;

      for (const message of messages) {
        if (!message.text) continue;

        // Проверяем, содержит ли сообщение ключевые слова из базы данных
        const hasKeywords = channel.keywords.some(keyword => 
          message.text.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!hasKeywords) continue;

        // Извлекаем данные о заказе
        const jobData = this.extractJobData(message, channel);
        
        if (jobData) {
          // Отправляем заказ подписанным пользователям
          const sentCount = await this.sendJobToSubscribers(jobData);
          if (sentCount > 0) {
            jobsCount++;
            console.log(`💼 Заказ отправлен ${sentCount} пользователям: ${jobData.title.substring(0, 50)}...`);
          }
        }

        // Небольшая пауза между сообщениями
        await this.sleep(100);
      }

      return jobsCount;
    } catch (error) {
      console.error(`❌ Ошибка парсинга канала ${channel.username}:`, error);
      return 0;
    }
  }

  extractJobData(message, channel) {
    try {
      const text = message.text;
      const messageId = message.id;
      const messageDate = new Date(message.date * 1000);

      // Извлекаем заголовок (первая строка или первые 100 символов)
      const lines = text.split('\n').filter(line => line.trim());
      const title = lines[0] ? lines[0].substring(0, 100) : 'Заказ из телеграм канала';

      // Извлекаем бюджет
      const budgetMatch = text.match(this.patterns.budget);
      let budgetMin = null;
      let budgetMax = null;
      let currency = 'RUB';

      if (budgetMatch) {
        const budgetStr = budgetMatch[1];
        const currencyStr = budgetMatch[2];
        
        if (budgetStr.includes('-') || budgetStr.includes('–') || budgetStr.includes('—')) {
          const [min, max] = budgetStr.split(/[-–—]/).map(b => parseInt(b.trim().replace(/\s/g, '')));
          budgetMin = min || null;
          budgetMax = max || null;
        } else {
          budgetMin = parseInt(budgetStr.replace(/\s/g, ''));
          budgetMax = budgetMin;
        }

        // Определяем валюту
        if (currencyStr.includes('$') || currencyStr.includes('дол')) currency = 'USD';
        else if (currencyStr.includes('€') || currencyStr.includes('евро')) currency = 'EUR';
      }

      // Используем категорию канала из базы данных
      const category = channel.categories;

      // Создаем URL к сообщению
      const url = `https://t.me/${channel.username}/${messageId}`;

      return {
        title: this.cleanText(title),
        description: this.cleanText(text.substring(0, 1000)),
        category_id: category.slug, // Используем slug вместо id
        category_name: category.name,
        budget_min: budgetMin,
        budget_max: budgetMax,
        currency: currency,
        url: url,
        source: `telegram_${channel.username}`,
        published_at: messageDate.toISOString(),
        channel_id: channel.id // Добавляем ID канала
      };
    } catch (error) {
      console.error('Error extracting job data:', error);
      return null;
    }
  }

  // Метод больше не нужен, так как категория определяется каналом
  // Оставляем для обратной совместимости
  detectCategory(text) {
    // Этот метод больше не используется, так как категория берется из канала
    return null;
  }

  async sendJobToSubscribers(jobData) {
    let sentCount = 0;

    try {
      // Находим пользователей, подписанных на эту категорию
      const subscribedUsers = this.userSubscriptions.filter(sub => 
        sub.category_id === jobData.category_id && sub.is_active
      );

      for (const subscription of subscribedUsers) {
        try {
          const message = this.formatJobMessage(jobData);
          
          await this.bot.telegram.sendMessage(
            subscription.user.telegram_id,
            message,
            {
              parse_mode: 'Markdown',
              disable_web_page_preview: true
            }
          );
          
          sentCount++;
          
          // Пауза между отправками
          await this.sleep(50);
          
        } catch (error) {
          console.error(`Error sending to user ${subscription.user.telegram_id}:`, error);
          
          // Если пользователь заблокировал бота
          if (error.response?.error_code === 403) {
            console.log(`User ${subscription.user.telegram_id} blocked the bot`);
          }
        }
      }

    } catch (error) {
      console.error('Error sending job to subscribers:', error);
    }

    return sentCount;
  }

  formatJobMessage(jobData) {
    const budgetText = jobData.budget_min && jobData.budget_max 
      ? `💰 ${jobData.budget_min} - ${jobData.budget_max} ${jobData.currency}`
      : '💰 Бюджет не указан';

    return `
🔔 Новый заказ

📋 ${this.sanitizeText(jobData.title)}

${budgetText}
📂 ${jobData.category_name}
🔗 [Перейти к заказу](${jobData.url})

💡 Для отписки используйте /settings
    `.trim();
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы
      .replace(/[^\w\sа-яёА-ЯЁ.,!?():\-@]/g, '') // Убираем специальные символы кроме нужных
      .trim();
  }

  // Санитизируем текст для Markdown
  sanitizeText(text) {
    if (!text) return '';
    return text
      .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
      .substring(0, 200);
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Получить каналы из базы данных
  getChannels() {
    return this.channels;
  }

  // Получить категории из базы данных
  getCategories() {
    return this.categories;
  }
}

export default new TelegramParser(); 
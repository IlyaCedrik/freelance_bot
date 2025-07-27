import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import telegramConfig from '../config/telegram.js';
import databaseService from './databaseService.js';
import notificationService from './notificationService.js';

// Константы
const CONNECTION_ERRORS = [
  'TIMEOUT', 
  'CONNECTION_DEVICE_MODEL_EMPTY', 
  'NETWORK_MIGRATE', 
  'CONNECTION_NOT_INITED', 
  'CHANNEL_PRIVATE'
];

const TIMEOUTS = {
  HEALTH_CHECK: 10000,
  GET_ENTITY: 15000,
  GET_MESSAGES: 20000,
  CONNECTION_CACHE: 5 * 60 * 1000, // 5 минут
};

const DELAYS = {
  BETWEEN_MESSAGES: 100,
  MAX_RECONNECT: 10000,
};

/**
 * Сервис для парсинга сообщений из Telegram каналов
 */
class TelegramParser {
  constructor() {
    this.client = null;
    this.isAuthenticated = false;
    this.config = telegramConfig;
    this.bot = null;
    this.userSubscriptions = [];
    this.channels = [];
    this.categories = {};
    this.connectionHealthy = false;
    this.lastConnectionCheck = null;
    this.maxReconnectAttempts = 3;
  }

  /**
   * Устанавливает бота и подписки пользователей
   * @param {Object} bot - Экземпляр Telegram бота
   * @param {Array} userSubscriptions - Список подписок пользователей
   */
  setBotAndSubscriptions(bot, userSubscriptions) {
    this.bot = bot;
    this.userSubscriptions = userSubscriptions;
    notificationService.setBot(bot);
  }

  /**
   * Инициализация клиента Telegram
   * @returns {Promise<boolean>} Успешность инициализации
   */
  async init() {
    try {
      this._validateConfig();
      
      if (await this._isExistingConnectionHealthy()) {
        console.log('✅ Using existing healthy Telegram connection');
        return true;
      }

      await this._initializeClient();
      await this._authenticateClient();
      
      this._markConnectionHealthy();
      console.log('✅ Telegram client успешно инициализирован');
      return true;
    } catch (error) {
      console.error('❌ Telegram init error:', error.message);
      this._markConnectionUnhealthy();
      return false;
    }
  }

  /**
   * Проверяет валидность конфигурации
   * @private
   */
  _validateConfig() {
    if (!this.config.apiId || !this.config.apiHash) {
      throw new Error('API ID и API Hash должны быть установлены');
    }
  }

  /**
   * Проверяет существующее соединение
   * @private
   * @returns {Promise<boolean>}
   */
  async _isExistingConnectionHealthy() {
    return this.client && 
           this.connectionHealthy && 
           await this.checkConnectionHealth();
  }

  /**
   * Инициализирует Telegram клиент
   * @private
   */
  async _initializeClient() {
    if (!this.config.session) {
      throw new Error('Session не найдена');
    }

    const session = new StringSession(this.config.session);
    
    this.client = new TelegramClient(session, this.config.apiId, this.config.apiHash, {
      connectionRetries: 5,
      retryDelay: 2000,
      timeout: 30000,
      deviceModel: this.config.settings.deviceModel,
      appVersion: this.config.settings.appVersion,
      useWSS: false
    });

    await this.connectWithRetry();
  }

  /**
   * Аутентификация клиента
   * @private
   */
  async _authenticateClient() {
    this.isAuthenticated = await this.client.checkAuthorization();
    
    if (!this.isAuthenticated) {
      throw new Error('Аутентификация не пройдена');
    }
  }

  /**
   * Подключение с повторными попытками
   */
  async connectWithRetry() {
    for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
      try {
        await this.client.connect();
        return;
      } catch (error) {
        if (attempt < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt), DELAYS.MAX_RECONNECT);
          await this.sleep(delay);
        } else {
          throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
        }
      }
    }
  }

  /**
   * Проверка состояния соединения
   * @returns {Promise<boolean>}
   */
  async checkConnectionHealth() {
    try {
      if (this._isCacheValid()) {
        return this.connectionHealthy;
      }

      if (!this.client?.connected) {
        return this._markConnectionUnhealthy();
      }

      await this._performHealthCheck();
      return this._markConnectionHealthy();
    } catch (error) {
      return this._markConnectionUnhealthy();
    }
  }

  /**
   * Проверяет валидность кеша соединения
   * @private
   * @returns {boolean}
   */
  _isCacheValid() {
    return this.lastConnectionCheck && 
           Date.now() - this.lastConnectionCheck < TIMEOUTS.CONNECTION_CACHE;
  }

  /**
   * Выполняет проверку здоровья соединения
   * @private
   */
  async _performHealthCheck() {
    await Promise.race([
      this.client.getMe(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), TIMEOUTS.HEALTH_CHECK)
      )
    ]);
  }

  /**
   * Помечает соединение как здоровое
   * @private
   * @returns {boolean}
   */
  _markConnectionHealthy() {
    this.connectionHealthy = true;
    this.lastConnectionCheck = Date.now();
    return true;
  }

  /**
   * Помечает соединение как нездоровое
   * @private
   * @returns {boolean}
   */
  _markConnectionUnhealthy() {
    this.connectionHealthy = false;
    return false;
  }

  /**
   * Восстановление соединения
   * @returns {Promise<boolean>}
   */
  async ensureConnection() {
    if (await this.checkConnectionHealth()) return true;
    
    try {
      if (this.client) await this.client.disconnect();
      return await this.init();
    } catch (error) {
      console.error('❌ Failed to restore connection:', error.message);
      return false;
    }
  }

  /**
   * Парсинг всех каналов
   * @returns {Promise<number>} Количество найденных заказов
   */
  async parseAllChannels() {
    if (!this._isReadyForParsing()) {
      return 0;
    }

    try {
      const startTime = new Date();
      console.log(`📡 Starting Telegram channels parsing at ${startTime.toLocaleString('ru-RU')}`);
      
      if (!await this.ensureConnection()) return 0;

      await this.loadChannelsFromDatabase();
      if (this.channels.length === 0) {
        console.log('⚠️ No channels to parse');
        return 0;
      }

      console.log(`📋 Parsing ${this.channels.length} channels...`);
      const totalJobs = await this._parseChannelsSequentially();
      
      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      console.log(`📡 Telegram channels parsing completed: ${totalJobs} jobs found in ${duration}s`);
      
      return totalJobs;
    } catch (error) {
      console.error('❌ Telegram parsing error:', error.message);
      
      if (this.isConnectionError(error)) {
        this.connectionHealthy = false;
      }
      
      return 0;
    }
  }

  /**
   * Проверяет готовность к парсингу
   * @private
   * @returns {boolean}
   */
  _isReadyForParsing() {
    return this.isAuthenticated && this.connectionHealthy && this.bot;
  }

  /**
   * Парсит каналы последовательно
   * @private
   * @returns {Promise<number>}
   */
  async _parseChannelsSequentially() {
    let totalJobs = 0;

    for (const channel of this.channels) {
      try {
        if (!await this.ensureConnection()) continue;

        const channelJobs = await this.parseChannel(channel);
        totalJobs += channelJobs;
        
        if (channelJobs > 0) {
          await databaseService.updateChannelLastParsed(channel.id);
        }
        
        await this.sleep(this.config.settings.pauseBetweenChannels);
      } catch (error) {
        console.error(`❌ Error parsing ${channel.name}:`, error.message);
        
        if (this.isConnectionError(error)) {
          await this.ensureConnection();
        }
      }
    }

    return totalJobs;
  }

  /**
   * Загрузка каналов из базы данных
   */
  async loadChannelsFromDatabase() {
    try {
      this.channels = await databaseService.getParsingChannels();
      this._buildCategoriesMap();
    } catch (error) {
      console.error('❌ Error loading channels:', error.message);
      this.channels = [];
      this.categories = {};
    }
  }

  /**
   * Строит карту категорий
   * @private
   */
  _buildCategoriesMap() {
    this.categories = {};
    for (const channel of this.channels) {
      this.categories[channel.categories.slug] = channel.categories;
    }
  }

  /**
   * Парсинг отдельного канала
   * @param {Object} channel - Данные канала
   * @returns {Promise<number>} Количество найденных заказов
   */
  async parseChannel(channel) {
    try {
      const entity = await this._getChannelEntity(channel);
      const messages = await this._getChannelMessages(entity);
      const recentMessages = this._filterRecentMessages(messages);
      
      console.log(`📋 Получено ${messages.length} сообщений, из них за последние ${this.config.settings.timeWindow}ч: ${recentMessages.length} из канала ${channel.name}`);

      return await this._processChannelMessages(recentMessages, channel);
    } catch (error) {
      if (error.message?.includes('TIMEOUT')) {
        this.connectionHealthy = false;
      }
      throw error;
    }
  }

  /**
   * Получает entity канала
   * @private
   * @param {Object} channel
   * @returns {Promise<Object>}
   */
  async _getChannelEntity(channel) {
    return Promise.race([
      this.client.getEntity(channel.username),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT: getEntity')), TIMEOUTS.GET_ENTITY)
      )
    ]);
  }

  /**
   * Получает сообщения канала
   * @private
   * @param {Object} entity
   * @returns {Promise<Array>}
   */
  async _getChannelMessages(entity) {
    return Promise.race([
      this.client.getMessages(entity, {
        limit: this.config.settings.messageLimit
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT: getMessages')), TIMEOUTS.GET_MESSAGES)
      )
    ]);
  }

  /**
   * Фильтрует недавние сообщения
   * @private
   * @param {Array} messages
   * @returns {Array}
   */
  _filterRecentMessages(messages) {
    const timeWindow = this.config.settings.timeWindow * 60 * 60; // в секундах
    const cutoffTime = Math.floor(Date.now() / 1000) - timeWindow;
    return messages.filter(msg => msg.date >= cutoffTime);
  }

  /**
   * Обрабатывает сообщения канала
   * @private
   * @param {Array} messages
   * @param {Object} channel
   * @returns {Promise<number>}
   */
  async _processChannelMessages(messages, channel) {
    let jobsCount = 0;

    for (const message of messages) {
      if (!message.text) continue;

      const hasKeywords = this._messageHasKeywords(message, channel);
      if (!hasKeywords) continue;

      const jobData = this.extractJobData(message, channel);
      
      if (jobData) {
        const sentCount = await this.sendJobToSubscribers(jobData);
        if (sentCount > 0) jobsCount++;
      }

      await this.sleep(DELAYS.BETWEEN_MESSAGES);
    }

    return jobsCount;
  }

  /**
   * Проверяет наличие ключевых слов в сообщении
   * @private
   * @param {Object} message
   * @param {Object} channel
   * @returns {boolean}
   */
  _messageHasKeywords(message, channel) {
    return channel.keywords.some(keyword => 
      message.text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Извлекает данные заказа из сообщения
   * @param {Object} message - Сообщение из Telegram
   * @param {Object} channel - Данные канала
   * @returns {Object|null} Данные заказа
   */
  extractJobData(message, channel) {
    try {
      return {
        message,
        category_id: channel.categories.slug,
        category_name: channel.categories.name,
        url: `https://t.me/${channel.username}/${message.id}`,
        source: `telegram_${channel.username}`,
        published_at: new Date(message.date * 1000).toISOString(),
        channel_id: channel.id
      };
    } catch (error) {
      console.error('Error extracting job data:', error.message);
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
    try {
      const subscribedUsers = this._getSubscribedUsers(jobData.category_id);
      return await notificationService.sendJobToSubscribers(jobData, subscribedUsers);
    } catch (error) {
      console.error('Error sending job to subscribers:', error.message);
      return 0;
    }
  }

  /**
   * Получает подписанных пользователей
   * @private
   * @param {string} categoryId
   * @returns {Array}
   */
  _getSubscribedUsers(categoryId) {
    return this.userSubscriptions.filter(sub => 
      sub.category_id === categoryId && sub.is_active
    );
  }

  /**
   * Проверяет является ли ошибка связанной с соединением
   * @param {Error} error
   * @returns {boolean}
   */
  isConnectionError(error) {
    return CONNECTION_ERRORS.some(errType => 
      error.message?.includes(errType) || error.toString().includes(errType)
    );
  }

  /**
   * Отключение от Telegram
   */
  async disconnect() {
    try {
      if (this.client?.connected) {
        await this.client.disconnect();
        this.connectionHealthy = false;
        this.lastConnectionCheck = null;
      }
    } catch (error) {
      console.error('❌ Disconnect error:', error.message);
    }
  }

  /**
   * Мягкое отключение (очистка кеша)
   */
  async softDisconnect() {
    this.lastConnectionCheck = null;
  }

  /**
   * Утилита для паузы
   * @param {number} ms - Миллисекунды
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new TelegramParser();

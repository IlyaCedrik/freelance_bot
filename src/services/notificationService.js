import MessageFormatter from './messageFormatter.js';

/**
 * Константы задержек для отправки уведомлений
 * @readonly
 * @enum {number}
 */
const DELAYS = {
  /** Задержка между отправкой сообщений разным пользователям (мс) */
  BETWEEN_USERS: 50,
};

/**
 * Сервис для отправки уведомлений пользователям через Telegram бота
 * 
 * @class NotificationService
 * @description Управляет отправкой различных типов уведомлений:
 * - Уведомления о новых заказах подписчикам
 * - Уведомления об использовании промокодов
 * - Административные уведомления
 */
class NotificationService {
  /**
   * Создает экземпляр NotificationService
   */
  constructor() {
    /** @type {import('telegraf').Telegraf|null} */
    this.bot = null;
  }

  /**
   * Устанавливает экземпляр бота для отправки сообщений
   * 
   * @param {import('telegraf').Telegraf} bot - Экземпляр Telegraf бота
   * @throws {Error} Если bot не является валидным экземпляром Telegraf
   */
  setBot(bot) {
    this.bot = bot;
  }

  /**
   * Отправляет уведомление о новом заказе всем подписчикам категории
   * 
   * @param {Object} jobData - Данные о заказе
   * @param {string} jobData.category_name - Название категории заказа
   * @param {string} jobData.url - Ссылка на источник заказа
   * @param {Object} jobData.message - Объект сообщения
   * @param {string} jobData.message.message - Текст сообщения
   * @param {Array} [jobData.message.entities] - Telegram entities для форматирования
   * 
   * @param {Array<Object>} subscribedUsers - Массив подписок пользователей
   * @param {Object} subscribedUsers[].user - Объект пользователя
   * @param {number} subscribedUsers[].user.telegram_id - Telegram ID пользователя
   * 
   * @returns {Promise<number>} Количество успешно отправленных сообщений
   * @throws {Error} Если экземпляр бота не установлен
   * 
   * @example
   * const sentCount = await notificationService.sendJobToSubscribers(
   *   {
   *     category_name: 'Веб-разработка',
   *     url: 'https://t.me/freelance_channel/123',
   *     message: { 
   *       message: 'Нужен React разработчик',
   *       entities: []
   *     }
   *   },
   *   [{ user: { telegram_id: 123456789 } }]
   * );
   */
  async sendJobToSubscribers(jobData, subscribedUsers) {
    if (!this.bot) {
      throw new Error('Bot instance not set');
    }

    let sentCount = 0;

    for (const subscription of subscribedUsers) {
      try {
        await this._sendJobMessage(subscription, jobData);
        sentCount++;
        await this._sleep(DELAYS.BETWEEN_USERS);
      } catch (error) {
        if (error.response?.error_code !== 403) {
          console.error(`Error sending to user ${subscription.user.telegram_id}:`, error.message);
        }
      }
    }

    return sentCount;
  }

  /**
   * Отправляет уведомление создателю промокода об его использовании
   * 
   * @param {number|string} telegramId - Telegram ID создателя промокода
   * @param {Object} promoCode - Объект промокода
   * @param {string} promoCode.code - Код промокода
   * @param {number} promoCode.usage_count - Текущее количество использований
   * @param {number} [promoCode.usage_limit] - Лимит использований (если есть)
   * @param {number} [promoCode.bonus_days=0] - Количество бонусных дней
   * @param {number} [promoCode.discount_percent=0] - Процент скидки
   * @param {string} userName - Имя пользователя, который использовал промокод
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await notificationService.sendPromoCodeUsageNotification(
   *   123456789,
   *   {
   *     code: 'SAVE20',
   *     usage_count: 5,
   *     usage_limit: 10,
   *     bonus_days: 7,
   *     discount_percent: 20
   *   },
   *   'Иван Иванов'
   * );
   */
  async sendPromoCodeUsageNotification(telegramId, promoCode, userName) {
    if (!this.bot) {
      console.error('Bot instance not set for promo code notification');
      return;
    }

    try {
      const bonusText = promoCode.bonus_days > 0 ? ` (+${promoCode.bonus_days} дней)` : '';
      const discountText = promoCode.discount_percent > 0 ? ` (скидка ${promoCode.discount_percent}%)` : '';

      const notificationMessage = `
🎉 Ваш промокод использован!

🎫 Промокод: ${promoCode.code}
👤 Пользователь: ${userName}
🔢 Использований: ${promoCode.usage_count + 1}${promoCode.usage_limit ? `/${promoCode.usage_limit}` : ''}

💎 Бонусы промокода:${bonusText}${discountText}

📊 Посмотреть статистику промокодов можно в реферальной системе.
      `;

      await this.bot.telegram.sendMessage(telegramId, notificationMessage.trim());
      console.log(`✅ Уведомление о промокоде отправлено пользователю ${telegramId}`);
      
    } catch (error) {
      console.error(`❌ Ошибка отправки уведомления о промокоде пользователю ${telegramId}:`, error.message);
    }
  }

  /**
   * Отправляет административное уведомление указанному пользователю
   * 
   * @param {number|string} telegramId - Telegram ID получателя
   * @param {string} message - Текст уведомления
   * 
   * @returns {Promise<void>}
   * @throws {Error} Если экземпляр бота не установлен
   * @throws {Error} Если Telegram ID не предоставлен
   * @throws {Error} Если произошла ошибка при отправке сообщения
   * 
   * @example
   * await notificationService.sendAdminNotification(
   *   123456789,
   *   'Новый запрос на промокод от пользователя'
   * );
   */
  async sendAdminNotification(telegramId, message) {
    if (!this.bot) {
      const errorMsg = 'Bot instance not set for admin notification';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    if (!telegramId) {
      const errorMsg = 'Telegram ID not provided for admin notification';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    try {
      console.log(`📤 Отправляем админ уведомление на ${telegramId}`);
      await this.bot.telegram.sendMessage(telegramId, message.trim());
      console.log(`✅ Админ уведомление отправлено ${telegramId}`);
    } catch (error) {
      console.error(`❌ Ошибка отправки админ уведомления ${telegramId}:`, error.message || error);
      throw error;
    }
  }

  /**
   * Отправляет сообщение о заказе конкретному пользователю
   * 
   * @private
   * @param {Object} subscription - Объект подписки пользователя
   * @param {Object} subscription.user - Объект пользователя
   * @param {number} subscription.user.telegram_id - Telegram ID пользователя
   * @param {Object} jobData - Данные о заказе
   * @param {string} jobData.category_name - Название категории заказа
   * @param {string} jobData.url - Ссылка на источник заказа
   * @param {Object} jobData.message - Объект сообщения
   * @param {string} jobData.message.message - Текст сообщения
   * @param {Array} [jobData.message.entities] - Telegram entities для форматирования
   * 
   * @returns {Promise<void>}
   * @throws {Error} Если произошла ошибка при отправке сообщения
   */
  async _sendJobMessage(subscription, jobData) {
    const htmlText = MessageFormatter.convertToHTML({
      message: jobData.message.message,
      entities: jobData.message.entities || []
    });

    await this.bot.telegram.sendMessage(
      subscription.user.telegram_id,
      MessageFormatter.formatJobMessage({
        category_name: jobData.category_name,
        url: jobData.url,
        text: htmlText,
      }),
      { 
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }
    );
  }

  /**
   * Создает задержку на указанное количество миллисекунд
   * 
   * @private
   * @param {number} ms - Количество миллисекунд для задержки
   * @returns {Promise<void>} Promise, который разрешается через указанное время
   * 
   * @example
   * await this._sleep(1000); // Задержка на 1 секунду
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Экземпляр сервиса уведомлений (Singleton)
 * @type {NotificationService}
 */
export default new NotificationService();
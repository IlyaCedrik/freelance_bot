/**
 * Константы и конфигурация приложения
 */

/**
 * Порт по умолчанию для сервера
 */
export const DEFAULT_PORT = 3003;

/**
 * Процессы для завершения работы
 */
export const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];

/**
 * Сообщения об ошибках
 */
export const ERROR_MESSAGES = {
  UNKNOWN_COMMAND: '❌ Неизвестная команда. Попробуйте /start',
  GENERAL_ERROR: '❌ Произошла ошибка. Попробуйте позже или обратитесь в поддержку.',
  PROMO_SESSION_EXPIRED: '⚠️ Сессия создания промокода истекла. Начните заново.',
  REQUEST_SESSION_EXPIRED: '⚠️ Сессия запроса промокода истекла. Начните заново.',
  START_PROMO_FIRST: 'Сначала начните создание промокода',
  START_REQUEST_FIRST: 'Сначала начните создание запроса на промокод'
};

/**
 * Сообщения об успехе
 */
export const SUCCESS_MESSAGES = {
  PROMO_CANCELLED: 'Создание промокода отменено',
  REQUEST_CANCELLED: 'Запрос на промокод отменен',
  COMMANDS_CONFIGURED: '✅ Bot commands menu configured successfully'
};

/**
 * Сообщения для восстановления сессии
 */
export const RECOVERY_MESSAGES = {
  PROMO_EXPIRED: 'Сессия создания промокода истекла. Нажмите на кнопку ниже, чтобы начать заново.',
  REQUEST_EXPIRED: 'Сессия запроса промокода истекла. Нажмите на кнопку ниже, чтобы начать заново.'
};

/**
 * Конфигурация логирования
 */
export const LOG_CONFIG = {
  STARTUP: {
    BOT_POLLING: '🤖 Bot started in polling mode',
    SERVER_RUNNING: (port) => `🚀 Server running on port ${port}`,
    DEV_SERVER_RUNNING: (port) => `🚀 Dev server running on port ${port}`,
    WEBHOOK_URL: (url) => `📡 Webhook URL: ${url}/webhook`,
    NAVIGATION_REGISTERED: (count) => `🧭 Navigation routes registered: ${count}`
  },
  ERROR: {
    BOT_ERROR: 'Bot error occurred:',
    SETUP_COMMANDS_ERROR: '❌ Error setting up bot commands:',
    PROMO_CREATION_ERROR: 'Cancel promo creation error:',
    PROMO_REQUEST_ERROR: 'Cancel promo request error:',
    CALLBACK_QUERY_ERROR: 'Error handling unknown callback query:',
    UNKNOWN_CALLBACK: (data, userId, sceneName) => 
      `❓ Unknown callback query: ${data} from user ${userId} (scene: ${sceneName})`
  }
};

/**
 * Регулярные выражения для проверки паттернов
 */
export const REGEX_PATTERNS = {
  SUBSCRIBE: /^subscribe_(.+)$/,
  UNSUBSCRIBE: /^unsubscribe_(.+)$/,
  TRIAL: /^trial_(.+)$/,
  PAY: /^pay_(.+)$/,
  USE_PROMO: /^use_promo_(.+)$/,
  CANCEL_SUBSCRIPTION: /^cancel_subscription_(.+)$/,
  CONFIRM_CANCEL: /^confirm_cancel_(.+)$/,
  ADMIN_CHANNEL_DETAILS: /^admin_channel_details_(.+)$/,
  PROMO_DAYS: /^promo_days_\d+$/,
  PROMO_DISCOUNT: /^promo_discount_\d+$/,
  PROMO_LIMIT: /^promo_limit_\d+$/,
  REQUEST_DAYS: /^request_days_\d+$/,
  REQUEST_DISCOUNT: /^request_discount_\d+$/,
  REQUEST_LIMIT: /^request_limit_\d+$/
}; 
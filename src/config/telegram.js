const telegramConfig = {
  apiId: parseInt(process.env.TELEGRAM_API_ID) || 22013850,
  apiHash: process.env.TELEGRAM_API_HASH || 'd061ef88902a38323303d9ebfadfbbca',
  phone: process.env.TELEGRAM_PHONE || '+79605817070',
  session: process.env.TELEGRAM_SESSION || '1AgAOMTQ5LjE1NC4xNjcuNTEBuxNyxwFY3cL1yZzxNv76URmFuFgJZGGWdHnQJLz6n8wrWZoKq0gt5Gh6Ze6DhSHjOgiFZKQnQeOxKCmLdHOfwPiouBWU7Y+wwDzeoEvcX/ydAy/uWADwtvBl6OoahmQsrfgr1zCr2nS+q2RAzFQN67sUPmPfQIVgHaMLZQJ71WMY94fDmfk+TGQVB9nmPY6jhtZljLiMsTxCOgwEIsw9z949qQUM3EY9F6Gcy+s55UEQPs0KKufWZiMD7htHoie8GZ3msHRgIDwkI96qzouHK1ivN4LmAeyf8sSAhIQmQ3vq8F8BWWnkWUtZC3EYRwoWZktpY1c8glN20RdVCWIYI2I=',
  
  settings: {
    messageLimit: 100, // Увеличено для получения всех сообщений за полчаса
    timeWindow: 0.1, // Полчаса - получаем сообщения за последние 30 минут
    pauseBetweenChannels: 3000, // Увеличено с 2000 до 3000мс для снижения нагрузки
    pauseBetweenMessages: 150, // Добавлено для контроля скорости обработки
    deviceModel: 'FreelanceBot',
    appVersion: '1.0.0',
    
    // Новые настройки для стабильности соединения
    connectionTimeout: 30000, // 30 секунд для операций подключения
    requestTimeout: 20000, // 20 секунд для запросов к API
    floodSleepThreshold: 300, // 5 минут ожидания при флуд-контроле
    maxRetries: 3, // Максимальное количество попыток для операций
    retryDelay: 2000, // Задержка между попытками
    
    // Настройки для здоровья соединения
    healthCheckInterval: 300000, // 5 минут между проверками соединения
    maxIdleTime: 600000, // 10 минут максимального простоя перед переподключением
    reconnectOnError: true // Автоматическое переподключение при ошибках
  }
};

export default telegramConfig;
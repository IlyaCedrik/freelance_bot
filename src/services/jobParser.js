import telegramParser from './telegramParser.js';

class JobParser {
  async parseAll() {
    try {
      const startTime = new Date();
      console.log(`🔄 Starting Telegram job parsing at ${startTime.toLocaleString('ru-RU')}...`);
      
      const totalJobs = await this.parseTelegram();
      
      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      console.log(`📊 Total jobs parsed: ${totalJobs} in ${duration}s`);
      return totalJobs;
    } catch (error) {
      console.error('Job parsing error:', error);
      throw error;
    }
  }

  // Новый метод для парсинга с уведомлениями
  async parseAllWithNotifications(bot, userSubscriptions) {
    try {
      const startTime = new Date();
      console.log(`🔄 Starting Telegram job parsing with notifications at ${startTime.toLocaleString('ru-RU')}...`);
      
      const totalJobs = await this.parseTelegramWithNotifications(bot, userSubscriptions);
      
      const endTime = new Date();
      const duration = Math.round((endTime - startTime) / 1000);
      console.log(`📊 Total jobs parsed and sent: ${totalJobs} in ${duration}s`);
      return totalJobs;
    } catch (error) {
      console.error('Job parsing with notifications error:', error);
      return 0;
    }
  }

  async parseTelegram() {
    try {
      const initialized = await telegramParser.init();
      
      if (!initialized) {
        console.log('⚠️ Telegram parser not initialized - skipping');
        return 0;
      }

      const totalJobs = await telegramParser.parseAllChannels();
      
      // Используем мягкое отключение вместо полного разрыва соединения
      await telegramParser.softDisconnect();
      
      return totalJobs;
    } catch (error) {
      console.error('Telegram parsing error:', error);
      return 0;
    }
  }

  async parseTelegramWithNotifications(bot, userSubscriptions) {
    try {
      // Устанавливаем bot instance и подписки
      telegramParser.setBotAndSubscriptions(bot, userSubscriptions);
      
      const initialized = await telegramParser.init();
      
      if (!initialized) {
        console.log('⚠️ Telegram parser not initialized - skipping');
        return 0;
      }

      const totalJobs = await telegramParser.parseAllChannels();
      
      // Используем мягкое отключение для поддержания соединения между циклами
      await telegramParser.softDisconnect();
      
      return totalJobs;
    } catch (error) {
      console.error('Telegram parsing with notifications error:', error);
      // При серьезной ошибке полностью разрываем соединение
      try {
        await telegramParser.disconnect();
      } catch (disconnectError) {
        console.error('Error during disconnect:', disconnectError);
      }
      return 0;
    }
  }

  // Добавляем метод для принудительного переподключения
  async forceReconnect() {
    try {
      console.log('🔄 Forcing Telegram reconnection...');
      await telegramParser.disconnect();
      await telegramParser.init();
      console.log('✅ Force reconnection completed');
    } catch (error) {
      console.error('❌ Force reconnection failed:', error);
    }
  }
}

export default new JobParser(); 
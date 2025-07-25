import telegramParser from './telegramParser.js';

class JobParser {
  async parseAll() {
    try {
      console.log('🔄 Starting Telegram job parsing...');
      
      const totalJobs = await this.parseTelegram();
      console.log(`📊 Total jobs parsed: ${totalJobs}`);
      return totalJobs;
    } catch (error) {
      console.error('Job parsing error:', error);
      throw error;
    }
  }

  // Новый метод для парсинга с уведомлениями
  async parseAllWithNotifications(bot, userSubscriptions) {
    try {
      console.log('🔄 Starting Telegram job parsing with notifications...');
      
      const totalJobs = await this.parseTelegramWithNotifications(bot, userSubscriptions);
      console.log(`📊 Total jobs parsed and sent: ${totalJobs}`);
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
      await telegramParser.disconnect();
      
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
      await telegramParser.disconnect();
      
      return totalJobs;
    } catch (error) {
      console.error('Telegram parsing with notifications error:', error);
      return 0;
    }
  }
}

export default new JobParser(); 
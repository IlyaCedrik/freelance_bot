import cron from 'node-cron';
import User from '../database/models/User.js';

class SchedulerService {
  constructor(bot) {
    this.bot = bot;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    // Parse jobs every 5 minutes and send notifications
    cron.schedule('*/2 * * * *', async () => {
      await this.parseAndNotify();
    });

    this.isRunning = true;
    console.log('📅 Scheduler started - parsing every 2 minutes');
  }

  async parseAndNotify() {
    try {
      console.log('🔄 Starting parse and notify cycle...');
      
      // Получаем активных подписчиков
      const activeUsers = await User.getActiveSubscribers();
      console.log(`👥 Found ${activeUsers.length} active subscribers`);

      if (activeUsers.length === 0) {
        console.log('ℹ️ No active subscribers, skipping parsing');
        return;
      }

      // Преобразуем подписки в формат для парсера
      const userSubscriptions = this.prepareUserSubscriptions(activeUsers);
      
      // Парсим заявки и сразу отправляем их пользователям
      const totalJobs = await this.parseJobsAndSend(userSubscriptions);
      
      if (totalJobs > 0) {
        console.log(`📬 ${totalJobs} jobs found and sent to subscribers`);
      } else {
        console.log('ℹ️ No new jobs found');
      }
      
      console.log('✅ Parse and notify cycle completed');
    } catch (error) {
      console.error('❌ Parse and notify cycle error:', error);
    }
  }

  // Преобразует подписки пользователей в формат для парсера
  prepareUserSubscriptions(activeUsers) {
    const subscriptions = [];
    
    for (const user of activeUsers) {
      for (const subscription of user.subscriptions) {
        // Используем slug категории напрямую (он уже есть в базе данных)
        const categorySlug = subscription.categories.slug;

        subscriptions.push({
          user: {
            telegram_id: user.telegram_id,
            username: user.username,
            first_name: user.first_name
          },
          category_id: categorySlug, // Используем slug вместо маппинга
          category_name: subscription.categories.name,
          is_active: subscription.is_active && 
                    new Date(subscription.expires_at) > new Date()
        });
      }
    }
    
    return subscriptions;
  }

  async parseJobsAndSend(userSubscriptions) {
    try {
      console.log('🔄 Parsing jobs and sending to subscribers...');
      
      // Import jobParser here to avoid circular dependencies
      const { default: jobParser } = await import('./jobParser.js');
      
      // Передаем bot instance и подписки в парсер
      const totalJobs = await jobParser.parseAllWithNotifications(this.bot, userSubscriptions);
      
      console.log(`✅ Job parsing and sending completed: ${totalJobs} jobs processed`);
      return totalJobs;
    } catch (error) {
      console.error('Job parsing and sending error:', error);
      return 0;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

let schedulerInstance = null;

export default {
  start: () => {
    if (!schedulerInstance) {
      // Bot instance will be injected when available
      schedulerInstance = new SchedulerService();
    }
    schedulerInstance.start();
  },
  
  setBot: (bot) => {
    if (schedulerInstance) {
      schedulerInstance.bot = bot;
    }
  }
}; 
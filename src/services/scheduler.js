import cron from 'node-cron';
import User from '../database/models/User.js';
import Job from '../database/models/Job.js';
import { supabase } from '../config/supabase.js';

class SchedulerService {
  constructor(bot) {
    this.bot = bot;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    // Daily job notifications at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      await this.sendDailyNotifications();
    });

    // Parse jobs every hour
    cron.schedule('0 * * * *', async () => {
      await this.parseJobs();
    });

    this.isRunning = true;
    console.log('📅 Scheduler started');
  }

  async sendDailyNotifications() {
    try {
      console.log('📬 Starting daily notifications...');
      
      const activeUsers = await User.getActiveSubscribers();

      for (const user of activeUsers) {
        try {
          // Get user's subscribed categories
          const categoryIds = user.subscriptions.map(sub => sub.category_id);
          
          // Get fresh jobs for these categories
          const { data: jobs, error } = await supabase
            .from('jobs')
            .select(`
              *,
              categories(name)
            `)
            .in('category_id', categoryIds)
            .not('id', 'in', `(
              SELECT job_id FROM sent_jobs WHERE user_id = '${user.id}'
            )`)
            .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('published_at', { ascending: false })
            .limit(10);

          if (error) throw error;

          if (jobs.length > 0) {
            await this.sendJobsToUser(user.telegram_id, jobs, user.id);
          }

        } catch (userError) {
          console.error(`Error sending to user ${user.telegram_id}:`, userError);
        }
      }

      console.log('✅ Daily notifications completed');
    } catch (error) {
      console.error('Daily notifications error:', error);
    }
  }

  async sendJobsToUser(telegramId, jobs, userId) {
    try {
      if (jobs.length === 0) return;

      const message = `
🔔 Новые заказы за последние 24 часа:

${jobs.map((job, index) => `
${index + 1}. 📋 ${job.title}
💰 ${job.budget_min || 'Не указан'} - ${job.budget_max || 'Не указан'} ${job.currency}
🔗 [Перейти к заказу](${job.url})
📂 ${job.categories.name}
`).join('\n')}

Удачи в работе! 🚀
      `;

      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      // Mark jobs as sent
      for (const job of jobs) {
        await Job.markAsSent(userId, job.id);
      }

    } catch (error) {
      console.error('Send jobs error:', error);
    }
  }

  async parseJobs() {
    try {
      console.log('🔄 Parsing jobs...');
      
             // Import jobParser here to avoid circular dependencies
       const { default: jobParser } = await import('./jobParser.js');
       const totalJobs = await jobParser.parseAll();
      
      console.log(`✅ Job parsing completed: ${totalJobs} jobs added`);
    } catch (error) {
      console.error('Job parsing error:', error);
    }
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
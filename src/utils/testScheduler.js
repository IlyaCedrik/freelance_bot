import schedulerService from '../services/scheduler.js';
import { supabase } from '../config/supabase.js';

class SchedulerTester {
  constructor() {
    this.mockBot = {
      telegram: {
        sendMessage: async (chatId, message, options) => {
          console.log(`📤 [MOCK] Sending to ${chatId}:`);
          console.log(message);
          console.log('---');
          return { message_id: Math.random() };
        }
      }
    };
  }

  async testParseAndNotify() {
    try {
      console.log('🧪 Testing parse and notify cycle...');
      
      // Set up mock bot
      schedulerService.setBot(this.mockBot);
      
      // Test the parse and notify cycle with mock data
      const mockUserSubscriptions = [
        {
          user: { telegram_id: 123456789, username: 'testuser1', first_name: 'Test' },
          category_id: 'web',
          category_name: 'Веб-разработка',
          is_active: true
        }
      ];

      // Import and test parser directly
      const { default: jobParser } = await import('../services/jobParser.js');
      const totalJobs = await jobParser.parseAllWithNotifications(this.mockBot, mockUserSubscriptions);
      
      console.log(`✅ Parse and notify test completed: ${totalJobs} jobs processed`);
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async testNotificationQuery() {
    try {
      console.log('🧪 Testing notification query...');
      
      // Test the query for active subscribers
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          subscriptions!inner(
            *,
            categories(*)
          )
        `)
        .eq('is_active', true)
        .eq('subscriptions.is_active', true)
        .gte('subscriptions.expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ Query error:', error);
        return;
      }

      console.log(`📊 Found ${users.length} active subscribers`);
      
      for (const user of users) {
        console.log(`👤 User ${user.telegram_id}:`);
        console.log(`   - Subscriptions: ${user.subscriptions.length}`);
        user.subscriptions.forEach(sub => {
          console.log(`   - Category: ${sub.categories.name} (expires: ${sub.expires_at})`);
        });
      }
      
      console.log('✅ Notification query test completed');
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async testCategoriesQuery() {
    try {
      console.log('🧪 Testing categories query...');
      
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Query error:', error);
        return;
      }

      console.log(`📋 Found ${categories.length} active categories`);
      
      categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category.name} (Price: ${category.price} kopecks)`);
      });
      
      console.log('✅ Categories query test completed');
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting scheduler tests...\n');
    
    await this.testNotificationQuery();
    console.log('\n');
    
    await this.testCategoriesQuery();
    console.log('\n');
    
    await this.testParseAndNotify();
    
    console.log('\n🎉 All tests completed!');
  }
}

// Если файл запускается напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SchedulerTester();
  tester.runAllTests();
}

export default SchedulerTester; 
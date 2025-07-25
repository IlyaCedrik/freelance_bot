import 'dotenv/config';
import jobParser from './services/jobParser.js';
import User from './database/models/User.js';

// Mock bot для тестирования уведомлений
const mockBot = {
  telegram: {
    sendMessage: async (chatId, message, options) => {
      console.log(`📤 Sending notification to user ${chatId}:`);
      console.log('---');
      console.log(message);
      console.log('---\n');
      return { message_id: Math.random() };
    }
  }
};

async function runParserWithNotifications() {
  try {
    console.log('🚀 Starting manual parser run with notifications...\n');
    
    console.log('📊 Step 1: Getting active subscribers...');
    const activeUsers = await User.getActiveSubscribers();
    console.log(`👥 Found ${activeUsers.length} active subscribers`);

    if (activeUsers.length === 0) {
      console.log('ℹ️ No active subscribers found, running parser without notifications');
      await runParserOnly();
      return;
    }

    // Преобразуем подписки в формат для парсера
    const userSubscriptions = prepareUserSubscriptions(activeUsers);
    console.log(`📋 Prepared ${userSubscriptions.length} subscription mappings\n`);

    console.log('📊 Step 2: Running parser with notifications...');
    const totalJobs = await jobParser.parseAllWithNotifications(mockBot, userSubscriptions);
    console.log(`✅ Parsing completed: ${totalJobs} jobs found and sent\n`);
    
    console.log('🎉 Manual parser run with notifications completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during parser run:', error);
    process.exit(1);
  }
}

// Простой запуск только парсера без уведомлений
async function runParserOnly() {
  try {
    console.log('🔄 Running parser only (no notifications)...');
    const totalJobs = await jobParser.parseAll();
    console.log(`✅ Parser completed: ${totalJobs} new jobs found`);
  } catch (error) {
    console.error('❌ Parser error:', error);
    process.exit(1);
  }
}

// Тестирование только уведомлений с моковыми данными
async function testNotificationsOnly() {
  try {
    console.log('🧪 Testing notifications with mock data...\n');
    
    // Создаем моковые данные для тестирования
    const mockUserSubscriptions = [
      {
        user: { telegram_id: 123456789, username: 'testuser1', first_name: 'Test' },
        category_id: 'web',
        category_name: 'Веб-разработка',
        is_active: true
      },
      {
        user: { telegram_id: 987654321, username: 'testuser2', first_name: 'User' },
        category_id: 'design',
        category_name: 'Дизайн',
        is_active: true
      }
    ];

    // Импортируем TelegramParser напрямую для тестирования
    const { default: telegramParser } = await import('./services/telegramParser.js');
    
    // Тестируем форматирование сообщения
    const mockJobData = {
      title: 'Нужен веб-разработчик для создания сайта',
      budget_min: 50000,
      budget_max: 100000,
      currency: 'RUB',
      category_name: 'Веб-разработка',
      url: 'https://t.me/freelancechannel/123'
    };

    console.log('📝 Testing message formatting:');
    const formattedMessage = telegramParser.formatJobMessage(mockJobData);
    console.log(formattedMessage);
    console.log('\n---\n');

    // Тестируем отправку уведомлений
    telegramParser.setBotAndSubscriptions(mockBot, mockUserSubscriptions);
    const sentCount = await telegramParser.sendJobToSubscribers(mockJobData);
    
    console.log(`✅ Mock notifications sent to ${sentCount} users`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Преобразует подписки пользователей в формат для парсера
function prepareUserSubscriptions(activeUsers) {
  const subscriptions = [];
  
  for (const user of activeUsers) {
    for (const subscription of user.subscriptions) {
      // Маппинг категорий из базы данных на встроенные категории парсера
      const categoryMapping = {
        'Веб-разработка': 'web',
        'Мобильная разработка': 'mobile', 
        'Дизайн': 'design',
        'Копирайтинг': 'copywriting',
        'Маркетинг': 'marketing',
        'Переводы': 'translation'
      };

      const mappedCategoryId = categoryMapping[subscription.categories.name] || 'other';

      subscriptions.push({
        user: {
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.first_name
        },
        category_id: mappedCategoryId,
        category_name: subscription.categories.name,
        is_active: subscription.is_active && 
                  new Date(subscription.expires_at) > new Date()
      });
    }
  }
  
  return subscriptions;
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);
const command = args[0];

if (command === 'parse-only') {
  runParserOnly();
} else if (command === 'test-notifications') {
  testNotificationsOnly();
} else {
  // По умолчанию запускаем парсер с уведомлениями
  runParserWithNotifications();
} 
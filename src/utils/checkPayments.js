import 'dotenv/config';
import { supabase } from '../config/supabase.js';

async function checkPaymentSettings() {
  console.log('🔍 Проверка настроек платежей...\n');

  // 1. Проверяем токен платежей
  console.log('1. 🔐 Проверка токена платежей:');
  const paymentToken = process.env.TELEGRAM_PAYMENT_TOKEN;
  
  if (!paymentToken) {
    console.log('   ❌ TELEGRAM_PAYMENT_TOKEN не установлен в .env файле');
    console.log('   📝 Добавьте в .env: TELEGRAM_PAYMENT_TOKEN=ваш_токен');
    return false;
  }
  
  if (paymentToken === 'test_payment_token') {
    console.log('   ⚠️  Используется тестовое значение');
    console.log('   📝 Замените на реальный токен из @BotFather');
    return false;
  }
  
  console.log(`   ✅ Токен установлен: ${paymentToken.substring(0, 20)}...`);
  
  if (paymentToken.includes('TEST')) {
    console.log('   🧪 Это тестовый токен (подходит для разработки)');
  } else {
    console.log('   🚀 Это продакшен токен');
  }

  // 2. Проверяем категории и цены
  console.log('\n2. 💰 Проверка категорий и цен:');
  
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    if (!categories || categories.length === 0) {
      console.log('   ❌ Категории не найдены в базе данных');
      console.log('   📝 Запустите: npm run seed');
      return false;
    }

    console.log(`   ✅ Найдено категорий: ${categories.length}`);
    
    categories.forEach(cat => {
      const priceInRubles = (cat.price / 100).toFixed(2);
      console.log(`   💳 ${cat.name}: ${priceInRubles}₽ (${cat.price} копеек)`);
      
      if (cat.price <= 0) {
        console.log(`      ⚠️  Неверная цена для категории ${cat.name}`);
      }
    });

  } catch (error) {
    console.log('   ❌ Ошибка при получении категорий:', error.message);
    return false;
  }

  // 3. Проверяем базу данных платежей
  console.log('\n3. 🗄️  Проверка таблицы платежей:');
  
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('count')
      .limit(1);

    if (error) throw error;
    console.log('   ✅ Таблица payments доступна');

  } catch (error) {
    console.log('   ❌ Ошибка доступа к таблице payments:', error.message);
    return false;
  }

  // 4. Проверяем подписки
  console.log('\n4. 📋 Проверка таблицы подписок:');
  
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('count')
      .limit(1);

    if (error) throw error;
    console.log('   ✅ Таблица subscriptions доступна');

  } catch (error) {
    console.log('   ❌ Ошибка доступа к таблице subscriptions:', error.message);
    return false;
  }

  console.log('\n✅ Все проверки пройдены! Платежи должны работать.');
  
  console.log('\n📋 Инструкция для тестирования:');
  console.log('1. Запустите бота: npm run dev');
  console.log('2. В Telegram: /start → Категории → Выберите категорию → Оплатить');
  console.log('3. Используйте тестовую карту: 4242 4242 4242 4242');
  
  return true;
}

async function main() {
  try {
    const success = await checkPaymentSettings();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем проверку если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkPaymentSettings }; 
import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { supabase } from '../config/supabase.js';

async function testPaymentSetup() {
  console.log('🔍 Детальная диагностика платежей...\n');

  // 1. Проверяем BOT_TOKEN
  console.log('1. 🤖 Проверка токена бота:');
  const botToken = process.env.BOT_TOKEN;
  
  if (!botToken) {
    console.log('   ❌ BOT_TOKEN не установлен');
    return false;
  }
  console.log(`   ✅ BOT_TOKEN: ${botToken.substring(0, 20)}...`);

  // 2. Проверяем TELEGRAM_PAYMENT_TOKEN
  console.log('\n2. 💳 Проверка токена платежей:');
  const paymentToken = process.env.TELEGRAM_PAYMENT_TOKEN;
  
  if (!paymentToken) {
    console.log('   ❌ TELEGRAM_PAYMENT_TOKEN не установлен');
    return false;
  }
  
  if (paymentToken === 'test_payment_token') {
    console.log('   ❌ Используется дефолтное значение');
    return false;
  }
  
  console.log(`   ✅ Payment Token: ${paymentToken.substring(0, 30)}...`);
  
  // 3. Проверяем формат токена
  if (!paymentToken.includes(':')) {
    console.log('   ❌ Неверный формат токена (должен содержать ":")');
    return false;
  }
  
  const parts = paymentToken.split(':');
  console.log(`   📋 Части токена: ${parts.length} частей`);
  console.log(`   🧪 Тестовый: ${paymentToken.includes('TEST') ? 'Да' : 'Нет'}`);

  // 4. Проверяем подключение к Telegram API
  console.log('\n3. 📡 Проверка подключения к Telegram:');
  try {
    const bot = new Telegraf(botToken);
    const botInfo = await bot.telegram.getMe();
    console.log(`   ✅ Бот подключен: @${botInfo.username}`);
    console.log(`   📊 ID: ${botInfo.id}`);
  } catch (error) {
    console.log('   ❌ Ошибка подключения к Telegram:', error.message);
    return false;
  }

  // 5. Проверяем базу данных
  console.log('\n4. 🗄️ Проверка базы данных:');
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, price')
      .eq('is_active', true)
      .limit(1);

    if (error) throw error;
    
    if (!categories || categories.length === 0) {
      console.log('   ❌ Нет активных категорий');
      return false;
    }
    
    const category = categories[0];
    console.log(`   ✅ Категория найдена: ${category.name}`);
    console.log(`   💰 Цена: ${category.price} копеек (${(category.price/100).toFixed(2)}₽)`);
    
    // Проверяем корректность цены
    if (category.price <= 0) {
      console.log('   ❌ Неверная цена категории');
      return false;
    }
    
    if (category.price < 6000) { // Минимум 60 рублей для Telegram
      console.log('   ⚠️ Цена может быть слишком низкой для Telegram Payments (мин. 60₽)');
    }

  } catch (error) {
    console.log('   ❌ Ошибка базы данных:', error.message);
    return false;
  }

  // 6. Тестируем создание invoice data
  console.log('\n5. 📄 Тест данных инвойса:');
  try {
    const testInvoiceData = {
      title: 'Тест подписка',
      description: 'Тестовое описание подписки',
      payload: 'test_payment_123',
      provider_token: paymentToken,
      currency: 'RUB',
      prices: [{
        label: 'Тестовая подписка',
        amount: 50000 // 500 рублей
      }],
      need_email: false,
      need_phone_number: false,
      is_flexible: false
    };

    console.log('   📋 Данные инвойса:');
    console.log('   ', JSON.stringify(testInvoiceData, null, 4));
    
    // Проверяем обязательные поля
    const requiredFields = ['title', 'description', 'payload', 'provider_token', 'currency', 'prices'];
    const missingFields = requiredFields.filter(field => !testInvoiceData[field]);
    
    if (missingFields.length > 0) {
      console.log(`   ❌ Отсутствуют поля: ${missingFields.join(', ')}`);
      return false;
    }
    
    console.log('   ✅ Все обязательные поля присутствуют');

  } catch (error) {
    console.log('   ❌ Ошибка создания данных инвойса:', error.message);
    return false;
  }

  console.log('\n✅ Все базовые проверки пройдены!');
  console.log('\n📋 Следующие шаги:');
  console.log('1. Запустите бота: npm run dev');
  console.log('2. Попробуйте создать платеж в Telegram');
  console.log('3. Проверьте логи в консоли');
  
  return true;
}

// Функция для тестирования конкретного платежа
async function testSpecificPayment() {
  console.log('\n🧪 Создание тестового платежа...\n');
  
  try {
    const bot = new Telegraf(process.env.BOT_TOKEN);
    
    // Получаем первую категорию
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (error || !categories.length) {
      console.log('❌ Нет категорий для тестирования');
      return;
    }

    const category = categories[0];
    console.log(`📂 Тестируем категорию: ${category.name}`);
    console.log(`💰 Цена: ${(category.price/100).toFixed(2)}₽`);

    // Создаем тестовый платеж в БД
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_id: 'test_user_id',
        category_id: category.id,
        amount: category.price,
        currency: 'RUB',
        status: 'pending'
      }])
      .select()
      .single();

    if (paymentError) throw paymentError;

    console.log(`💾 Создан тестовый платеж: ${payment.id}`);

    // Тестируем создание инвойса через Telegram API
    const testChatId = '123456789'; // Фиктивный ID для теста
    
    const invoiceData = {
      chat_id: testChatId,
      title: `Подписка: ${category.name}`,
      description: `Доступ к объявлениям категории "${category.name}" на 30 дней`,
      payload: payment.id.toString(),
      provider_token: process.env.TELEGRAM_PAYMENT_TOKEN,
      currency: 'RUB',
      prices: JSON.stringify([{
        label: 'Подписка на месяц',
        amount: category.price
      }]),
      need_email: false,
      need_phone_number: false,
      is_flexible: false
    };

    console.log('\n📤 Данные для отправки в Telegram API:');
    console.log(JSON.stringify(invoiceData, null, 2));

    // Удаляем тестовый платеж
    await supabase
      .from('payments')
      .delete()
      .eq('id', payment.id);

    console.log('\n✅ Тестовый платеж удален');
    console.log('\n💡 Если ошибки возникают при реальном тестировании,');
    console.log('   проверьте указанные выше данные на корректность');

  } catch (error) {
    console.log('❌ Ошибка тестирования платежа:', error.message);
    if (error.response) {
      console.log('📡 Ответ API:', error.response.data);
    }
  }
}

async function main() {
  try {
    const basicCheck = await testPaymentSetup();
    
    if (basicCheck) {
      await testSpecificPayment();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем тест если файл вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { testPaymentSetup }; 
import Category from '../../database/models/Category.js';
import Subscription from '../../database/models/Subscription.js';
import User from '../../database/models/User.js';
import { supabase } from '../../config/supabase.js';
import messageManager from '../utils/messageManager.js';

const createInvoice = async (ctx) => {
  try {
    console.log('🎯 Creating invoice...');
    
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    console.log('User:', user?.id, 'Category:', category?.name, 'Price:', category?.price);

    if (!user || !category) {
      return messageManager.sendMessage(ctx, '❌ Данные не найдены');
    }

    const isSubscribed = await Subscription.isUserSubscribed(user.id, categoryId);
    
    if (isSubscribed) {
      return messageManager.sendMessage(ctx, '✅ Вы уже подписаны на эту категорию');
    }

    // Проверяем токен платежей
    if (!process.env.TELEGRAM_PAYMENT_TOKEN) {
      console.error('❌ TELEGRAM_PAYMENT_TOKEN not configured!');
      return messageManager.sendMessage(ctx, '❌ Платежи временно недоступны. Обратитесь в поддержку.');
    }

    console.log('🔐 Payment token:', process.env.TELEGRAM_PAYMENT_TOKEN.substring(0, 20) + '...');

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{
        user_id: user.id,
        category_id: categoryId,
        amount: category.price,
        currency: 'RUB',
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('💾 Payment record created:', payment.id);

    // Убеждаемся, что цена больше 0 и в правильном формате
    const priceAmount = Math.max(1, parseInt(category.price));
    
    console.log('💰 Invoice details:', {
      categoryName: category.name,
      priceAmount: priceAmount,
      paymentId: payment.id,
      currency: 'RUB'
    });

    // Create Telegram invoice
    const invoiceData = {
      title: `Подписка: ${category.name}`,
      description: `Доступ к объявлениям категории "${category.name}" на 30 дней`,
      payload: payment.id.toString(),
      provider_token: process.env.TELEGRAM_PAYMENT_TOKEN,
      currency: 'RUB',
      prices: [{
        label: 'Подписка на месяц',
        amount: priceAmount
      }],
      need_email: false,
      need_phone_number: false,
      is_flexible: false
    };

    console.log('📄 Sending invoice with data:', JSON.stringify(invoiceData, null, 2));

    const invoiceResult = await ctx.replyWithInvoice(invoiceData);
    
    console.log('✅ Invoice sent successfully:', invoiceResult.message_id);

    // Callback query обрабатывается централизованно

  } catch (error) {
    console.error('❌ Create invoice error:', error);
    
    // Более детальная обработка ошибок
    let errorMessage = '❌ Ошибка при создании счета';
    
    if (error.description) {
      console.error('Telegram API Error:', error.description);
      
      if (error.description.includes('PAYMENT_PROVIDER_INVALID')) {
        errorMessage = '❌ Платежный провайдер не настроен. Обратитесь в поддержку.';
      } else if (error.description.includes('CURRENCY_TOTAL_AMOUNT_INVALID')) {
        errorMessage = '❌ Неверная сумма платежа. Обратитесь в поддержку.';
      } else if (error.description.includes('PROVIDER_DATA_INVALID')) {
        errorMessage = '❌ Неверные данные провайдера. Обратитесь в поддержку.';
      }
    }
    
    await messageManager.sendMessage(ctx, errorMessage);
  }
};

const preCheckout = async (ctx) => {
  try {
    console.log('💳 Pre-checkout query received:', {
      from: ctx.from.id,
      payload: ctx.preCheckoutQuery.invoice_payload,
      currency: ctx.preCheckoutQuery.currency,
      total_amount: ctx.preCheckoutQuery.total_amount
    });

    // Verify payment exists in database
    const paymentId = ctx.preCheckoutQuery.invoice_payload;
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('status', 'pending')
      .single();

    if (error || !payment) {
      console.error('❌ Payment verification failed:', error || 'Payment not found');
      await ctx.answerPreCheckoutQuery(false, 'Платеж не найден или уже обработан');
      return;
    }

    console.log('✅ Payment verified, approving checkout');
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    console.error('❌ Pre-checkout error:', error);
    await ctx.answerPreCheckoutQuery(false, 'Ошибка при обработке платежа');
  }
};

const successfulPayment = async (ctx) => {
  try {
    console.log('🎉 Successful payment received!');
    
    const payment = ctx.message.successful_payment;
    const paymentId = payment.invoice_payload;

    console.log('💰 Payment details:', {
      paymentId: paymentId,
      totalAmount: payment.total_amount,
      currency: payment.currency,
      telegramChargeId: payment.telegram_payment_charge_id,
      providerChargeId: payment.provider_payment_charge_id
    });

    // Update payment status
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        provider_payment_id: payment.telegram_payment_charge_id,
        completed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (paymentError) throw paymentError;

    console.log('📝 Payment status updated to completed');

    // Get payment details
    const { data: paymentData, error } = await supabase
      .from('payments')
      .select(`
        *,
        categories(name)
      `)
      .eq('id', paymentId)
      .single();

    if (error) throw error;

    console.log('📊 Payment data retrieved:', {
      userId: paymentData.user_id,
      categoryId: paymentData.category_id,
      categoryName: paymentData.categories.name,
      amount: paymentData.amount
    });

    // Create subscription
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const subscription = await Subscription.create(
      paymentData.user_id,
      paymentData.category_id,
      expiresAt.toISOString()
    );

    console.log('✅ Subscription created:', subscription.id, 'expires:', expiresAt);

    const successMessage = `
✅ Платеж успешно обработан!

📂 Категория: ${paymentData.categories.name}
💰 Сумма: ${(payment.total_amount / 100).toFixed(0)}₽
📅 Подписка до: ${expiresAt.toLocaleDateString('ru-RU')}

Теперь вы будете получать уведомления о новых заказах!
    `;

    await messageManager.sendMessage(ctx, successMessage);

    console.log('🎊 Payment processing completed successfully');

  } catch (error) {
    console.error('❌ Successful payment error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при активации подписки. Обратитесь в поддержку.');
  }
};

export default {
  createInvoice,
  preCheckout,
  successfulPayment
}; 
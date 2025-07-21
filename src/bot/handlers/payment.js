import Category from '../../database/models/Category.js';
import Subscription from '../../database/models/Subscription.js';
import User from '../../database/models/User.js';
import { supabase } from '../../config/supabase.js';

const createInvoice = async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    if (!user || !category) {
      return ctx.reply('❌ Данные не найдены');
    }

    const isSubscribed = await Subscription.isUserSubscribed(user.id, categoryId);
    
    if (isSubscribed) {
      return ctx.reply('✅ Вы уже подписаны на эту категорию');
    }

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

    // Create Telegram invoice
    await ctx.replyWithInvoice({
      title: `Подписка: ${category.name}`,
      description: `Доступ к объявлениям категории "${category.name}" на 30 дней`,
      payload: payment.id,
      provider_token: process.env.TELEGRAM_PAYMENT_TOKEN,
      currency: 'RUB',
      prices: [{
        label: 'Подписка на месяц',
        amount: category.price
      }],
      need_email: false,
      need_phone_number: false,
      is_flexible: false
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    await ctx.reply('❌ Ошибка при создании счета');
  }
};

const preCheckout = async (ctx) => {
  try {
    // Verify payment
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    console.error('Pre-checkout error:', error);
    await ctx.answerPreCheckoutQuery(false, 'Ошибка при обработке платежа');
  }
};

const successfulPayment = async (ctx) => {
  try {
    const payment = ctx.message.successful_payment;
    const paymentId = payment.invoice_payload;

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

    // Create subscription
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await Subscription.create(
      paymentData.user_id,
      paymentData.category_id,
      expiresAt.toISOString()
    );

    const successMessage = `
✅ Платеж успешно обработан!

📂 Категория: ${paymentData.categories.name}
💰 Сумма: ${(payment.total_amount / 100).toFixed(0)}₽
📅 Подписка до: ${expiresAt.toLocaleDateString('ru-RU')}

Теперь вы будете получать уведомления о новых заказах!
    `;

    await ctx.reply(successMessage);

  } catch (error) {
    console.error('Successful payment error:', error);
    await ctx.reply('❌ Ошибка при активации подписки. Обратитесь в поддержку.');
  }
};

export default {
  createInvoice,
  preCheckout,
  successfulPayment
}; 
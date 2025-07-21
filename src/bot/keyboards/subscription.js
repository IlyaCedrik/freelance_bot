import { Markup } from 'telegraf';

export const subscriptionKeyboard = (categoryId) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💳 Оплатить', `pay_${categoryId}`)],
    [Markup.button.callback('🔙 Назад', 'categories')]
  ]);
}; 
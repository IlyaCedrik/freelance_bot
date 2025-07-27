import { Markup } from 'telegraf';

export const trialChoiceKeyboard = (categoryId) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎁 Активировать пробный день', `trial_${categoryId}`)],
    [Markup.button.callback('💳 Оплатить сразу', `pay_${categoryId}`)],
    [Markup.button.callback('🔙 Назад', 'categories')]
  ]);
}; 
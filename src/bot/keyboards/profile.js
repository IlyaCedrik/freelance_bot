import { Markup } from 'telegraf';

export const profileKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('💵 Реферальная система', 'referral_program')],
  [Markup.button.callback('📊 Моя статистика', 'user_stats')],
  [Markup.button.callback('⬅️ Главное меню', 'back_to_main')]
]);

export const userStatsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📈 Подробная статистика', 'detailed_stats')],
  [Markup.button.callback('⬅️ Назад в профиль', 'profile')]
]); 
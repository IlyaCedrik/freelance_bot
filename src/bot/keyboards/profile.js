import { Markup } from 'telegraf';

export const profileKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('⚙️ Настройки', 'settings')],
  [Markup.button.callback('📋 Политика конфиденциальности', 'show_privacy')],
  [Markup.button.callback('📊 Моя статистика', 'user_stats')],
  [Markup.button.callback('⬅️ Главное меню', 'back_to_main')]
]);

export const userStatsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('⬅️ Назад в профиль', 'profile')]
]); 
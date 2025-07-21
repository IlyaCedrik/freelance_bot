import { Markup } from 'telegraf';

export const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📂 Категории', 'categories')],
  [Markup.button.callback('📋 Мои подписки', 'my_subscriptions')],
  [Markup.button.callback('⚙️ Настройки', 'settings')]
]); 
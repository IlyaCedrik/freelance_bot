import { Markup } from 'telegraf';
import User from '../../database/models/User.js';

export const createMainKeyboard = async (telegramId) => {
  const buttons = [
    [Markup.button.callback('📂 Категории', 'categories')],
    [Markup.button.callback('📋 Мои подписки', 'my_subscriptions')],
    [Markup.button.callback('👤 Личный кабинет', 'profile')],
    [Markup.button.callback('⚙️ Настройки', 'settings')]
  ];

  // Добавляем кнопку админ-панели для администраторов
  try {
    const isAdmin = await User.isAdmin(telegramId);
    if (isAdmin) {
      buttons.push([
        Markup.button.callback('🔧 Админ-панель', 'admin_main')
      ]);
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
  }

  return Markup.inlineKeyboard(buttons);
};

// Оставляем статическую версию для обратной совместимости
export const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📂 Категории', 'categories')],
  [Markup.button.callback('📋 Мои подписки', 'my_subscriptions')],
  [Markup.button.callback('👤 Личный кабинет', 'profile')],
  [Markup.button.callback('⚙️ Настройки', 'settings')]
]); 
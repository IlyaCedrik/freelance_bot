import { Markup } from 'telegraf';
import User from '../../database/models/User.js';

export const createMainKeyboard = async (telegramId) => {
  const buttons = [
    [Markup.button.callback('📂 Категории', 'categories')],
    [Markup.button.callback('💰 Реферальная программа', 'referral_program')],
    [Markup.button.callback('👤 Личный кабинет', 'profile')],
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
import User from '../../database/models/User.js';
import { mainKeyboard } from '../keyboards/main.js';
import messageManager from '../utils/messageManager.js';

const startHandler = async (ctx) => {
  try {
    const telegramUser = ctx.from;
    
    // Find or create user
    let user = await User.findByTelegramId(telegramUser.id);
    
    if (!user) {
      user = await User.create({
        telegramId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        languageCode: telegramUser.language_code
      });
    }

    await User.updateActivity(telegramUser.id);

    const welcomeMessage = `
🎯 Добро пожаловать в бот для поиска фриланс заказов!

📋 Что я умею:
• Присылаю свежие заказы по выбранным категориям
• Отправляю уведомления раз в день
• Фильтрую только качественные объявления

💰 Стоимость подписки: от 200₽ в месяц за категорию

Выберите действие:
    `;

    // Проверяем, является ли это callback query (нажатие кнопки)
    if (ctx.callbackQuery) {
      // Если это callback, используем editMessage
      await messageManager.editMessage(ctx, welcomeMessage, mainKeyboard);
    } else {
      // Если это команда /start, используем sendMessage
      await messageManager.sendMessage(ctx, welcomeMessage, mainKeyboard);
    }
  } catch (error) {
    console.error('Start handler error:', error);
    await messageManager.sendMessage(ctx, '❌ Произошла ошибка. Попробуйте позже.');
  }
};

const helpHandler = async (ctx) => {
  const helpMessage = `
🤖 Помощь по боту

📋 Команды:
/start - Главное меню
/categories - Просмотр всех категорий
/subscriptions - Мои подписки (отмена)
/settings - Настройки аккаунта
/help - Эта справка

💡 Как пользоваться:
1. Выберите интересующие категории (/categories)
2. Оплатите подписку (от 200₽ в месяц)
3. Получайте уведомления каждый день

🔄 Управление подписками:
• Просмотр: /subscriptions
• Отмена: выберите подписку для отмены
• Возврат средств не предусмотрен

📞 Поддержка: @your_support_username
  `;

  await messageManager.sendMessage(ctx, helpMessage);
};

export default {
  startHandler,
  help: helpHandler
}; 
import User from '../../database/models/User.js';
import { mainKeyboard } from '../keyboards/main.js';

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

    await ctx.reply(welcomeMessage, mainKeyboard);
  } catch (error) {
    console.error('Start handler error:', error);
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
};

const helpHandler = async (ctx) => {
  const helpMessage = `
🤖 Помощь по боту

📋 Команды:
/start - Главное меню
/categories - Просмотр категорий
/settings - Настройки
/help - Эта справка

💡 Как пользоваться:
1. Выберите интересующие категории
2. Оплатите подписку
3. Получайте уведомления каждый день

📞 Поддержка: @your_support_username
  `;

  await ctx.reply(helpMessage);
};

export default {
  startHandler,
  help: helpHandler
}; 
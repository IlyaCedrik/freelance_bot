import User from '../../database/models/User.js';
import Referral from '../../database/models/Referral.js';
import { mainKeyboard, createMainKeyboard } from '../keyboards/main.js';
import messageManager from '../utils/messageManager.js';

const startHandler = async (ctx) => {
  try {
    const telegramUser = ctx.from;
    const startPayload = ctx.startPayload || (ctx.message?.text?.split(' ')[1]); // Реферальный код
    
    // Find or create user
    let user = await User.findByTelegramId(telegramUser.id);
    let isNewUser = false;
    
    if (!user) {
      isNewUser = true;
      user = await User.create({
        telegramId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        languageCode: telegramUser.language_code
      });

      // Генерируем реферальный код для нового пользователя
      await Referral.generateReferralCode(user.id);
      
      // Обработка реферального кода
      if (startPayload) {
        try {
          const referralResult = await Referral.applyReferralCode(startPayload, user.id);
          if (referralResult) {
            let bonusMessage = '';
            if (referralResult.type === 'promo') {
              bonusMessage = `\n🎁 Промокод активирован! ${referralResult.bonusDays > 0 ? `Вы получили ${referralResult.bonusDays} дополнительных дней!` : ''}`;
            } else if (referralResult.type === 'referral') {
              bonusMessage = '\n🤝 Вы зарегистрированы по реферальной ссылке!';
            }
            
            if (bonusMessage) {
              await messageManager.sendMessage(ctx, `Добро пожаловать!${bonusMessage}`);
            }
          }
        } catch (error) {
          console.error('Error applying referral code:', error);
        }
      }
    } else {
      // Для существующих пользователей проверяем наличие данных реферальной системы
      await User.ensureReferralDataExists(telegramUser.id);
    }

    await User.updateActivity(telegramUser.id);

    const welcomeMessage = isNewUser ? `
🎯 Добро пожаловать в бот для поиска фриланс заказов!

📋 Что я умею:
• Присылаю свежие заказы по выбранным категориям
• Отправляю уведомления раз в день
• Фильтрую только качественные объявления

💰 Стоимость подписки: от 200₽ в месяц за категорию

🤝 Реферальная программа:
• Приглашайте друзей и получайте 10-50% с их платежей
• Ваша ссылка доступна в личном кабинете

Выберите действие:
    ` : `
🎯 С возвращением!

Выберите действие:
    `;

    // Создаем динамическую клавиатуру с кнопкой админа для админов
    const keyboard = await createMainKeyboard(telegramUser.id);

    // Проверяем, является ли это callback query (нажатие кнопки)
    if (ctx.callbackQuery) {
      // Если это callback, используем editMessage
      await messageManager.editMessage(ctx, welcomeMessage, keyboard);
    } else {
      // Если это команда /start, используем sendMessage
      await messageManager.sendMessage(ctx, welcomeMessage, keyboard);
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

🤝 Реферальная программа:
• Приглашайте друзей по своей ссылке
• Получайте 10-50% с их платежей
• Повышайте процент, привлекая больше активных пользователей

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
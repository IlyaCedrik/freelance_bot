/**
 * @fileoverview Обработчик команды /start и главного меню бота
 * @author FreelanceBot Team
 * @version 1.0.0
 */

import User from '../../database/models/User.js';
import Referral from '../../database/models/Referral.js';
import { createMainKeyboard } from '../keyboards/main.js';
import messageManager from '../utils/messageManager.js';

/**
 * Обработчик команды /start - главная точка входа в бота
 * 
 * @param {import('telegraf').Context} ctx - Контекст Telegraf
 * @param {Object} ctx.from - Информация о пользователе Telegram
 * @param {number} ctx.from.id - Telegram ID пользователя  
 * @param {string} [ctx.from.username] - Username пользователя
 * @param {string} [ctx.from.first_name] - Имя пользователя
 * @param {string} [ctx.from.last_name] - Фамилия пользователя
 * @param {string} [ctx.from.language_code] - Код языка пользователя
 * @param {string} [ctx.startPayload] - Payload команды /start (реферальный/промо код)
 * @param {Object} [ctx.message] - Объект сообщения
 * @param {string} [ctx.message.text] - Текст сообщения
 * 
 * @returns {Promise<void>}
 * 
 * @description
 * Функция выполняет следующие действия:
 * 1. Находит или создает пользователя в базе данных
 * 2. Обрабатывает реферальные и промо коды из payload
 * 3. Генерирует реферальный код для новых пользователей
 * 4. Отображает главное меню с актуальными кнопками
 * 
 * @example
 * // Обычный запуск бота
 * /start
 * 
 * // Запуск с реферальным кодом
 * /start REF123456
 * 
 * // Запуск с промокодом
 * /start SAVE20
 * 
 * @throws {Error} При ошибках работы с базой данных или API Telegram
 */
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

    const welcomeMessage = `
🎯 Добро пожаловать в бот для поиска фриланс заказов!

📋 Что я умею:
• Присылаю свежие заказы по выбранным категориям
• Отправляю уведомления раз в день
• Фильтрую только качественные объявления

💰 Стоимость подписки: от 200₽ в месяц за категорию

🤝 Реферальная программа:
• Приглашайте друзей и получайте 10-50% с их платежей
• Ваша ссылка доступна в личном кабинете

Выберите действие:`;

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

export default {
  startHandler
}; 
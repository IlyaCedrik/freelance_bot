/**
 * Конфигурация команд и настроек бота
 */
import { SUCCESS_MESSAGES, ERROR_MESSAGES, LOG_CONFIG } from '../../config/constants.js';

export const BOT_COMMANDS = [
  { command: 'start', description: '🏠 Главное меню' },
  { command: 'categories', description: '📋 Категории' },
  { command: 'referral_program', description: '💰 Реферальная программа' },
  { command: 'profile', description: '👤 Личный кабинет' },
];

export const CHAT_MENU_CONFIG = {
  type: 'commands'
};

/**
 * Настройка команд бота
 * @param {Telegraf} bot - Экземпляр бота
 */
export async function setupBotCommands(bot) {
  try {
    await bot.telegram.setMyCommands(BOT_COMMANDS);
    await bot.telegram.setChatMenuButton(CHAT_MENU_CONFIG);
    
    console.log(SUCCESS_MESSAGES.COMMANDS_CONFIGURED);
  } catch (error) {
    console.error(LOG_CONFIG.ERROR.SETUP_COMMANDS_ERROR, error);
    throw error;
  }
}

/**
 * Настройка обработчика ошибок
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} messageManager - Менеджер сообщений
 */
export function setupErrorHandler(bot, messageManager) {
  bot.catch((err, ctx) => {
    console.error(LOG_CONFIG.ERROR.BOT_ERROR, err);
    
    if (ctx.from) {
      console.error('Error for user:', {
        id: ctx.from.id,
        username: ctx.from.username,
        first_name: ctx.from.first_name
      });
    }
    
    messageManager.sendMessage(
      ctx, 
      ERROR_MESSAGES.GENERAL_ERROR
    ).catch(() => {});
  });
} 
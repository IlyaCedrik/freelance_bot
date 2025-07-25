import messageManager from './messageManager.js';

/**
 * Централизованная навигация для бота
 * Все переходы между экранами проходят через этот модуль
 */

class Navigation {
  constructor() {
    // Карта навигации: action -> handler
    this.routes = new Map();
  }

  /**
   * Регистрирует обработчик для навигационного action'а
   * @param {string} action - название action'а
   * @param {Function} handler - функция-обработчик
   */
  register(action, handler) {
    this.routes.set(action, handler);
  }

  /**
   * Обрабатывает навигационный переход
   * @param {string} action - название action'а
   * @param {Object} ctx - контекст Telegram
   */
  async handle(action, ctx) {
    try {
      console.log(`🧭 Navigation: ${action} for user ${ctx.from.id}`);

      const handler = this.routes.get(action);
      
      if (!handler) {
        console.error(`❌ No handler found for action: ${action}`);
        await messageManager.sendMessage(ctx, '❌ Неизвестное действие');
        return;
      }

      // Вызываем обработчик
      await handler(ctx);

      // Всегда отвечаем на callback query если он есть
      if (ctx.callbackQuery && !ctx.callbackQuery.answered) {
        await ctx.answerCbQuery();
      }

    } catch (error) {
      console.error(`❌ Navigation error for action '${action}':`, error);
      
      try {
        await messageManager.sendMessage(ctx, '❌ Ошибка навигации. Попробуйте позже.');
        if (ctx.callbackQuery && !ctx.callbackQuery.answered) {
          await ctx.answerCbQuery();
        }
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }

  /**
   * Создает middleware для обработки navigation action'ов
   * @param {string} action - название action'а
   * @returns {Function} middleware функция
   */
  middleware(action) {
    return async (ctx) => {
      await this.handle(action, ctx);
    };
  }

  /**
   * Получает список всех зарегистрированных routes
   * @returns {Array} массив action'ов
   */
  getRoutes() {
    return Array.from(this.routes.keys());
  }
}

// Создаем единственный экземпляр навигации
const navigation = new Navigation();

export default navigation; 
import Subscription from '../../database/models/Subscription.js';
import User from '../../database/models/User.js';
import messageManager from '../utils/messageManager.js';

const subscriptionMiddleware = (requiredCategoryId = null) => {
  return async (ctx, next) => {
    try {
      const user = await User.findByTelegramId(ctx.from.id);
      
      if (!user) {
        return messageManager.sendMessage(ctx, '❌ Пользователь не найден. Используйте /start');
      }

      if (requiredCategoryId) {
        const isSubscribed = await Subscription.isUserSubscribed(user.id, requiredCategoryId);
        
        if (!isSubscribed) {
          return messageManager.sendMessage(ctx, '⚠️ У вас нет активной подписки на эту категорию');
        }
      }

      ctx.user = user;
      return next();
    } catch (error) {
      console.error('Subscription middleware error:', error);
      return messageManager.sendMessage(ctx, '❌ Ошибка при проверке подписки');
    }
  };
};

export default subscriptionMiddleware; 
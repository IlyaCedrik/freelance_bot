import User from '../../database/models/User.js';
import Subscription from '../../database/models/Subscription.js';
import messageManager from '../utils/messageManager.js';
import { profileKeyboard, userStatsKeyboard } from '../keyboards/profile.js';

const showProfile = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    if (!user) {
      return messageManager.sendMessage(ctx, '❌ Пользователь не найден');
    }

    const subscriptions = await Subscription.getUserSubscriptions(user.id);
    const activeSubscriptions = subscriptions.filter(sub => 
      new Date(sub.expires_at) > new Date()
    );

    const registrationDate = new Date(user.created_at).toLocaleDateString('ru-RU');
    const lastActivity = new Date(user.last_activity).toLocaleDateString('ru-RU');

    const message = `
👤 Личный кабинет

👋 ${user.first_name || 'Пользователь'}
🆔 ID: ${user.telegram_id}
📅 Регистрация: ${registrationDate}
⏰ Последняя активность: ${lastActivity}

📊 Ваши подписки: ${activeSubscriptions.length}
💰 Реферальный баланс: ${(user.referral_balance / 100).toFixed(0)}₽

Выберите действие:
    `;

    if (ctx.callbackQuery) {
      await messageManager.editMessage(ctx, message, profileKeyboard);
    } else {
      await messageManager.sendMessage(ctx, message, profileKeyboard);
    }
  } catch (error) {
    console.error('Profile error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке профиля');
  }
};

const showUserStats = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    const subscriptions = await Subscription.getUserSubscriptions(user.id);
    
    // Статистика подписок
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(sub => 
      new Date(sub.expires_at) > new Date()
    ).length;
    const expiredSubscriptions = totalSubscriptions - activeSubscriptions;

    // Группируем по категориям
    const categoriesStats = subscriptions.reduce((acc, sub) => {
      const categoryName = sub.categories.name;
      if (!acc[categoryName]) {
        acc[categoryName] = { total: 0, active: 0 };
      }
      acc[categoryName].total++;
      if (new Date(sub.expires_at) > new Date()) {
        acc[categoryName].active++;
      }
      return acc;
    }, {});

    let categoriesText = '';
    if (Object.keys(categoriesStats).length > 0) {
      categoriesText = Object.entries(categoriesStats)
        .map(([name, stats]) => `• ${name}: ${stats.active}/${stats.total}`)
        .join('\n');
    } else {
      categoriesText = 'Нет подписок';
    }

    const message = `
📊 Моя статистика

📈 Подписки:
• Всего: ${totalSubscriptions}
• Активных: ${activeSubscriptions}
• Истекших: ${expiredSubscriptions}

📂 По категориям:
${categoriesText}

💰 Реферальная программа:
• Баланс: ${(user.referral_balance / 100).toFixed(0)}₽
• Активных рефералов: ${user.active_referrals_count || 0}

📅 Аккаунт создан: ${new Date(user.created_at).toLocaleDateString('ru-RU')}
    `;

    await messageManager.editMessage(ctx, message, userStatsKeyboard);
  } catch (error) {
    console.error('User stats error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке статистики');
  }
};

export default {
  showProfile,
  showUserStats
}; 
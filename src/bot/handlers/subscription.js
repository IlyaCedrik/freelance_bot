import Category from '../../database/models/Category.js';
import Subscription from '../../database/models/Subscription.js';
import User from '../../database/models/User.js';
import { categoriesKeyboard } from '../keyboards/categories.js';
import { subscriptionKeyboard } from '../keyboards/subscription.js';

const showCategories = async (ctx) => {
  try {
    const categories = await Category.getAll();
    const user = await User.findByTelegramId(ctx.from.id);
    
    if (!user) {
      return ctx.reply('❌ Пользователь не найден. Используйте /start');
    }

    const userSubscriptions = await Subscription.getUserSubscriptions(user.id);
    const subscribedCategoryIds = userSubscriptions.map(sub => sub.category_id);

    const message = `
📂 Доступные категории:

${categories.map(cat => {
  const isSubscribed = subscribedCategoryIds.includes(cat.id);
  const status = isSubscribed ? '✅' : '⭕';
  const price = (cat.price / 100).toFixed(0);
  return `${status} ${cat.name} - ${price}₽/мес`;
}).join('\n')}

💡 Выберите категорию для подписки или отписки:
    `;

    await ctx.reply(message, categoriesKeyboard(categories, subscribedCategoryIds));
  } catch (error) {
    console.error('Show categories error:', error);
    await ctx.reply('❌ Ошибка при загрузке категорий');
  }
};

const subscribe = async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    if (!user || !category) {
      return ctx.reply('❌ Данные не найдены');
    }

    const isSubscribed = await Subscription.isUserSubscribed(user.id, categoryId);

    if (isSubscribed) {
      return ctx.reply('✅ Вы уже подписаны на эту категорию');
    }

    const price = (category.price / 100).toFixed(0);
    const message = `
📂 Подписка на: ${category.name}
💰 Стоимость: ${price}₽ в месяц

${category.description || ''}

Нажмите "Оплатить" для продолжения:
    `;

    await ctx.reply(message, subscriptionKeyboard(categoryId));
  } catch (error) {
    console.error('Subscribe error:', error);
    await ctx.reply('❌ Ошибка при оформлении подписки');
  }
};

const unsubscribe = async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    if (!user || !category) {
      return ctx.reply('❌ Данные не найдены');
    }

    await Subscription.deactivate(user.id, categoryId);
    
    await ctx.reply(`✅ Подписка на "${category.name}" отменена`);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    await ctx.reply('❌ Ошибка при отмене подписки');
  }
};

const mySubscriptions = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    
    if (!user) {
      return ctx.reply('❌ Пользователь не найден');
    }

    const subscriptions = await Subscription.getUserSubscriptions(user.id);

    if (subscriptions.length === 0) {
      return ctx.reply('📭 У вас нет активных подписок');
    }

    const message = `
📋 Ваши активные подписки:

${subscriptions.map(sub => {
  const expiresAt = new Date(sub.expires_at);
  const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
  return `• ${sub.categories.name} (осталось ${daysLeft} дней)`;
}).join('\n')}
    `;

    await ctx.reply(message);
  } catch (error) {
    console.error('My subscriptions error:', error);
    await ctx.reply('❌ Ошибка при загрузке подписок');
  }
};

export default {
  showCategories,
  subscribe,
  unsubscribe,
  mySubscriptions
}; 
import Category from '../../database/models/Category.js';
import Subscription from '../../database/models/Subscription.js';
import User from '../../database/models/User.js';
import { categoriesKeyboard } from '../keyboards/categories.js';
import { subscriptionKeyboard } from '../keyboards/subscription.js';
import { trialChoiceKeyboard } from '../keyboards/trial.js';
import messageManager from '../utils/messageManager.js';
import { supabase } from '../../config/supabase.js';

const showCategories = async (ctx) => {
  try {
    const categories = await Category.getAll();
    const user = await User.findByTelegramId(ctx.from.id);
    
    if (!user) {
      return messageManager.sendMessage(ctx, '❌ Пользователь не найден. Используйте /start');
    }

    const userSubscriptions = await Subscription.getUserSubscriptions(user.id);
    const subscribedCategoryIds = userSubscriptions.map(sub => sub.category_id);

    const message = `
📂 Доступные категории:

${categories.map(cat => {
  const isSubscribed = subscribedCategoryIds.includes(cat.id);
  const status = isSubscribed ? '⭕' : '✅';
  const price = (cat.price / 100).toFixed(0);
  return `${status} ${cat.name} - ${price}₽/мес`;
}).join('\n')}

💡 Выберите категорию для подписки или отписки:
    `;

    // Проверяем, является ли это callback query (нажатие кнопки)
    if (ctx.callbackQuery) {
      // Если это callback, используем editMessage
      await messageManager.editMessage(ctx, message, categoriesKeyboard(categories, subscribedCategoryIds));
    } else {
      // Если это команда, используем sendMessage
      await messageManager.sendMessage(ctx, message, categoriesKeyboard(categories, subscribedCategoryIds));
    }
  } catch (error) {
    console.error('Show categories error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке категорий');
  }
};

const subscribe = async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    if (!user || !category) {
      return messageManager.sendMessage(ctx, '❌ Данные не найдены');
    }

    const isSubscribed = await Subscription.isUserSubscribed(user.id, categoryId);

    if (isSubscribed) {
      return messageManager.sendMessage(ctx, '✅ Вы уже подписаны на эту категорию');
    }

    // Проверяем, использовал ли пользователь пробный период для этой категории
    const hasUsedTrial = await Subscription.hasUserUsedTrial(user.id, categoryId);
    const price = (category.price / 100).toFixed(0);

    if (!hasUsedTrial) {
      // Новый пользователь - показываем опции trial
      const message = `
📂 Подписка на: ${category.name}
💰 Стоимость: ${price}₽ в месяц

${category.description || ''}

🎁 Как новый пользователь, вы можете активировать БЕСПЛАТНЫЙ пробный день!

Выберите действие:
      `;

      await messageManager.sendMessage(ctx, message, trialChoiceKeyboard(categoryId));
    } else {
      // Пользователь уже использовал trial - показываем только платную подписку
      const message = `
📂 Подписка на: ${category.name}
💰 Стоимость: ${price}₽ в месяц

${category.description || ''}

Нажмите "Оплатить" для продолжения:
      `;

      await messageManager.sendMessage(ctx, message, subscriptionKeyboard(categoryId));
    }
  } catch (error) {
    console.error('Subscribe error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при оформлении подписки');
  }
};

const unsubscribe = async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    if (!user || !category) {
      return messageManager.sendMessage(ctx, '❌ Данные не найдены');
    }

    await Subscription.deactivate(user.id, categoryId);
    
    await messageManager.sendMessage(ctx, `✅ Подписка на "${category.name}" отменена`);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при отмене подписки');
  }
};

// Новая функция для подтверждения отмены подписки
const confirmCancelSubscription = async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    if (!user || !category) {
      return messageManager.sendMessage(ctx, '❌ Данные не найдены');
    }

    // Проверяем есть ли активная подписка
    const isSubscribed = await Subscription.isUserSubscribed(user.id, categoryId);
    if (!isSubscribed) {
      return messageManager.sendMessage(ctx, '❌ У вас нет активной подписки на эту категорию');
    }

    // Получаем детали подписки
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    const expiresAt = new Date(subscription.expires_at);
    const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));

    const confirmMessage = `
⚠️ **Подтверждение отмены подписки**

📂 Категория: ${category.name}
📅 Действует до: ${expiresAt.toLocaleDateString('ru-RU')}
⏰ Осталось дней: ${daysLeft}

❗ **Важно:**
• После отмены вы перестанете получать уведомления
• Возврат средств не предусмотрен
• Подписка останется активной до ${expiresAt.toLocaleDateString('ru-RU')}

Вы уверены, что хотите отменить подписку?
    `;

    const { Markup } = await import('telegraf');
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Да, отменить', `confirm_cancel_${categoryId}`)],
      [Markup.button.callback('❌ Нет, оставить', 'my_subscriptions')]
    ]);

    await messageManager.editMessage(ctx, confirmMessage, keyboard);

  } catch (error) {
    console.error('Confirm cancel subscription error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке данных подписки');
  }
};

// Функция для окончательной отмены подписки
const cancelSubscriptionFinal = async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    if (!user || !category) {
      return messageManager.sendMessage(ctx, '❌ Данные не найдены');
    }

    // Получаем дату истечения до отмены
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .single();

    if (subError) throw subError;

    // Отменяем подписку
    await Subscription.deactivate(user.id, categoryId);

    const expiresAt = new Date(subscription.expires_at);
    const successMessage = `
✅ **Подписка успешно отменена**

📂 Категория: ${category.name}
📅 Была активна до: ${expiresAt.toLocaleDateString('ru-RU')}

💡 **Что дальше:**
• Уведомления остановлены
• Вы можете оформить новую подписку в любое время
• Перейдите в "Категории" для новых подписок

Спасибо за использование нашего сервиса!
    `;

    const { Markup } = await import('telegraf');
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📂 Категории', 'categories')],
      [Markup.button.callback('🏠 Главное меню', 'main_menu')]
    ]);

    await messageManager.editMessage(ctx, successMessage, keyboard);

    console.log(`Subscription cancelled: User ${user.id}, Category ${categoryId}`);

  } catch (error) {
    console.error('Cancel subscription final error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при отмене подписки. Обратитесь в поддержку.');
  }
};

// Новый обработчик для активации пробного дня
const activateTrial = async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    const user = await User.findByTelegramId(ctx.from.id);
    const category = await Category.findById(categoryId);

    if (!user || !category) {
      return messageManager.sendMessage(ctx, '❌ Данные не найдены');
    }

    // Проверяем, есть ли уже активная подписка
    const isSubscribed = await Subscription.isUserSubscribed(user.id, categoryId);
    if (isSubscribed) {
      return messageManager.sendMessage(ctx, '✅ Вы уже подписаны на эту категорию');
    }

    // Проверяем, использовал ли пользователь уже пробный период
    const hasUsedTrial = await Subscription.hasUserUsedTrial(user.id, categoryId);
    if (hasUsedTrial) {
      const price = (category.price / 100).toFixed(0);
      const message = `
❌ Вы уже использовали пробный период для категории "${category.name}"

💰 Стоимость подписки: ${price}₽ в месяц

Нажмите "Оплатить" для оформления платной подписки:
      `;
      
      return messageManager.sendMessage(ctx, message, subscriptionKeyboard(categoryId));
    }

    // Создаем пробную подписку
    await Subscription.createTrialSubscription(user.id, categoryId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const successMessage = `
🎉 Пробный день успешно активирован!

📂 Категория: ${category.name}
⏰ Действует до: ${expiresAt.toLocaleDateString('ru-RU')} в ${expiresAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}

💡 В течение пробного дня вы будете получать все уведомления по этой категории.

После окончания пробного периода вы сможете оформить платную подписку.

Приятного использования! 🚀
    `;

    const { Markup } = await import('telegraf');
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📂 Другие категории', 'categories')],
      [Markup.button.callback('🏠 Главное меню', 'main_menu')]
    ]);

    await messageManager.editMessage(ctx, successMessage, keyboard);

    console.log(`Trial activated: User ${user.id}, Category ${categoryId}, Expires: ${expiresAt}`);

  } catch (error) {
    console.error('Activate trial error:', error);
    
    if (error.message.includes('уже использовал пробный период')) {
      await messageManager.sendMessage(ctx, '❌ Вы уже использовали пробный период для этой категории');
    } else {
      await messageManager.sendMessage(ctx, '❌ Ошибка при активации пробного дня. Попробуйте позже.');
    }
  }
};

const mySubscriptions = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    
    if (!user) {
      return messageManager.sendMessage(ctx, '❌ Пользователь не найден');
    }

    const subscriptions = await Subscription.getUserSubscriptions(user.id);

    if (subscriptions.length === 0) {
      const message = '📭 У вас нет активных подписок\n\n💡 Перейдите в "Категории" чтобы оформить подписку';
      
      if (ctx.callbackQuery) {
        await messageManager.editMessage(ctx, message);
      } else {
        await messageManager.sendMessage(ctx, message);
      }
      return;
    }

    const message = `
📋 Ваши активные подписки:

${subscriptions.map(sub => {
  const expiresAt = new Date(sub.expires_at);
  const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
  return `• ${sub.categories.name} (осталось ${daysLeft} дней)`;
}).join('\n')}

💡 Выберите подписку для отмены:
    `;

    // Создаем клавиатуру с кнопками отмены для каждой подписки
    const { Markup } = await import('telegraf');
    const buttons = subscriptions.map(sub => [
      Markup.button.callback(`❌ Отменить "${sub.categories.name}"`, `cancel_subscription_${sub.category_id}`)
    ]);
    
    buttons.push([Markup.button.callback('🔙 Назад', 'main_menu')]);
    
    const keyboard = Markup.inlineKeyboard(buttons);

    // Проверяем, является ли это callback query (нажатие кнопки)
    if (ctx.callbackQuery) {
      // Если это callback, используем editMessage
      await messageManager.editMessage(ctx, message, keyboard);
    } else {
      // Если это команда, используем sendMessage
      await messageManager.sendMessage(ctx, message, keyboard);
    }
  } catch (error) {
    console.error('My subscriptions error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке подписок');
  }
};

export default {
  showCategories,
  subscribe,
  unsubscribe,
  mySubscriptions,
  confirmCancelSubscription,
  cancelSubscriptionFinal,
  activateTrial
}; 
/**
 * @fileoverview Сцена для использования промокода при активации категории
 * @author FreelanceBot Team
 * @version 1.0.0
 */

import { Scenes, Markup } from 'telegraf';
import Referral from '../../database/models/Referral.js';
import User from '../../database/models/User.js';
import Category from '../../database/models/Category.js';
import Subscription from '../../database/models/Subscription.js';
import messageManager from '../utils/messageManager.js';

/**
 * Сцена для ввода и применения промокода при активации категории
 */
const categoryPromoCodeScene = new Scenes.WizardScene(
  'USE_CATEGORY_PROMO_CODE',
  
  /**
   * Шаг 1: Ввод промокода для активации категории
   */
  async (ctx) => {
    const categoryId = ctx.scene.state.categoryId;
    
    try {
      const category = await Category.findById(categoryId);
      if (!category) {
        await messageManager.sendMessage(ctx, '❌ Категория не найдена');
        return ctx.scene.leave();
      }

      const message = `
🎫 Ввод промокода для активации категории

📂 Категория: ${category.name}

📝 Введите промокод:

💡 Промокод может дать:
• Дополнительные дни подписки
• Скидку на подписку
• Бесплатный доступ

⚠️ Промокод можно использовать только один раз`;

      await messageManager.sendMessage(
        ctx,
        message,
        Markup.inlineKeyboard([
          [Markup.button.callback('❌ Отмена', 'cancel_category_promo')]
        ])
      );
      
      return ctx.wizard.next();
    } catch (error) {
      console.error('Category promo code scene error:', error);
      await messageManager.sendMessage(ctx, '❌ Произошла ошибка');
      return ctx.scene.leave();
    }
  },

  /**
   * Шаг 2: Обработка введенного промокода
   */
  async (ctx) => {
    const promoCode = ctx.message?.text?.trim().toUpperCase();
    const categoryId = ctx.scene.state.categoryId;
    
    if (!promoCode) {
      await messageManager.sendMessage(
        ctx,
        '❌ Пожалуйста, введите корректный промокод\n\nПопробуйте еще раз:'
      );
      return;
    }

    try {
      const user = await User.findByTelegramId(ctx.from.id);
      const category = await Category.findById(categoryId);
      
      if (!user || !category) {
        await messageManager.sendMessage(ctx, '❌ Данные не найдены');
        return ctx.scene.leave();
      }

      // Проверяем не подписан ли уже пользователь на эту категорию
      const isSubscribed = await Subscription.isUserSubscribed(user.id, categoryId);
      if (isSubscribed) {
        await messageManager.sendMessage(ctx, '✅ Вы уже подписаны на эту категорию');
        return ctx.scene.leave();
      }

      // Применяем промокод
      const result = await Referral.applyReferralCode(promoCode, user.id);
      
      if (!result) {
        await messageManager.sendMessage(
          ctx, 
          `❌ Промокод "${promoCode}" не найден или уже использован\n\nПроверьте правильность ввода и попробуйте еще раз:`
        );
        return;
      }

      if (result.type === 'promo') {
        // Успешное применение промокода
        let responseMessage = `✅ Промокод "${promoCode}" успешно применен!`;
        
                 if (result.bonusDays > 0) {
           // Если промокод дает дополнительные дни, активируем подписку
           const subscriptionEnd = new Date();
           subscriptionEnd.setDate(subscriptionEnd.getDate() + result.bonusDays);
           
           await Subscription.create(user.id, categoryId, subscriptionEnd, false);
          
          responseMessage += `\n\n🎁 Вы получили ${result.bonusDays} дней бесплатного доступа к категории "${category.name}"!`;
          responseMessage += `\n📅 Подписка активна до: ${subscriptionEnd.toLocaleDateString('ru-RU')}`;
          
          // Уведомляем создателя промокода
          try {
            const userName = ctx.from.first_name || ctx.from.username || 'Пользователь';
            await ctx.telegram.sendMessage(
              result.creatorTelegramId,
              `🎉 Ваш промокод "${promoCode}" использован!\n\n👤 Пользователь: ${userName}\n📂 Категория: ${category.name}`
            );
          } catch (notifyError) {
            console.error('Failed to notify promo code creator:', notifyError);
          }
        } else {
          responseMessage += `\n\n💰 Вы получили скидку ${result.discountPercent}% на подписку!`;
          responseMessage += `\n\nТеперь вы можете оплатить подписку со скидкой.`;
        }
        
        await messageManager.sendMessage(
          ctx, 
          responseMessage,
          Markup.inlineKeyboard([
            [Markup.button.callback('📂 К категориям', 'categories')],
            [Markup.button.callback('🏠 Главное меню', 'main_menu')]
          ])
        );
      } else {
        await messageManager.sendMessage(
          ctx,
          '❌ Этот код не является промокодом для активации категории'
        );
      }
      
      return ctx.scene.leave();
      
    } catch (error) {
      console.error('Apply category promo code error:', error);
      await messageManager.sendMessage(ctx, '❌ Произошла ошибка при применении промокода');
      return ctx.scene.leave();
    }
  }
);

// Обработчик отмены
categoryPromoCodeScene.action('cancel_category_promo', async (ctx) => {
  await ctx.answerCbQuery('Отменено');
  await messageManager.sendMessage(
    ctx,
    'Ввод промокода отменен',
    Markup.inlineKeyboard([
      [Markup.button.callback('📂 К категориям', 'categories')],
      [Markup.button.callback('🏠 Главное меню', 'main_menu')]
    ])
  );
  return ctx.scene.leave();
});

export default categoryPromoCodeScene; 
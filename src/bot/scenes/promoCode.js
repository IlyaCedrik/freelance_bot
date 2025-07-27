import { Scenes, Markup } from 'telegraf';
import Referral from '../../database/models/Referral.js';
import User from '../../database/models/User.js';
import messageManager from '../utils/messageManager.js';

const promoCodeScene = new Scenes.WizardScene(
  'CREATE_PROMO_CODE',
  
  // Шаг 1: Ввод названия промокода
  async (ctx) => {
    await messageManager.sendMessage(
      ctx,
      `🎫 Создание промокода

📝 Введите название промокода (только английские буквы и цифры, 3-20 символов):

Пример: NEWUSER2024, DISCOUNT50, BONUS

⚠️ Промокод должен быть уникальным`,
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Отмена', 'cancel_promo_creation')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 2: Ввод количества бонусных дней
  async (ctx) => {
    const code = ctx.message?.text?.trim().toUpperCase();
    
    if (!code || !/^[A-Z0-9]{3,20}$/.test(code)) {
      await messageManager.sendMessage(
        ctx,
        '❌ Неверный формат! Промокод должен содержать только английские буквы и цифры (3-20 символов)\n\nПопробуйте еще раз:'
      );
      return;
    }

    ctx.wizard.state.promoCode = code;
    
    await messageManager.sendMessage(
      ctx,
      `✅ Промокод: ${code}

📅 Введите количество бонусных дней (0-30):

0 - без дополнительных дней
7 - неделя бесплатно  
14 - две недели бесплатно
30 - месяц бесплатно`,
      Markup.inlineKeyboard([
        [Markup.button.callback('0 дней', 'promo_days_0')],
        [Markup.button.callback('7 дней', 'promo_days_7')],
        [Markup.button.callback('14 дней', 'promo_days_14')],
        [Markup.button.callback('30 дней', 'promo_days_30')],
        [Markup.button.callback('❌ Отмена', 'cancel_promo_creation')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 3: Ввод процента скидки
  async (ctx) => {
    let bonusDays;
    
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      if (action.startsWith('promo_days_')) {
        bonusDays = parseInt(action.replace('promo_days_', ''));
        await ctx.answerCbQuery();
      } else if (action === 'cancel_promo_creation') {
        await ctx.answerCbQuery('Создание промокода отменено');
        await ctx.scene.leave();
        return;
      }
    } else if (ctx.message?.text) {
      bonusDays = parseInt(ctx.message.text.trim());
      if (isNaN(bonusDays) || bonusDays < 0 || bonusDays > 30) {
        await messageManager.sendMessage(
          ctx,
          '❌ Неверное количество дней! Введите число от 0 до 30:'
        );
        return;
      }
    } else {
      return;
    }

    ctx.wizard.state.bonusDays = bonusDays;
    
    await messageManager.sendMessage(
      ctx,
      `✅ Бонусные дни: ${bonusDays}

💰 Введите процент скидки (0-50%):

0 - без скидки
10 - скидка 10%
25 - скидка 25%  
50 - скидка 50%`,
      Markup.inlineKeyboard([
        [Markup.button.callback('0%', 'promo_discount_0')],
        [Markup.button.callback('10%', 'promo_discount_10')],
        [Markup.button.callback('25%', 'promo_discount_25')],
        [Markup.button.callback('50%', 'promo_discount_50')],
        [Markup.button.callback('❌ Отмена', 'cancel_promo_creation')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 4: Ввод лимита использований
  async (ctx) => {
    let discountPercent;
    
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      if (action.startsWith('promo_discount_')) {
        discountPercent = parseInt(action.replace('promo_discount_', ''));
        await ctx.answerCbQuery();
      } else if (action === 'cancel_promo_creation') {
        await ctx.answerCbQuery('Создание промокода отменено');
        await ctx.scene.leave();
        return;
      }
    } else if (ctx.message?.text) {
      discountPercent = parseInt(ctx.message.text.trim());
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 50) {
        await messageManager.sendMessage(
          ctx,
          '❌ Неверный процент скидки! Введите число от 0 до 50:'
        );
        return;
      }
    } else {
      return;
    }

    ctx.wizard.state.discountPercent = discountPercent;
    
    await messageManager.sendMessage(
      ctx,
      `✅ Скидка: ${discountPercent}%

🔢 Введите лимит использований:

Например:
10 - промокод можно использовать 10 раз
100 - промокод можно использовать 100 раз
0 - без ограничений`,
      Markup.inlineKeyboard([
        [Markup.button.callback('10 раз', 'promo_limit_10')],
        [Markup.button.callback('50 раз', 'promo_limit_50')],
        [Markup.button.callback('100 раз', 'promo_limit_100')],
        [Markup.button.callback('Без ограничений', 'promo_limit_0')],
        [Markup.button.callback('❌ Отмена', 'cancel_promo_creation')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 5: Подтверждение и создание промокода
  async (ctx) => {
    let usageLimit;
    
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      if (action.startsWith('promo_limit_')) {
        const limitValue = action.replace('promo_limit_', '');
        usageLimit = limitValue === '0' ? null : parseInt(limitValue);
        await ctx.answerCbQuery();
      } else if (action === 'cancel_promo_creation') {
        await ctx.answerCbQuery('Создание промокода отменено');
        await ctx.scene.leave();
        return;
      }
    } else if (ctx.message?.text) {
      const input = ctx.message.text.trim();
      if (input === '0' || input.toLowerCase() === 'без ограничений') {
        usageLimit = null;
      } else {
        usageLimit = parseInt(input);
        if (isNaN(usageLimit) || usageLimit <= 0) {
          await messageManager.sendMessage(
            ctx,
            '❌ Неверный лимит! Введите положительное число или 0 для отсутствия ограничений:'
          );
          return;
        }
      }
    } else {
      return;
    }

    const { promoCode, bonusDays, discountPercent } = ctx.wizard.state;
    
    const summaryMessage = `
📋 Подтверждение создания промокода

🎫 Код: ${promoCode}
📅 Бонусные дни: ${bonusDays}
💰 Скидка: ${discountPercent}%
🔢 Лимит использований: ${usageLimit || 'Без ограничений'}

Создать промокод?`;

    await messageManager.sendMessage(
      ctx,
      summaryMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Создать', 'confirm_promo_creation')],
        [Markup.button.callback('❌ Отмена', 'cancel_promo_creation')]
      ])
    );

    ctx.wizard.state.usageLimit = usageLimit;
    return ctx.wizard.next();
  },

  // Шаг 6: Финальное создание промокода
  async (ctx) => {
    if (!ctx.callbackQuery) return;

    const action = ctx.callbackQuery.data;
    
    if (action === 'cancel_promo_creation') {
      await ctx.answerCbQuery('Создание промокода отменено');
      await ctx.scene.leave();
      return;
    }

    if (action === 'confirm_promo_creation') {
      try {
        await ctx.answerCbQuery('Создаем промокод...');
        
        const user = await User.findByTelegramId(ctx.from.id);
        const { promoCode, bonusDays, discountPercent, usageLimit } = ctx.wizard.state;

        // Создаем промокод
        const createdPromo = await Referral.createPromoCode(user.id, {
          code: promoCode,
          bonusDays: bonusDays,
          discountPercent: discountPercent,
          usageLimit: usageLimit
        });

        const successMessage = `
🎉 Промокод успешно создан!

🎫 Код: \`${promoCode}\`
📅 Бонусные дни: ${bonusDays}
💰 Скидка: ${discountPercent}%
🔢 Лимит: ${usageLimit || 'Без ограничений'}

📢 Поделитесь промокодом с друзьями!
Они смогут использовать его при регистрации.

📊 Статистику использования можно посмотреть в реферальной системе.`;

        await messageManager.sendMessage(
          ctx,
          successMessage,
          Markup.inlineKeyboard([
            [Markup.button.callback('📊 К реферальной системе', 'referral_program')],
            [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
          ]),
          { parse_mode: 'Markdown' }
        );

        console.log(`✅ Промокод ${promoCode} создан пользователем ${ctx.from.id}`);

      } catch (error) {
        console.error('Error creating promo code:', error);
        
        let errorMessage = '❌ Ошибка при создании промокода';
        if (error.message.includes('duplicate key')) {
          errorMessage = '❌ Промокод с таким названием уже существует. Попробуйте другое название.';
        }
        
        await messageManager.sendMessage(ctx, errorMessage);
      }

      await ctx.scene.leave();
    }
  }
);

// Обработчик отмены создания промокода
promoCodeScene.action('cancel_promo_creation', async (ctx) => {
  await ctx.answerCbQuery('Создание промокода отменено');
  await messageManager.sendMessage(
    ctx,
    'Создание промокода отменено',
    Markup.inlineKeyboard([
      [Markup.button.callback('📊 К реферальной системе', 'referral_program')],
      [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
    ])
  );
  await ctx.scene.leave();
});

export default promoCodeScene; 
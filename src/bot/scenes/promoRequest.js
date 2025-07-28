import { Scenes, Markup } from 'telegraf';
import User from '../../database/models/User.js';
import { supabase } from '../../config/supabase.js';
import messageManager from '../utils/messageManager.js';
import notificationService from '../../services/notificationService.js';

const promoRequestScene = new Scenes.WizardScene(
  'REQUEST_PROMO_CODE',
  
  // Шаг 1: Ввод названия промокода
  async (ctx) => {
    await messageManager.sendMessage(
      ctx,
      `📝 Запрос на создание промокода

🎫 Введите желаемое название промокода (только английские буквы и цифры, 3-20 символов):

Пример: NEWUSER2024, DISCOUNT50, BONUS

⚠️ Промокод должен быть уникальным`,
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Отмена', 'cancel_promo_request')]
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

    // Проверяем уникальность
    const { data: existingCode } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('code', code)
      .single();

    const { data: existingRequest } = await supabase
      .from('promo_code_requests')
      .select('id')
      .eq('requested_code', code)
      .single();

    if (existingCode || existingRequest) {
      await messageManager.sendMessage(
        ctx,
        '❌ Промокод с таким названием уже существует или уже запрошен. Попробуйте другое название:'
      );
      return;
    }

    ctx.wizard.state.promoCode = code;
    
    await messageManager.sendMessage(
      ctx,
      `✅ Промокод: ${code}

📅 Сколько бонусных дней вы хотите запросить? (0-30):

0 - без дополнительных дней
7 - неделя бесплатно  
14 - две недели бесплатно
30 - месяц бесплатно`,
      Markup.inlineKeyboard([
        [Markup.button.callback('0 дней', 'request_days_0')],
        [Markup.button.callback('7 дней', 'request_days_7')],
        [Markup.button.callback('14 дней', 'request_days_14')],
        [Markup.button.callback('30 дней', 'request_days_30')],
        [Markup.button.callback('❌ Отмена', 'cancel_promo_request')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 3: Ввод процента скидки
  async (ctx) => {
    let bonusDays;
    
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      if (action.startsWith('request_days_')) {
        bonusDays = parseInt(action.replace('request_days_', ''));
        await ctx.answerCbQuery();
      } else if (action === 'cancel_promo_request') {
        await ctx.answerCbQuery('Запрос отменен');
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

💰 Какой процент скидки вы хотите запросить? (0-50%):

0 - без скидки
10 - скидка 10%
25 - скидка 25%  
50 - скидка 50%`,
      Markup.inlineKeyboard([
        [Markup.button.callback('0%', 'request_discount_0')],
        [Markup.button.callback('10%', 'request_discount_10')],
        [Markup.button.callback('25%', 'request_discount_25')],
        [Markup.button.callback('50%', 'request_discount_50')],
        [Markup.button.callback('❌ Отмена', 'cancel_promo_request')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 4: Ввод лимита использований
  async (ctx) => {
    let discountPercent;
    
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      if (action.startsWith('request_discount_')) {
        discountPercent = parseInt(action.replace('request_discount_', ''));
        await ctx.answerCbQuery();
      } else if (action === 'cancel_promo_request') {
        await ctx.answerCbQuery('Запрос отменен');
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

🔢 Сколько раз должен использоваться промокод?

Например:
10 - промокод можно использовать 10 раз
100 - промокод можно использовать 100 раз
0 - без ограничений`,
      Markup.inlineKeyboard([
        [Markup.button.callback('10 раз', 'request_limit_10')],
        [Markup.button.callback('50 раз', 'request_limit_50')],
        [Markup.button.callback('100 раз', 'request_limit_100')],
        [Markup.button.callback('Без ограничений', 'request_limit_0')],
        [Markup.button.callback('❌ Отмена', 'cancel_promo_request')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 5: Описание цели промокода
  async (ctx) => {
    let usageLimit;
    
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      if (action.startsWith('request_limit_')) {
        const limitValue = action.replace('request_limit_', '');
        usageLimit = limitValue === '0' ? null : parseInt(limitValue);
        await ctx.answerCbQuery();
      } else if (action === 'cancel_promo_request') {
        await ctx.answerCbQuery('Запрос отменен');
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

    ctx.wizard.state.usageLimit = usageLimit;
    
    await messageManager.sendMessage(
      ctx,
      `✅ Лимит: ${usageLimit || 'Без ограничений'}

📝 Опишите для чего вам нужен этот промокод:

Например:
- Для привлечения новых пользователей из моего канала
- Для участников моего мероприятия
- Для друзей и знакомых

Это поможет администратору принять решение.`,
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Отмена', 'cancel_promo_request')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 6: Подтверждение запроса
  async (ctx) => {
    if (!ctx.message?.text) {
      await messageManager.sendMessage(
        ctx,
        '❌ Пожалуйста, опишите цель создания промокода текстом:'
      );
      return;
    }

    const description = ctx.message.text.trim();
    if (description.length < 10) {
      await messageManager.sendMessage(
        ctx,
        '❌ Описание слишком короткое. Пожалуйста, опишите подробнее (минимум 10 символов):'
      );
      return;
    }

    ctx.wizard.state.description = description;
    const { promoCode, bonusDays, discountPercent, usageLimit } = ctx.wizard.state;
    
    const summaryMessage = `
📋 Подтверждение запроса промокода

🎫 Код: ${promoCode}
📅 Бонусные дни: ${bonusDays}
💰 Скидка: ${discountPercent}%
🔢 Лимит использований: ${usageLimit || 'Без ограничений'}

📝 Описание: ${description}

⏳ После отправки запрос будет рассмотрен администратором.

Отправить запрос?`;

    await messageManager.sendMessage(
      ctx,
      summaryMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Отправить запрос', 'confirm_promo_request')],
        [Markup.button.callback('❌ Отмена', 'cancel_promo_request')]
      ])
    );
    return ctx.wizard.next();
  },

  // Шаг 7: Отправка запроса
  async (ctx) => {
    if (!ctx.callbackQuery) return;

    const action = ctx.callbackQuery.data;
    
    if (action === 'cancel_promo_request') {
      await ctx.answerCbQuery('Запрос отменен');
      await ctx.scene.leave();
      return;
    }

    if (action === 'confirm_promo_request') {
      try {
        await ctx.answerCbQuery('Отправляем запрос...');
        
        const user = await User.findByTelegramId(ctx.from.id);
        const { promoCode, bonusDays, discountPercent, usageLimit, description } = ctx.wizard.state;

        // Создаем запрос
        const { data: request, error } = await supabase
          .from('promo_code_requests')
          .insert([{
            user_id: user.id,
            requested_code: promoCode,
            bonus_days: bonusDays,
            discount_percent: discountPercent,
            usage_limit: usageLimit,
            description: description
          }])
          .select()
          .single();

        if (error) throw error;

        const successMessage = `
✅ Запрос на промокод отправлен!

🎫 Промокод: ${promoCode}
📋 Номер запроса: ${request.id.substring(0, 8)}

⏳ Ваш запрос будет рассмотрен администратором в ближайшее время.
📬 Вы получите уведомление о статусе запроса.

📊 Проверить статус запроса можно в реферальной системе.`;

        await messageManager.sendMessage(
          ctx,
          successMessage,
          Markup.inlineKeyboard([
            [Markup.button.callback('📊 К реферальной системе', 'referral_program')],
            [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
          ])
        );

        // Уведомляем администраторов о новом запросе
        try {
          console.log('🔔 Отправляем уведомления администраторам...');
          await notifyAdminsAboutNewRequest(request, user);
          console.log('✅ Уведомления администраторам отправлены');
        } catch (notifyError) {
          console.error('❌ Ошибка при отправке уведомлений администраторам:', notifyError);
          // Не прерываем основной процесс из-за ошибки уведомлений
        }

        console.log(`✅ Запрос на промокод ${promoCode} создан пользователем ${ctx.from.id}`);

      } catch (error) {
        console.error('Error creating promo request:', error);
        
        let errorMessage = '❌ Ошибка при отправке запроса';
        if (error?.message?.includes('duplicate key') || error?.code === '23505') {
          errorMessage = '❌ Промокод с таким названием уже запрошен. Попробуйте другое название.';
        }
        
        await messageManager.sendMessage(ctx, errorMessage);
      }

      await ctx.scene.leave();
    }
  }
);

// Обработчик отмены
promoRequestScene.action('cancel_promo_request', async (ctx) => {
  await ctx.answerCbQuery('Запрос отменен');
  await messageManager.sendMessage(
    ctx,
    'Запрос на промокод отменен',
    Markup.inlineKeyboard([
      [Markup.button.callback('📊 К реферальной системе', 'referral_program')],
      [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
    ])
  );
  await ctx.scene.leave();
});

// Функция уведомления администраторов
async function notifyAdminsAboutNewRequest(request, user) {
  try {
    console.log('📋 Начинаем процесс уведомления администраторов');
    console.log('📦 Request data:', { id: request.id, code: request.requested_code });
    console.log('👤 User data:', { id: user.id, telegram_id: user.telegram_id });

    // Получаем всех администраторов
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('telegram_id, first_name')
      .eq('role', 'admin');

    if (adminError) {
      console.error('❌ Ошибка при получении списка администраторов:', adminError);
      throw adminError;
    }

    console.log(`👨‍💼 Найдено администраторов: ${admins?.length || 0}`);

    if (!admins || admins.length === 0) {
      console.log('⚠️ Администраторы не найдены');
      return;
    }

    const userName = user.first_name || user.username || 'Пользователь';
    const notificationMessage = `
🔔 Новый запрос на промокод!

👤 От: ${userName} (ID: ${user.telegram_id})
🎫 Промокод: ${request.requested_code}
📅 Дни: ${request.bonus_days} | 💰 Скидка: ${request.discount_percent}%
🔢 Лимит: ${request.usage_limit || 'Без ограничений'}

📝 Описание: ${request.description}

📋 ID запроса: ${request.id.substring(0, 8)}

Используйте /admin для обработки запросов.
    `;

    console.log('📝 Сообщение подготовлено, отправляем администраторам...');

    // Проверяем, что notificationService настроен
    if (!notificationService || !notificationService.bot) {
      console.error('❌ NotificationService не настроен!');
      throw new Error('NotificationService not configured');
    }

    // Отправляем уведомления всем администраторам
    for (const admin of admins) {
      try {
        console.log(`📤 Отправляем уведомление администратору ${admin.telegram_id}`);
        await notificationService.sendAdminNotification(admin.telegram_id, notificationMessage);
        console.log(`✅ Уведомление отправлено администратору ${admin.telegram_id}`);
      } catch (error) {
        console.error(`❌ Ошибка отправки администратору ${admin.telegram_id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Общая ошибка при уведомлении администраторов:', error);
    throw error; // Пробрасываем ошибку наверх для более детальной диагностики
  }
}

export default promoRequestScene; 
/**
 * Конфигурация обработчиков действий бота
 */
import { Markup } from 'telegraf';
import { 
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  RECOVERY_MESSAGES,
  LOG_CONFIG,
  REGEX_PATTERNS 
} from '../../config/constants.js';

/**
 * Настройка основных команд бота
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} handlers - Объект с обработчиками
 */
export function setupCommands(bot, handlers) {
  const { startHandler, subscriptionHandler, profileHandler, referralHandler  } = handlers;

  bot.start(startHandler.startHandler);
  bot.command('categories', subscriptionHandler.showCategories);
  bot.command('referral_program', referralHandler.showReferralProgram);
  bot.command('profile', profileHandler.showProfile);
}

/**
 * Настройка обработчиков подписок
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} handlers - Объект с обработчиками
 */
export function setupSubscriptionActions(bot, handlers) {
  const { subscriptionHandler, paymentHandler } = handlers;

  bot.action(REGEX_PATTERNS.SUBSCRIBE, subscriptionHandler.subscribe);
  bot.action(REGEX_PATTERNS.UNSUBSCRIBE, subscriptionHandler.unsubscribe);
  bot.action(REGEX_PATTERNS.TRIAL, subscriptionHandler.activateTrial);
  bot.action(REGEX_PATTERNS.PAY, paymentHandler.createInvoice);
  bot.action(REGEX_PATTERNS.USE_PROMO, subscriptionHandler.useCategoryPromoCode);
  bot.action(REGEX_PATTERNS.CANCEL_SUBSCRIPTION, subscriptionHandler.confirmCancelSubscription);
  bot.action(REGEX_PATTERNS.CONFIRM_CANCEL, subscriptionHandler.cancelSubscriptionFinal);
}

/**
 * Настройка обработчиков реферальной системы
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} handlers - Объект с обработчиками
 */
export function setupReferralActions(bot, handlers) {
  const { referralHandler } = handlers;

  bot.action('withdraw_card', (ctx) => referralHandler.initiateWithdraw(ctx, 'Банковская карта'));
  bot.action('withdraw_qiwi', (ctx) => referralHandler.initiateWithdraw(ctx, 'QIWI'));
}

/**
 * Настройка обработчиков промокодов
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} messageManager - Менеджер сообщений
 */
export function setupPromoCodeActions(bot, messageManager) {
  // Отмена создания промокода
  bot.action('cancel_promo_creation', async (ctx) => {
    try {
      await ctx.answerCbQuery(SUCCESS_MESSAGES.PROMO_CANCELLED);
      await messageManager.sendMessage(
        ctx,
        SUCCESS_MESSAGES.PROMO_CANCELLED,
        Markup.inlineKeyboard([
          [Markup.button.callback('📊 К реферальной системе', 'referral_program')],
          [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
        ])
      );
    } catch (error) {
      console.error(LOG_CONFIG.ERROR.PROMO_CREATION_ERROR, error);
    }
  });

  // Обработчики для кнопок в сцене промокода
  const promoActions = ['promo_days_\\d+', 'promo_discount_\\d+', 'promo_limit_\\d+'];
  promoActions.forEach(pattern => {
    bot.action(new RegExp(`^${pattern}$`), async (ctx) => {
      if (ctx.scene && ctx.scene.current) {
        return; // Если в сцене, позволим сцене обработать
      }
      await ctx.answerCbQuery(ERROR_MESSAGES.START_PROMO_FIRST);
    });
  });

  bot.action('confirm_promo_creation', async (ctx) => {
    if (ctx.scene && ctx.scene.current) {
      return;
    }
    await ctx.answerCbQuery(ERROR_MESSAGES.START_PROMO_FIRST);
  });
}

/**
 * Настройка обработчиков запросов промокодов
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} messageManager - Менеджер сообщений
 */
export function setupPromoRequestActions(bot, messageManager) {
  // Отмена запроса промокода
  bot.action('cancel_promo_request', async (ctx) => {
    try {
      await ctx.answerCbQuery(SUCCESS_MESSAGES.REQUEST_CANCELLED);
      await messageManager.sendMessage(
        ctx,
        SUCCESS_MESSAGES.REQUEST_CANCELLED,
        Markup.inlineKeyboard([
          [Markup.button.callback('📊 К реферальной системе', 'referral_program')],
          [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
        ])
      );
    } catch (error) {
      console.error(LOG_CONFIG.ERROR.PROMO_REQUEST_ERROR, error);
    }
  });

  // Обработчики для сцены запроса промокода
  const requestActions = ['request_days_\\d+', 'request_discount_\\d+', 'request_limit_\\d+'];
  requestActions.forEach(pattern => {
    bot.action(new RegExp(`^${pattern}$`), async (ctx) => {
      if (ctx.scene && ctx.scene.current) {
        return;
      }
      await ctx.answerCbQuery(ERROR_MESSAGES.START_REQUEST_FIRST);
    });
  });

  bot.action('confirm_promo_request', async (ctx) => {
    if (ctx.scene && ctx.scene.current) {
      return;
    }
    await ctx.answerCbQuery(ERROR_MESSAGES.START_REQUEST_FIRST);
  });
}

/**
 * Настройка админ обработчиков
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} adminHandlers - Админ обработчики
 */
export function setupAdminActions(bot, adminHandlers) {
  const {
    requireAdmin,
    showAdminPanel,
    showChannelManagement,
    showCategoryManagement,
    showUserManagement,
    listChannels,
    listCategories,
    listUsers,
    showChannelDetails,
    startAddChannel,
    startMakeAdmin
  } = adminHandlers;

  // Админ действия (с проверкой прав)
  bot.action('admin_main', requireAdmin, showAdminPanel);
  bot.action('admin_channels', requireAdmin, showChannelManagement);
  bot.action('admin_categories', requireAdmin, showCategoryManagement);
  bot.action('admin_users', requireAdmin, showUserManagement);
  bot.action('admin_list_channels', requireAdmin, listChannels);
  bot.action('admin_list_categories', requireAdmin, listCategories);
  bot.action('admin_list_users', requireAdmin, listUsers);
  bot.action('admin_add_channel', requireAdmin, startAddChannel);
  bot.action('admin_make_admin', requireAdmin, startMakeAdmin);
  bot.action(REGEX_PATTERNS.ADMIN_CHANNEL_DETAILS, requireAdmin, showChannelDetails);

  // Команда админ для быстрого доступа
  bot.command('admin', requireAdmin, showAdminPanel);
}

/**
 * Настройка обработчиков платежей
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} paymentHandler - Обработчик платежей
 */
export function setupPaymentHandlers(bot, paymentHandler) {
  bot.on('pre_checkout_query', paymentHandler.preCheckout);
  bot.on('successful_payment', paymentHandler.successfulPayment);
}

/**
 * Настройка глобального обработчика неизвестных callback queries
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} messageManager - Менеджер сообщений
 */
export function setupGlobalCallbackHandler(bot, messageManager) {
  bot.on('callback_query', async (ctx) => {
    // Если callback query не был обработан выше, обрабатываем здесь
    if (!ctx.callbackQuery.answered) {
      const callbackData = ctx.callbackQuery.data;
      const userId = ctx.from.id;
      const sceneName = ctx.scene?.current?.id || 'none';
      
      console.log(LOG_CONFIG.ERROR.UNKNOWN_CALLBACK(callbackData, userId, sceneName));
      
      try {
        // Особая обработка для промокодов, если пользователь не в сцене
        if (callbackData.startsWith('promo_') || callbackData === 'confirm_promo_creation') {
          await ctx.answerCbQuery(ERROR_MESSAGES.PROMO_SESSION_EXPIRED);
          await messageManager.sendMessage(
            ctx,
            RECOVERY_MESSAGES.PROMO_EXPIRED,
            Markup.inlineKeyboard([
              [Markup.button.callback('🎫 Создать промокод', 'create_promo_code')],
              [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
            ])
          );
        } else if (callbackData.startsWith('request_') || callbackData === 'confirm_promo_request') {
          await ctx.answerCbQuery(ERROR_MESSAGES.REQUEST_SESSION_EXPIRED);
          await messageManager.sendMessage(
            ctx,
            RECOVERY_MESSAGES.REQUEST_EXPIRED,
            Markup.inlineKeyboard([
              [Markup.button.callback('📝 Запросить промокод', 'create_promo_code')],
              [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
            ])
          );
        } else {
          await ctx.answerCbQuery(ERROR_MESSAGES.UNKNOWN_COMMAND);
          await messageManager.sendMessage(ctx, ERROR_MESSAGES.UNKNOWN_COMMAND);
        }
      } catch (error) {
        console.error(LOG_CONFIG.ERROR.CALLBACK_QUERY_ERROR, error);
      }
    }
  });
} 
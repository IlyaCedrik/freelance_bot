import 'dotenv/config';
import { Telegraf, Scenes, session, Markup } from 'telegraf';
const { Stage } = Scenes;
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Services
import { supabase } from './config/supabase.js';
import schedulerService from './services/scheduler.js';

// Bot handlers
import startHandler from './bot/handlers/start.js';
import subscriptionHandler from './bot/handlers/subscription.js';
import paymentHandler from './bot/handlers/payment.js';
import settingsHandler from './bot/handlers/settings.js';
import referralHandler from './bot/handlers/referral.js';
import profileHandler from './bot/handlers/profile.js';
import {
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
  startMakeAdmin,
  handleAdminTextInput
} from './bot/handlers/admin.js';

// Scenes
import subscriptionScene from './bot/scenes/subscription.js';
import paymentScene from './bot/scenes/payment.js';
import promoCodeScene from './bot/scenes/promoCode.js';

// Middleware
import authMiddleware from './bot/middleware/auth.js';
import subscriptionMiddleware from './bot/middleware/subscription.js';

// Utils
import messageManager from './bot/utils/messageManager.js';
import navigation from './bot/utils/navigation.js';

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Setup bot commands and menu
async function setupBotCommands() {
  try {
    // Настройка списка команд для меню
    const commands = [
      { command: 'start', description: '🏠 Главное меню' },
      { command: 'categories', description: '📋 Все категории заказов' },
      { command: 'subscriptions', description: '📊 Мои подписки' },
      { command: 'profile', description: '👤 Личный кабинет' },
      { command: 'settings', description: '⚙️ Настройки аккаунта' },
      { command: 'help', description: '❓ Помощь и информация' }
    ];

    // Устанавливаем команды для меню
    await bot.telegram.setMyCommands(commands);
    
    // Настраиваем Menu Button (кнопка слева от скрепки)
    await bot.telegram.setChatMenuButton({
      type: 'commands'
    });

    console.log('✅ Bot commands menu configured successfully');
  } catch (error) {
    console.error('❌ Error setting up bot commands:', error);
  }
}

// Setup scenes
const stage = new Stage([subscriptionScene, paymentScene, promoCodeScene]);

// Bot middleware
bot.use(session());
bot.use(stage.middleware());
bot.use(authMiddleware);

// Регистрируем все навигационные routes
function setupNavigation() {
  // Главные экраны
  navigation.register('main_menu', startHandler.startHandler);
  navigation.register('back_to_main', startHandler.startHandler);
  navigation.register('categories', subscriptionHandler.showCategories);
  navigation.register('my_subscriptions', subscriptionHandler.mySubscriptions);
  navigation.register('settings', settingsHandler.showSettings);
  navigation.register('profile', profileHandler.showProfile);
  
  // Реферальная система
  navigation.register('referral_program', referralHandler.showReferralProgram);
  navigation.register('referral_refresh', referralHandler.refreshReferralStats);
  navigation.register('referral_details', referralHandler.showReferralDetails);
  navigation.register('referral_withdraw', referralHandler.showWithdrawOptions);
  navigation.register('create_promo_code', referralHandler.createPromoCode);
  navigation.register('show_user_promo_codes', referralHandler.showUserPromoCodes);
  
  // Профиль
  navigation.register('user_stats', profileHandler.showUserStats);
  
  // Дополнительные экраны
  navigation.register('show_subscriptions', subscriptionHandler.mySubscriptions);
  navigation.register('show_privacy', settingsHandler.showPrivacyPolicy);
  navigation.register('export_data', settingsHandler.exportUserData);
  navigation.register('delete_account_confirm', settingsHandler.confirmDeleteAccount);
  navigation.register('delete_account_final', settingsHandler.deleteAccount);
  
  console.log('🧭 Navigation routes registered:', navigation.getRoutes().length);
}

setupNavigation();

// Global error handler для бота
bot.catch((err, ctx) => {
  console.error('Bot error occurred:', err);
  
  // Логируем информацию о пользователе для отладки
  if (ctx.from) {
    console.error('Error for user:', {
      id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name
    });
  }
  
  // Не показываем техническую ошибку пользователю
  messageManager.sendMessage(ctx, '❌ Произошла ошибка. Попробуйте позже или обратитесь в поддержку.').catch(() => {});
});

// Bot commands
bot.start(startHandler.startHandler);
bot.command('categories', subscriptionHandler.showCategories);
bot.command('subscriptions', subscriptionHandler.mySubscriptions);
bot.command('profile', profileHandler.showProfile);
bot.command('settings', settingsHandler.showSettings);
bot.command('delete_account', settingsHandler.confirmDeleteAccount);
bot.command('help', startHandler.help);

// Bot actions - бизнес-логика
bot.action(/^subscribe_(.+)$/, subscriptionHandler.subscribe);
bot.action(/^unsubscribe_(.+)$/, subscriptionHandler.unsubscribe);
bot.action(/^pay_(.+)$/, paymentHandler.createInvoice);
bot.action(/^cancel_subscription_(.+)$/, subscriptionHandler.confirmCancelSubscription);
bot.action(/^confirm_cancel_(.+)$/, subscriptionHandler.cancelSubscriptionFinal);

// Реферальные действия
bot.action('withdraw_card', (ctx) => referralHandler.initiateWithdraw(ctx, 'Банковская карта'));
bot.action('withdraw_qiwi', (ctx) => referralHandler.initiateWithdraw(ctx, 'QIWI'));

// Обработчики сцен (на случай если сцена не активна)
bot.action('cancel_promo_creation', async (ctx) => {
  try {
    await ctx.answerCbQuery('Создание промокода отменено');
    await messageManager.sendMessage(
      ctx,
      'Создание промокода отменено',
      Markup.inlineKeyboard([
        [Markup.button.callback('📊 К реферальной системе', 'referral_program')],
        [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
      ])
    );
  } catch (error) {
    console.error('Cancel promo creation error:', error);
  }
});

// Обработчики для кнопок в сцене промокода
bot.action(/^promo_days_\d+$/, async (ctx) => {
  if (ctx.scene && ctx.scene.current) {
    // Если в сцене, позволим сцене обработать
    return;
  }
  await ctx.answerCbQuery('Сначала начните создание промокода');
});

bot.action(/^promo_discount_\d+$/, async (ctx) => {
  if (ctx.scene && ctx.scene.current) {
    return;
  }
  await ctx.answerCbQuery('Сначала начните создание промокода');
});

bot.action(/^promo_limit_\d+$/, async (ctx) => {
  if (ctx.scene && ctx.scene.current) {
    return;
  }
  await ctx.answerCbQuery('Сначала начните создание промокода');
});

bot.action('confirm_promo_creation', async (ctx) => {
  if (ctx.scene && ctx.scene.current) {
    return;
  }
  await ctx.answerCbQuery('Сначала начните создание промокода');
});

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
bot.action(/^admin_channel_details_(.+)$/, requireAdmin, showChannelDetails);

// Команда админ для быстрого доступа
bot.command('admin', requireAdmin, showAdminPanel);

// Navigation actions - все через централизованный роутер
const navActions = [
  'main_menu', 'back_to_main', 'categories', 'my_subscriptions', 'settings', 'profile',
  'show_subscriptions', 'show_privacy', 'export_data', 
  'delete_account_confirm', 'delete_account_final',
  'referral_program', 'referral_refresh', 'referral_details', 'referral_withdraw',
  'create_promo_code', 'show_user_promo_codes', 'user_stats'
];

navActions.forEach(action => {
  bot.action(action, navigation.middleware(action));
});

// Глобальный обработчик для неизвестных callback queries
bot.on('callback_query', async (ctx) => {
  // Если callback query не был обработан выше, обрабатываем здесь
  if (!ctx.callbackQuery.answered) {
    const callbackData = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const sceneName = ctx.scene?.current?.id || 'none';
    
    console.log(`❓ Unknown callback query: ${callbackData} from user ${userId} (scene: ${sceneName})`);
    
    try {
      // Особая обработка для промокодов, если пользователь не в сцене
      if (callbackData.startsWith('promo_') || callbackData === 'confirm_promo_creation') {
        await ctx.answerCbQuery('⚠️ Сессия создания промокода истекла. Начните заново.');
        await messageManager.sendMessage(
          ctx,
          'Сессия создания промокода истекла. Нажмите на кнопку ниже, чтобы начать заново.',
          Markup.inlineKeyboard([
            [Markup.button.callback('🎫 Создать промокод', 'create_promo_code')],
            [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
          ])
        );
      } else {
        await ctx.answerCbQuery('❌ Неизвестная команда');
        await messageManager.sendMessage(ctx, '❌ Неизвестная команда. Попробуйте /start');
      }
    } catch (error) {
      console.error('Error handling unknown callback query:', error);
    }
  }
});


bot.on('pre_checkout_query', paymentHandler.preCheckout);
bot.on('successful_payment', paymentHandler.successfulPayment);

// Обработка текстовых сообщений (включая админ-функции)
bot.on('text', handleAdminTextInput);


const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());


app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

app.get('/health', async (req, res) => {
  try {
    const botInfo = await bot.telegram.getMe();
    const { error } = await supabase.from('users').select('count').single();
    
    res.json({ 
      status: 'ok',
      bot: botInfo.username,
      database: error ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      scheduler_running: schedulerService?.isRunning || false
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
  
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Webhook URL: ${process.env.WEBHOOK_URL}/webhook`);
    
    // Настройка меню команд
    await setupBotCommands();
    
    schedulerService.setBot(bot);
    schedulerService.start();
  });
} else {
  bot.launch(async () => {
    console.log('🤖 Bot started in polling mode');
    
    // Настройка меню команд
    await setupBotCommands();
    
    schedulerService.setBot(bot);
    schedulerService.start();
  });
  
  app.listen(PORT, () => {
    console.log(`🚀 Dev server running on port ${PORT}`);
  });
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 
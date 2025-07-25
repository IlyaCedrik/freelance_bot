import 'dotenv/config';
import { Telegraf, Scenes, session } from 'telegraf';
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

// Scenes
import subscriptionScene from './bot/scenes/subscription.js';
import paymentScene from './bot/scenes/payment.js';

// Middleware
import authMiddleware from './bot/middleware/auth.js';
import subscriptionMiddleware from './bot/middleware/subscription.js';

// Utils
import messageManager from './bot/utils/messageManager.js';
import navigation from './bot/utils/navigation.js';

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Setup scenes
const stage = new Stage([subscriptionScene, paymentScene]);

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
bot.command('settings', settingsHandler.showSettings);
bot.command('delete_account', settingsHandler.confirmDeleteAccount);
bot.command('help', startHandler.help);

// Bot actions - бизнес-логика
bot.action(/^subscribe_(.+)$/, subscriptionHandler.subscribe);
bot.action(/^unsubscribe_(.+)$/, subscriptionHandler.unsubscribe);
bot.action(/^pay_(.+)$/, paymentHandler.createInvoice);
bot.action(/^cancel_subscription_(.+)$/, subscriptionHandler.confirmCancelSubscription);
bot.action(/^confirm_cancel_(.+)$/, subscriptionHandler.cancelSubscriptionFinal);

// Navigation actions - все через централизованный роутер
const navActions = [
  'main_menu', 'back_to_main', 'categories', 'my_subscriptions', 'settings',
  'show_subscriptions', 'show_privacy', 'export_data', 
  'delete_account_confirm', 'delete_account_final'
];

navActions.forEach(action => {
  bot.action(action, navigation.middleware(action));
});

// Глобальный обработчик для неизвестных callback queries
bot.on('callback_query', async (ctx) => {
  // Если callback query не был обработан выше, обрабатываем здесь
  if (!ctx.callbackQuery.answered) {
    console.log(`❓ Unknown callback query: ${ctx.callbackQuery.data} from user ${ctx.from.id}`);
    
    try {
      await ctx.answerCbQuery('❌ Неизвестная команда');
      await messageManager.sendMessage(ctx, '❌ Неизвестная команда. Попробуйте /start');
    } catch (error) {
      console.error('Error handling unknown callback query:', error);
    }
  }
});


bot.on('pre_checkout_query', paymentHandler.preCheckout);
bot.on('successful_payment', paymentHandler.successfulPayment);


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
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Webhook URL: ${process.env.WEBHOOK_URL}/webhook`);
    
    schedulerService.setBot(bot);
    schedulerService.start();
  });
} else {
  bot.launch(() => {
    console.log('🤖 Bot started in polling mode');
    schedulerService.setBot(bot);
    schedulerService.start();
  });
  
  app.listen(PORT, () => {
    console.log(`🚀 Dev server running on port ${PORT}`);
  });
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 
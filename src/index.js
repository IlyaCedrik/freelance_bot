import 'dotenv/config';
import { Telegraf, Scenes, session } from 'telegraf';
const { Stage } = Scenes;
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Services
import supabase from './config/supabase.js';
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

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Setup scenes
const stage = new Stage([subscriptionScene, paymentScene]);

// Bot middleware
bot.use(session());
bot.use(stage.middleware());
bot.use(authMiddleware);

// Bot commands
bot.start(startHandler.startHandler);
bot.command('categories', subscriptionHandler.showCategories);
bot.command('settings', settingsHandler.showSettings);
bot.command('help', startHandler.help);

// Bot actions
bot.action(/^subscribe_(.+)$/, subscriptionHandler.subscribe);
bot.action(/^unsubscribe_(.+)$/, subscriptionHandler.unsubscribe);
bot.action(/^pay_(.+)$/, paymentHandler.createInvoice);
bot.action('categories', subscriptionHandler.showCategories);
bot.action('my_subscriptions', subscriptionHandler.mySubscriptions);
bot.action('settings', settingsHandler.showSettings);

// Payment handlers
bot.on('pre_checkout_query', paymentHandler.preCheckout);
bot.on('successful_payment', paymentHandler.successfulPayment);

// Express server for webhooks
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Webhook endpoint
app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  // Use webhooks in production
  bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Webhook URL: ${process.env.WEBHOOK_URL}/webhook`);
    
    // Start job scheduler
    schedulerService.setBot(bot);
    schedulerService.start();
  });
} else {
  // Use polling in development
  bot.launch(() => {
    console.log('🤖 Bot started in polling mode');
    schedulerService.setBot(bot);
    schedulerService.start();
  });
  
  app.listen(PORT, () => {
    console.log(`🚀 Dev server running on port ${PORT}`);
  });
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 
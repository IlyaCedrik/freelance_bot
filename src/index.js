import 'dotenv/config';
import { Telegraf, Scenes, session } from 'telegraf';
const { Stage } = Scenes;

// Configuration modules
import { setupBotCommands, setupErrorHandler } from './bot/config/botConfig.js';
import { setupNavigation, NAV_ACTIONS } from './bot/config/navigationConfig.js';
import {
  setupCommands,
  setupSubscriptionActions,
  setupReferralActions,
  setupPromoCodeActions,
  setupPromoRequestActions,
  setupAdminActions,
  setupPaymentHandlers,
  setupGlobalCallbackHandler
} from './bot/config/actionHandlers.js';

// Server module
import {
  createExpressApp,
  startProductionServer,
  startDevelopmentServer
} from './server/expressServer.js';

// Constants
import { SHUTDOWN_SIGNALS, REGEX_PATTERNS } from './config/constants.js';

// Services
import { supabase } from './config/supabase.js';
import schedulerService from './services/scheduler.js';
import notificationService from './services/notificationService.js';

// Handlers
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
import promoRequestScene from './bot/scenes/promoRequest.js';
import categoryPromoCodeScene from './bot/scenes/categoryPromoCode.js';

// Middleware
import authMiddleware from './bot/middleware/auth.js';

// Utils
import messageManager from './bot/utils/messageManager.js';
import navigation from './bot/utils/navigation.js';

/**
 * Создание и настройка бота
 */
function createBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);
  
  // Настройка сцен
  const stage = new Stage([subscriptionScene, paymentScene, promoCodeScene, promoRequestScene, categoryPromoCodeScene]);
  
  // Middleware
  bot.use(session());
  bot.use(stage.middleware());
  bot.use(authMiddleware);
  
  return bot;
}

/**
 * Настройка всех обработчиков бота
 */
function setupBotHandlers(bot) {
  // Группировка обработчиков
  const handlers = {
    startHandler,
    subscriptionHandler,
    paymentHandler,
    settingsHandler,
    referralHandler,
    profileHandler
  };

  const adminHandlers = {
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
  };

  // Настройка всех типов обработчиков
  setupCommands(bot, handlers);
  setupSubscriptionActions(bot, handlers);
  setupReferralActions(bot, handlers);
  setupPromoCodeActions(bot, messageManager);
  setupPromoRequestActions(bot, messageManager);
  setupAdminActions(bot, adminHandlers);
  setupPaymentHandlers(bot, paymentHandler);
  
  // Настройка навигации
  setupNavigation(navigation, handlers);
  
  // Навигационные действия
  NAV_ACTIONS.forEach(action => {
    bot.action(action, navigation.middleware(action));
  });
  
  // Обработка текстовых сообщений
  bot.on('text', handleAdminTextInput);
  
  // Глобальный обработчик callback queries
  setupGlobalCallbackHandler(bot, messageManager);
  
  // Обработчик ошибок
  setupErrorHandler(bot, messageManager);
}

/**
 * Основная функция инициализации приложения
 */
async function main() {
  try {
    const bot = createBot();
    notificationService.setBot(bot);
    
    setupBotHandlers(bot);
    
    const app = createExpressApp(bot, supabase, schedulerService);
    
    // Настройка обработчиков завершения
    SHUTDOWN_SIGNALS.forEach(signal => {
      process.once(signal, () => bot.stop(signal));
    });
    
    // Запуск сервера в зависимости от окружения
    if (process.env.NODE_ENV === 'production') {
      await startProductionServer(app, bot, schedulerService, setupBotCommands);
    } else {
      await startDevelopmentServer(app, bot, schedulerService, setupBotCommands);
    }
    
  } catch (error) {
    console.error('❌ Application startup error:', error);
    process.exit(1);
  }
}

main(); 
/**
 * Express сервер для обработки веб-хуков и API
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { DEFAULT_PORT, LOG_CONFIG } from '../config/constants.js';

/**
 * Создание и настройка Express приложения
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} supabase - Клиент Supabase
 * @param {Object} schedulerService - Сервис планировщика
 * @returns {express.Application} - Настроенное Express приложение
 */
export function createExpressApp(bot, supabase, schedulerService) {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Webhook endpoint
  app.post('/webhook', (req, res) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  });

  // Health check endpoint
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

  return app;
}

/**
 * Запуск сервера в продакшн режиме
 * @param {express.Application} app - Express приложение
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} schedulerService - Сервис планировщика
 * @param {Function} setupBotCommands - Функция настройки команд бота
 */
export async function startProductionServer(app, bot, schedulerService, setupBotCommands) {
  const PORT = process.env.PORT || DEFAULT_PORT;
  
  await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
  
  app.listen(PORT, async () => {
    console.log(LOG_CONFIG.STARTUP.SERVER_RUNNING(PORT));
    console.log(LOG_CONFIG.STARTUP.WEBHOOK_URL(process.env.WEBHOOK_URL));
    
    await setupBotCommands(bot);
    
    schedulerService.setBot(bot);
    schedulerService.start();
  });
}

/**
 * Запуск сервера в режиме разработки
 * @param {express.Application} app - Express приложение
 * @param {Telegraf} bot - Экземпляр бота
 * @param {Object} schedulerService - Сервис планировщика
 * @param {Function} setupBotCommands - Функция настройки команд бота
 */
export async function startDevelopmentServer(app, bot, schedulerService, setupBotCommands) {
  const PORT = process.env.PORT || DEFAULT_PORT;
  
  await bot.launch(async () => {
    console.log(LOG_CONFIG.STARTUP.BOT_POLLING);
    
    await setupBotCommands(bot);
    
    schedulerService.setBot(bot);
    schedulerService.start();
  });
  
  app.listen(PORT, () => {
    console.log(LOG_CONFIG.STARTUP.DEV_SERVER_RUNNING(PORT));
  });
} 
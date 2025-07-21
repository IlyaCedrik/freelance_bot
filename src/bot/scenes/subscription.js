import { Scenes } from 'telegraf';

const subscriptionScene = new Scenes.BaseScene('subscription');

subscriptionScene.enter(async (ctx) => {
  await ctx.reply('Добро пожаловать в процесс подписки!');
});

subscriptionScene.leave(async (ctx) => {
  await ctx.reply('Выход из процесса подписки');
});

export default subscriptionScene; 
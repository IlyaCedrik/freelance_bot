import { Scenes } from 'telegraf';

const paymentScene = new Scenes.BaseScene('payment');

paymentScene.enter(async (ctx) => {
  await ctx.reply('Добро пожаловать в процесс оплаты!');
});

paymentScene.leave(async (ctx) => {
  await ctx.reply('Выход из процесса оплаты');
});

export default paymentScene; 
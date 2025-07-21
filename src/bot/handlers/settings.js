import { Markup } from 'telegraf';

const showSettings = async (ctx) => {
  try {
    const settingsMessage = `
⚙️ Настройки

Здесь вы можете управлять своими настройками:
• Время уведомлений
• Языковые предпочтения
• Настройки конфиденциальности

🔧 Функция в разработке
    `;

    const settingsKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Назад', 'main_menu')]
    ]);

    await ctx.reply(settingsMessage, settingsKeyboard);
  } catch (error) {
    console.error('Settings error:', error);
    await ctx.reply('❌ Ошибка при загрузке настроек');
  }
};

export default {
  showSettings
}; 
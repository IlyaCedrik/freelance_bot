import { Markup } from 'telegraf';

export const categoriesKeyboard = (categories, subscribedCategoryIds = []) => {
  const buttons = categories.map(category => {
    const isSubscribed = subscribedCategoryIds.includes(category.id);
    const action = isSubscribed ? 'unsubscribe' : 'subscribe';
    const emoji = isSubscribed ? '❌' : '✅';
    const text = `${emoji} ${category.name}`;
    
    return [Markup.button.callback(text, `${action}_${category.id}`)];
  });

  buttons.push([Markup.button.callback('🔙 Назад', 'main_menu')]);

  return Markup.inlineKeyboard(buttons);
}; 
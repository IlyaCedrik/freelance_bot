import { Markup } from 'telegraf';

export const categoriesKeyboard = (categories, subscribedCategoryIds = []) => {
  const buttons = categories
    .filter(category => !subscribedCategoryIds.includes(category.id))
    .map(category => {
      return [Markup.button.callback(`✅ ${category.name}`, `subscribe_${category.id}`)];
    });

  buttons.push([Markup.button.callback('🔙 Назад', 'main_menu')]);

  return Markup.inlineKeyboard(buttons);
};
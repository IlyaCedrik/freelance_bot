import { Markup } from 'telegraf';

export const adminMainKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📺 Управление каналами', 'admin_channels'),
      Markup.button.callback('📝 Управление категориями', 'admin_categories')
    ],
    [
      Markup.button.callback('👥 Управление пользователями', 'admin_users'),
      Markup.button.callback('💰 Платежи', 'admin_payments')
    ],
    [
      Markup.button.callback('📊 Статистика', 'admin_stats'),
      Markup.button.callback('⚙️ Настройки', 'admin_settings')
    ],
    [
      Markup.button.callback('🔙 Назад в главное меню', 'main_menu')
    ]
  ]);
};

export const channelManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Добавить канал', 'admin_add_channel'),
      Markup.button.callback('📋 Список каналов', 'admin_list_channels')
    ],
    [
      Markup.button.callback('🔍 Поиск канала', 'admin_search_channel'),
      Markup.button.callback('🗑️ Удалить канал', 'admin_delete_channel')
    ],
    [
      Markup.button.callback('🔙 Назад', 'admin_main')
    ]
  ]);
};

export const categoryManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Добавить категорию', 'admin_add_category'),
      Markup.button.callback('📋 Список категорий', 'admin_list_categories')
    ],
    [
      Markup.button.callback('✏️ Редактировать категорию', 'admin_edit_category'),
      Markup.button.callback('🗑️ Удалить категорию', 'admin_delete_category')
    ],
    [
      Markup.button.callback('🔙 Назад', 'admin_main')
    ]
  ]);
};

export const userManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('👥 Список пользователей', 'admin_list_users'),
      Markup.button.callback('🔍 Поиск пользователя', 'admin_search_user')
    ],
    [
      Markup.button.callback('👑 Назначить админа', 'admin_make_admin'),
      Markup.button.callback('📊 Статистика пользователей', 'admin_user_stats')
    ],
    [
      Markup.button.callback('🔙 Назад', 'admin_main')
    ]
  ]);
};

export const channelActionKeyboard = (channelId) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Редактировать', `admin_edit_channel_${channelId}`),
      Markup.button.callback('🔄 Тест парсинга', `admin_test_channel_${channelId}`)
    ],
    [
      Markup.button.callback('⏸️ Деактивировать', `admin_deactivate_channel_${channelId}`),
      Markup.button.callback('🗑️ Удалить', `admin_confirm_delete_channel_${channelId}`)
    ],
    [
      Markup.button.callback('🔙 Назад к списку', 'admin_list_channels')
    ]
  ]);
};

export const confirmDeleteKeyboard = (type, id) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Да, удалить', `admin_confirm_delete_${type}_${id}`),
      Markup.button.callback('❌ Отмена', `admin_list_${type}s`)
    ]
  ]);
};

export const channelStatusKeyboard = (channels) => {
  const buttons = channels.map(channel => [
    Markup.button.callback(
      `${channel.is_active ? '✅' : '❌'} ${channel.name}`,
      `admin_channel_details_${channel.id}`
    )
  ]);
  
  buttons.push([Markup.button.callback('🔙 Назад', 'admin_channels')]);
  
  return Markup.inlineKeyboard(buttons);
};

export const categoryListKeyboard = (categories) => {
  const buttons = categories.map(category => [
    Markup.button.callback(
      `${category.is_active ?  '❌' : '✅'} ${category.name} (${category.price / 100}₽)`,
      `admin_category_details_${category.id}`
    )
  ]);
  
  buttons.push([Markup.button.callback('🔙 Назад', 'admin_categories')]);
  
  return Markup.inlineKeyboard(buttons);
};

export const backToAdminKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Назад в админ панель', 'admin_main')]
  ]);
}; 
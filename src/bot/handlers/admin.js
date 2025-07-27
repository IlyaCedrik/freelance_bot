import User from '../../database/models/User.js';
import Category from '../../database/models/Category.js';
import ParsingChannel from '../../database/models/ParsingChannel.js';
import { supabase } from '../../config/supabase.js';
import { 
  adminMainKeyboard, 
  channelManagementKeyboard,
  categoryManagementKeyboard,
  userManagementKeyboard,
  channelStatusKeyboard,
  categoryListKeyboard,
  channelActionKeyboard,
  confirmDeleteKeyboard,
  backToAdminKeyboard
} from '../keyboards/admin.js';

// Middleware для проверки прав админа
export const requireAdmin = async (ctx, next) => {
  try {
    const isAdmin = await User.isAdmin(ctx.from.id);
    
    if (!isAdmin) {
      await ctx.answerCbQuery('❌ У вас нет прав администратора');
      return;
    }
    
    await next();
  } catch (error) {
    console.error('Error checking admin permissions:', error);
    await ctx.answerCbQuery('❌ Ошибка проверки прав доступа');
  }
};

// Главное меню админа
export const showAdminPanel = async (ctx) => {
  try {
    const messageText = `
🔧 **Панель администратора**

Добро пожаловать в админ-панель! Здесь вы можете управлять всеми аспектами бота:

📺 **Управление каналами** - добавление и настройка каналов для парсинга
📝 **Управление категориями** - создание и редактирование категорий заказов
👥 **Управление пользователями** - просмотр пользователей и назначение ролей
💰 **Платежи** - просмотр и управление платежами
📊 **Статистика** - анализ работы бота
⚙️ **Настройки** - настройки системы

Выберите нужный раздел:
`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(messageText, {
        parse_mode: 'Markdown',
        reply_markup: adminMainKeyboard().reply_markup
      });
    } else {
      await ctx.reply(messageText, {
        parse_mode: 'Markdown',
        reply_markup: adminMainKeyboard().reply_markup
      });
    }
  } catch (error) {
    console.error('Error showing admin panel:', error);
    await ctx.reply('❌ Ошибка отображения админ-панели');
  }
};

// === УПРАВЛЕНИЕ КАНАЛАМИ ===

export const showChannelManagement = async (ctx) => {
  try {
    const messageText = `
📺 **Управление каналами парсинга**

Здесь вы можете управлять каналами, откуда бот парсит заказы:

➕ **Добавить канал** - подключить новый канал для парсинга
📋 **Список каналов** - просмотреть все подключенные каналы
🔍 **Поиск канала** - найти канал по имени или username
🗑️ **Удалить канал** - отключить канал от парсинга

Выберите действие:
`;

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: channelManagementKeyboard().reply_markup
    });
  } catch (error) {
    console.error('Error showing channel management:', error);
    await ctx.answerCbQuery('❌ Ошибка отображения управления каналами');
  }
};

export const listChannels = async (ctx) => {
  try {
    const channels = await ParsingChannel.getAll();
    
    if (channels.length === 0) {
      await ctx.editMessageText(`
📺 **Список каналов парсинга**

❌ Каналы для парсинга не найдены.

Используйте кнопку "Добавить канал" для подключения первого канала.
`, {
        parse_mode: 'Markdown',
        reply_markup: channelManagementKeyboard().reply_markup
      });
      return;
    }

    const messageText = `
📺 **Список каналов парсинга** (${channels.length})

Нажмите на канал для управления:
`;

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: channelStatusKeyboard(channels).reply_markup
    });
  } catch (error) {
    console.error('Error listing channels:', error);
    await ctx.answerCbQuery('❌ Ошибка получения списка каналов');
  }
};

export const showChannelDetails = async (ctx) => {
  try {
    const channelId = ctx.match[1];
    const channel = await ParsingChannel.findById(channelId);
    
    if (!channel) {
      await ctx.answerCbQuery('❌ Канал не найден');
      return;
    }

    const keywords = channel.keywords.join(', ') || 'Не установлены';
    const lastParsed = channel.last_parsed_at 
      ? new Date(channel.last_parsed_at).toLocaleString('ru-RU') 
      : 'Никогда';

    const messageText = `
📺 **Детали канала**

**Название:** ${channel.name}
**Username:** @${channel.username}
**Категория:** ${channel.categories.name}
**Статус:** ${channel.is_active ? '✅ Активен' : '❌ Неактивен'}
**Ключевые слова:** ${keywords}
**Последний парсинг:** ${lastParsed}
**Создан:** ${new Date(channel.created_at).toLocaleString('ru-RU')}

Выберите действие:
`;

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: channelActionKeyboard(channelId).reply_markup
    });
  } catch (error) {
    console.error('Error showing channel details:', error);
    await ctx.answerCbQuery('❌ Ошибка отображения деталей канала');
  }
};

export const startAddChannel = async (ctx) => {
  try {
    await ctx.editMessageText(`
➕ **Добавление нового канала**

Для добавления канала парсинга, отправьте данные в следующем формате:

\`\`\`
Название канала
@username_канала
категория_slug
ключевые,слова,через,запятую
\`\`\`

**Пример:**
\`\`\`
Freelance Jobs
@freelancejobs
web-development
сайт,веб,website,html,css,javascript
\`\`\`

Отправьте данные канала:
`, {
      parse_mode: 'Markdown',
      reply_markup: backToAdminKeyboard().reply_markup
    });

    // Устанавливаем состояние ожидания данных канала
    ctx.session = ctx.session || {};
    ctx.session.awaitingChannelData = true;
  } catch (error) {
    console.error('Error starting add channel:', error);
    await ctx.answerCbQuery('❌ Ошибка начала добавления канала');
  }
};

// === УПРАВЛЕНИЕ КАТЕГОРИЯМИ ===

export const showCategoryManagement = async (ctx) => {
  try {
    const messageText = `
📝 **Управление категориями**

Управление категориями заказов:

➕ **Добавить категорию** - создать новую категорию
📋 **Список категорий** - просмотреть все категории
✏️ **Редактировать категорию** - изменить существующую категорию
🗑️ **Удалить категорию** - удалить категорию

Выберите действие:
`;

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: categoryManagementKeyboard().reply_markup
    });
  } catch (error) {
    console.error('Error showing category management:', error);
    await ctx.answerCbQuery('❌ Ошибка отображения управления категориями');
  }
};

export const listCategories = async (ctx) => {
  try {
    const categories = await Category.getAll();
    
    if (categories.length === 0) {
      await ctx.editMessageText(`
📝 **Список категорий**

❌ Категории не найдены.

Используйте кнопку "Добавить категорию" для создания первой категории.
`, {
        parse_mode: 'Markdown',
        reply_markup: categoryManagementKeyboard().reply_markup
      });
      return;
    }

    const messageText = `
📝 **Список категорий** (${categories.length})

Нажмите на категорию для управления:
`;

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: categoryListKeyboard(categories).reply_markup
    });
  } catch (error) {
    console.error('Error listing categories:', error);
    await ctx.answerCbQuery('❌ Ошибка получения списка категорий');
  }
};

// === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ===

export const showUserManagement = async (ctx) => {
  try {
    const messageText = `
👥 **Управление пользователями**

Управление пользователями и ролями:

👥 **Список пользователей** - просмотреть всех пользователей
🔍 **Поиск пользователя** - найти пользователя по username или ID
👑 **Назначить админа** - назначить пользователя администратором
📊 **Статистика пользователей** - статистика активности

Выберите действие:
`;

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: userManagementKeyboard().reply_markup
    });
  } catch (error) {
    console.error('Error showing user management:', error);
    await ctx.answerCbQuery('❌ Ошибка отображения управления пользователями');
  }
};

export const startMakeAdmin = async (ctx) => {
  try {
    await ctx.editMessageText(`
👑 **Назначение администратора**

Отправьте Telegram ID или @username пользователя, которого хотите назначить администратором.

**Примеры:**
- \`123456789\` (Telegram ID)
- \`@username\` (с символом @)

**Как получить Telegram ID:**
1. Попросите пользователя написать боту @userinfobot
2. Или найдите ID в списке пользователей

Отправьте ID или username:
`, {
      parse_mode: 'Markdown',
      reply_markup: backToAdminKeyboard().reply_markup
    });

    // Устанавливаем состояние ожидания данных пользователя
    ctx.session = ctx.session || {};
    ctx.session.awaitingUserToMakeAdmin = true;
  } catch (error) {
    console.error('Error starting make admin:', error);
    await ctx.answerCbQuery('❌ Ошибка начала назначения админа');
  }
};

export const listUsers = async (ctx) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('telegram_id, username, first_name, last_name, role, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (users.length === 0) {
      await ctx.editMessageText(`
👥 **Список пользователей**

❌ Пользователи не найдены.
`, {
        parse_mode: 'Markdown',
        reply_markup: userManagementKeyboard().reply_markup
      });
      return;
    }

    let messageText = `👥 **Список пользователей** (последние 20)\n\n`;
    
    users.forEach((user, index) => {
      const roleEmoji = user.role === 'admin' ? '👑' : user.role === 'moderator' ? '🛡️' : '👤';
      const statusEmoji = user.is_active ? '✅' : '❌';
      const name = user.first_name || user.username || 'Без имени';
      const username = user.username ? `@${user.username}` : '';
      
      messageText += `${index + 1}. ${roleEmoji} ${statusEmoji} **${name}** ${username}\n`;
      messageText += `   ID: \`${user.telegram_id}\`\n`;
      messageText += `   Роль: ${user.role}\n\n`;
    });

    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: userManagementKeyboard().reply_markup
    });
  } catch (error) {
    console.error('Error listing users:', error);
    await ctx.answerCbQuery('❌ Ошибка получения списка пользователей');
  }
};

// Обработка текстовых сообщений для админ-функций
export const handleAdminTextInput = async (ctx, next) => {
  // Обработка добавления каналов
  if (ctx.session?.awaitingChannelData) {
    return handleChannelData(ctx);
  }
  
  // Обработка назначения админа
  if (ctx.session?.awaitingUserToMakeAdmin) {
    return handleMakeAdminData(ctx);
  }
  
  // Если не админ-функция, передаем дальше
  return next();
};

// Обработка данных для назначения админа
const handleMakeAdminData = async (ctx) => {
  try {
    const input = ctx.message.text.trim();
    let targetUser = null;

    // Определяем, что передано - ID или username
    if (input.startsWith('@')) {
      // Username
      const username = input.substring(1);
      targetUser = await User.findByUsername(username);
      
      if (!targetUser) {
        await ctx.reply(`❌ Пользователь с username "@${username}" не найден.`, {
          reply_markup: backToAdminKeyboard().reply_markup
        });
        return;
      }
    } else if (/^\d+$/.test(input)) {
      // Telegram ID
      const telegramId = parseInt(input);
      targetUser = await User.findByTelegramId(telegramId);
      
      if (!targetUser) {
        await ctx.reply(`❌ Пользователь с ID "${telegramId}" не найден.`, {
          reply_markup: backToAdminKeyboard().reply_markup
        });
        return;
      }
    } else {
      await ctx.reply(`❌ Неверный формат. Отправьте Telegram ID (числа) или @username.`, {
        reply_markup: backToAdminKeyboard().reply_markup
      });
      return;
    }

    // Проверяем, не является ли пользователь уже админом
    if (targetUser.role === 'admin') {
      await ctx.reply(`ℹ️ Пользователь уже является администратором.`, {
        reply_markup: backToAdminKeyboard().reply_markup
      });
      ctx.session.awaitingUserToMakeAdmin = false;
      return;
    }

    // Назначаем роль админа
    await User.setUserRole(targetUser.telegram_id, 'admin');

    const userName = targetUser.first_name || targetUser.username || `ID: ${targetUser.telegram_id}`;
    
    await ctx.reply(`✅ **Пользователь назначен администратором!**

👑 **${userName}** теперь имеет права администратора.

Пользователь получит доступ к админ-панели при следующем обращении к боту.
`, {
      parse_mode: 'Markdown',
      reply_markup: backToAdminKeyboard().reply_markup
    });

    // Сбрасываем состояние
    ctx.session.awaitingUserToMakeAdmin = false;

  } catch (error) {
    console.error('Error making user admin:', error);
    await ctx.reply('❌ Ошибка при назначении администратора. Попробуйте еще раз.', {
      reply_markup: backToAdminKeyboard().reply_markup
    });
    ctx.session.awaitingUserToMakeAdmin = false;
  }
};

// Обработка текстовых сообщений для добавления каналов
const handleChannelData = async (ctx) => {
  if (!ctx.session?.awaitingChannelData) {
    return;
  }

  try {
    const lines = ctx.message.text.trim().split('\n');
    
    if (lines.length !== 4) {
      await ctx.reply(`
❌ **Неверный формат данных**

Ожидается 4 строки:
1. Название канала
2. @username канала
3. Slug категории
4. Ключевые слова через запятую

Попробуйте еще раз:
`, {
        parse_mode: 'Markdown',
        reply_markup: backToAdminKeyboard().reply_markup
      });
      return;
    }

    const [name, usernameWithAt, categorySlug, keywordsStr] = lines;
    const username = usernameWithAt.replace('@', '');
    const keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k);

    // Проверяем существование категории
    const category = await Category.findBySlug(categorySlug);
    if (!category) {
      await ctx.reply(`❌ Категория с slug "${categorySlug}" не найдена. Доступные категории можно посмотреть в разделе "Управление категориями".`, {
        reply_markup: backToAdminKeyboard().reply_markup
      });
      return;
    }

    // Проверяем, не существует ли уже канал с таким username
    const existingChannel = await ParsingChannel.findByUsername(username);
    if (existingChannel) {
      await ctx.reply(`❌ Канал с username "@${username}" уже существует.`, {
        reply_markup: backToAdminKeyboard().reply_markup
      });
      return;
    }

    // Создаем канал
    const channelData = {
      category_id: category.id,
      name: name.trim(),
      username: username,
      keywords: keywords,
      is_active: true
    };

    const newChannel = await ParsingChannel.create(channelData);

    await ctx.reply(`
✅ **Канал успешно добавлен!**

**Название:** ${newChannel.name}
**Username:** @${newChannel.username}
**Категория:** ${newChannel.categories.name}
**Ключевые слова:** ${keywords.join(', ')}

Канал активен и готов к парсингу.
`, {
      parse_mode: 'Markdown',
      reply_markup: backToAdminKeyboard().reply_markup
    });

    // Сбрасываем состояние
    ctx.session.awaitingChannelData = false;

  } catch (error) {
    console.error('Error adding channel:', error);
    await ctx.reply('❌ Ошибка при добавлении канала. Попробуйте еще раз.', {
      reply_markup: backToAdminKeyboard().reply_markup
    });
    ctx.session.awaitingChannelData = false;
  }
}; 
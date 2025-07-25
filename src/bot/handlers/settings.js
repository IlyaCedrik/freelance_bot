import User from '../../database/models/User.js';
import Subscription from '../../database/models/Subscription.js';
import { supabase } from '../../config/supabase.js';
import { Markup } from 'telegraf';
import messageManager from '../utils/messageManager.js';

const showSettings = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    
    if (!user) {
      return messageManager.sendMessage(ctx, '❌ Пользователь не найден. Используйте /start');
    }

    const subscriptions = await Subscription.getUserSubscriptions(user.id);
    
    const settingsMessage = `
⚙️ **Настройки аккаунта**

👤 **Ваш профиль:**
• ID: ${user.telegram_id}
• Имя: ${user.first_name} ${user.last_name || ''}
• Username: @${user.username || 'не указан'}
• Язык: ${user.language_code}
• Подписок: ${subscriptions.length}

📱 **Доступные действия:**
    `;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📊 Мои подписки', 'show_subscriptions')],
      [Markup.button.callback('🔒 Политика конфиденциальности', 'show_privacy')],
      [Markup.button.callback('📤 Экспорт данных', 'export_data')],
      [Markup.button.callback('🗑 Удалить аккаунт', 'delete_account_confirm')],
      [Markup.button.callback('↩️ Назад', 'back_to_main')]
    ]);

    // Проверяем, является ли это callback query (нажатие кнопки)
    if (ctx.callbackQuery) {
      // Если это callback, используем editMessage
      await messageManager.editMessage(ctx, settingsMessage, keyboard);
    } else {
      // Если это команда, используем sendMessage
      await messageManager.sendMessage(ctx, settingsMessage, keyboard);
    }
  } catch (error) {
    console.error('Settings error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке настроек');
  }
};

const confirmDeleteAccount = async (ctx) => {
  const confirmMessage = `
⚠️ **ВНИМАНИЕ!**

Вы собираетесь удалить свой аккаунт. Это действие:
• ❌ **Удалит все ваши данные** (профиль, подписки, историю платежей)
• ❌ **Отменит все активные подписки**
• ❌ **Нельзя будет отменить**

💰 **Возврат средств за подписки НЕ предусмотрен**

Вы действительно хотите продолжить?
  `;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Да, удалить аккаунт', 'delete_account_final')],
    [Markup.button.callback('❌ Отмена', 'settings')]
  ]);

  await messageManager.editMessage(ctx, confirmMessage, keyboard);
};

const deleteAccount = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    
    if (!user) {
      return messageManager.sendMessage(ctx, '❌ Пользователь не найден');
    }

    // Удаляем все данные пользователя (каскадное удаление через внешние ключи)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('telegram_id', ctx.from.id);

    if (error) throw error;

    const farewellMessage = `
✅ **Аккаунт успешно удален**

Все ваши данные были полностью удалены:
• ❌ Профиль пользователя
• ❌ Все подписки
• ❌ История платежей
• ❌ История уведомлений

Спасибо за использование нашего сервиса! 
Если решите вернуться - используйте /start

*Этот чат больше не отслеживается ботом.*
    `;

    await messageManager.editMessage(ctx, farewellMessage);
    
    console.log(`User account deleted: ${ctx.from.id}`);
  } catch (error) {
    console.error('Delete account error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при удалении аккаунта. Обратитесь в поддержку.');
  }
};

const exportUserData = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    
    if (!user) {
      return messageManager.sendMessage(ctx, '❌ Пользователь не найден');
    }

    // Получаем все данные пользователя
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', ctx.from.id)
      .single();

    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        categories(name)
      `)
      .eq('user_id', user.id);

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id);

    if (userError || subsError || paymentsError) {
      throw userError || subsError || paymentsError;
    }

    const exportData = {
      profile: {
        telegram_id: userData.telegram_id,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        language_code: userData.language_code,
        created_at: userData.created_at,
        last_activity: userData.last_activity
      },
      subscriptions: subscriptions.map(sub => ({
        category: sub.categories.name,
        is_active: sub.is_active,
        expires_at: sub.expires_at,
        created_at: sub.created_at
      })),
      payments: payments.map(payment => ({
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        created_at: payment.created_at,
        completed_at: payment.completed_at
      }))
    };

    const exportMessage = `
📊 **Экспорт ваших данных**

**Профиль:**
• ID: ${exportData.profile.telegram_id}
• Имя: ${exportData.profile.first_name} ${exportData.profile.last_name || ''}
• Username: @${exportData.profile.username || 'не указан'}
• Регистрация: ${new Date(exportData.profile.created_at).toLocaleDateString('ru-RU')}
• Последняя активность: ${new Date(exportData.profile.last_activity).toLocaleDateString('ru-RU')}

**Подписки:** ${exportData.subscriptions.length}
${exportData.subscriptions.map(sub => 
  `• ${sub.category} (${sub.is_active ? 'активна' : 'неактивна'})`
).join('\n')}

**Платежи:** ${exportData.payments.length}
${exportData.payments.map(payment => 
  `• ${payment.amount/100}₽ - ${payment.status} (${new Date(payment.created_at).toLocaleDateString('ru-RU')})`
).join('\n')}

📋 Полный экспорт данных в формате JSON отправлен в личные сообщения.
    `;

    // Отправляем JSON файл
    await ctx.replyWithDocument({
      source: Buffer.from(JSON.stringify(exportData, null, 2)),
      filename: `user_data_export_${ctx.from.id}_${new Date().toISOString().split('T')[0]}.json`
    });

    await messageManager.sendMessage(ctx, exportMessage);

  } catch (error) {
    console.error('Export data error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при экспорте данных');
  }
};

const showPrivacyPolicy = async (ctx) => {
  const privacyMessage = `
🔒 **Политика конфиденциальности**

Данный бот является независимым сервисом и НЕ связан с администрацией Telegram.

📋 **Мы собираем:**
• Базовые данные профиля (имя, username)
• Данные о подписках на категории
• Информацию о платежах (БЕЗ банковских карт)

🛡️ **Безопасность:**
• Данные банковских карт НЕ попадают на наши серверы
• Платежи обрабатываются через Telegram Payments
• Данные хранятся в защищенной базе Supabase

📖 Полная политика: [ссылка на PRIVACY_POLICY.md]
  `;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('↩️ Назад', 'settings')]
  ]);

  await messageManager.editMessage(ctx, privacyMessage, keyboard);
};

export default {
  showSettings,
  confirmDeleteAccount,
  deleteAccount,
  exportUserData,
  showPrivacyPolicy
}; 
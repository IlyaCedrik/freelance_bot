import { Markup } from 'telegraf';
import Referral from '../../database/models/Referral.js';
import User from '../../database/models/User.js';
import { supabase } from '../../config/supabase.js';
import messageManager from '../utils/messageManager.js';
import { referralKeyboard, referralDetailsKeyboard, withdrawKeyboard } from '../keyboards/referral.js';

const showReferralProgram = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    if (!user) {
      return messageManager.sendMessage(ctx, '❌ Пользователь не найден');
    }

    // Генерируем реферальный код, если его нет
    if (!user.referral_code) {
      await Referral.generateReferralCode(user.id);
      const updatedUser = await User.findByTelegramId(ctx.from.id);
      user.referral_code = updatedUser.referral_code;
    }

    const stats = await Referral.getReferralStats(user.id);
    const referralLink = `https://t.me/${ctx.botInfo.username}?start=${user.referral_code}`;
    
    const message = `
💵 Реферальная система

💰 Ваш баланс: ${(user.referral_balance / 100).toFixed(0)}₽
👥 Всего рефералов: ${stats.total_referrals}
✅ Активных рефералов: ${stats.active_referrals}
🎯 Активаций: ${stats.total_activations}
💳 Оплат: ${stats.total_payments}
💸 Сумма оплат: ${(stats.total_payment_amount / 100).toFixed(0)}₽
📈 Текущий процент: ${stats.current_commission_percent}%

🔗 Ваша реферальная ссылка:
\`${referralLink}\`

📝 Условия:
• Базовый процент: 10%
• Для повышения до 50% нужно 15+ активных рефералов
• Начисления происходят с каждой оплаты реферала
• Минимальная сумма для вывода: 500₽

${stats.active_referrals >= 15 ? '🎉 Поздравляем! У вас максимальный процент 50%!' : 
  `🎯 До 50% осталось ${15 - stats.active_referrals} активных рефералов`}
    `;

    if (ctx.callbackQuery) {
      await messageManager.editMessage(ctx, message, referralKeyboard, { parse_mode: 'Markdown' });
    } else {
      await messageManager.sendMessage(ctx, message, referralKeyboard, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Referral program error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке реферальной программы');
  }
};

const refreshReferralStats = async (ctx) => {
  try {
    await ctx.answerCbQuery('🔄 Статистика обновлена');
    await showReferralProgram(ctx);
  } catch (error) {
    console.error('Refresh referral stats error:', error);
    await ctx.answerCbQuery('❌ Ошибка при обновлении');
  }
};

const showReferralDetails = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    const referrals = await Referral.getUserReferrals(user.id, 10);
    const commissions = await Referral.getCommissionHistory(user.id, 10);
    
    let referralsList = '';
    if (referrals.length > 0) {
      referralsList = referrals.map((ref, index) => {
        const name = ref.first_name || ref.username || 'Пользователь';
        const activeSubscriptions = ref.subscriptions.filter(s => s.is_active).length;
        return `${index + 1}. ${name} (${activeSubscriptions} подписок)`;
      }).join('\n');
    } else {
      referralsList = 'Пока нет рефералов';
    }

    let commissionsText = '';
    if (commissions.length > 0) {
      commissionsText = commissions.slice(0, 5).map((comm, index) => {
        const amount = (comm.commission_amount / 100).toFixed(0);
        const date = new Date(comm.created_at).toLocaleDateString('ru-RU');
        return `${index + 1}. +${amount}₽ (${date})`;
      }).join('\n');
    } else {
      commissionsText = 'Пока нет комиссий';
    }

    const message = `
📊 Детальная статистика

👥 Последние рефералы:
${referralsList}

💰 Последние комиссии:
${commissionsText}

Для полного списка используйте кнопки ниже.
    `;

    await messageManager.editMessage(ctx, message, referralDetailsKeyboard);
  } catch (error) {
    console.error('Referral details error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке детальной статистики');
  }
};

const showWithdrawOptions = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    const balance = user.referral_balance / 100;
    
    if (balance < 500) {
      await ctx.answerCbQuery('❌ Минимальная сумма для вывода: 500₽');
      return;
    }

    const message = `
💰 Вывод средств

💵 Доступно для вывода: ${balance.toFixed(0)}₽

Выберите способ вывода:
    `;

    await messageManager.editMessage(ctx, message, withdrawKeyboard);
  } catch (error) {
    console.error('Withdraw options error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке вариантов вывода');
  }
};

const initiateWithdraw = async (ctx, method) => {
  try {
    await ctx.answerCbQuery(`💳 Инициирован вывод через ${method}`);
    
    const message = `
💰 Заявка на вывод

Способ: ${method}

Для обработки заявки на вывод средств обратитесь в поддержку: @your_support_username

Укажите:
• Ваш Telegram ID: ${ctx.from.id}
• Сумму для вывода
• Реквизиты для перевода

⏱ Заявки обрабатываются в течение 24 часов.
    `;

    await messageManager.editMessage(ctx, message, withdrawKeyboard);
  } catch (error) {
    console.error('Initiate withdraw error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при инициации вывода');
  }
};

const createPromoCode = async (ctx) => {
  try {
    await ctx.answerCbQuery('🎫 Запускаю создание промокода...');
    await ctx.scene.enter('CREATE_PROMO_CODE');
  } catch (error) {
    console.error('Create promo code error:', error);
    await ctx.answerCbQuery('❌ Ошибка при создании промокода');
  }
};

const showUserPromoCodes = async (ctx) => {
  try {
    const user = await User.findByTelegramId(ctx.from.id);
    
    // Получаем промокоды пользователя
    const { data: promoCodes, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'promo')
      .order('created_at', { ascending: false });

    if (error) throw error;

    let message = '🎫 Ваши промокоды\n\n';
    
    if (promoCodes.length === 0) {
      message += 'У вас пока нет созданных промокодов.\n\n📝 Создайте первый промокод, чтобы привлекать больше пользователей!';
    } else {
      promoCodes.forEach((promo, index) => {
        const createdDate = new Date(promo.created_at).toLocaleDateString('ru-RU');
        message += `${index + 1}. 🎫 \`${promo.code}\`\n`;
        message += `   📅 Дни: ${promo.bonus_days} | 💰 Скидка: ${promo.discount_percent}%\n`;
        message += `   🔢 Использований: ${promo.usage_count}${promo.usage_limit ? `/${promo.usage_limit}` : ''}\n`;
        message += `   📅 Создан: ${createdDate}\n`;
        message += `   ${promo.is_active ? '✅ Активен' : '❌ Отключен'}\n\n`;
      });
    }

    await messageManager.editMessage(
      ctx,
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('🎫 Создать новый', 'create_promo_code')],
        [Markup.button.callback('⬅️ Назад', 'referral_program')]
      ]),
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Show user promo codes error:', error);
    await messageManager.sendMessage(ctx, '❌ Ошибка при загрузке промокодов');
  }
};

export default {
  showReferralProgram,
  refreshReferralStats,
  showReferralDetails,
  showWithdrawOptions,
  initiateWithdraw,
  createPromoCode,
  showUserPromoCodes
}; 
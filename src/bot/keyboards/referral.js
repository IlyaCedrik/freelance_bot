import { Markup } from 'telegraf';

export const referralKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🔄 Обновить статистику', 'referral_refresh')],
  [Markup.button.callback('💰 Вывести средства', 'referral_withdraw')],
  [Markup.button.callback('📊 Детальная статистика', 'referral_details')],
  [Markup.button.callback('🎫 Создать промокод', 'create_promo_code')],
  [Markup.button.callback('⬅️ Назад в профиль', 'profile')]
]);

export const referralDetailsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('👥 Мои рефералы', 'referral_list')],
  [Markup.button.callback('💳 История комиссий', 'commission_history')],
  [Markup.button.callback('🎫 Мои промокоды', 'show_user_promo_codes')],
  [Markup.button.callback('⬅️ Назад', 'referral_program')]
]);

export const withdrawKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('💳 На карту', 'withdraw_card')],
  [Markup.button.callback('🥝 QIWI', 'withdraw_qiwi')],
  [Markup.button.callback('⬅️ Отмена', 'referral_program')]
]); 
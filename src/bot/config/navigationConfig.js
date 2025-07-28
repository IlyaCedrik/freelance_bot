/**
 * Конфигурация навигации бота
 */
import { LOG_CONFIG } from '../../config/constants.js';

/**
 * Список всех навигационных действий
 */
export const NAV_ACTIONS = [
  'main_menu', 'back_to_main', 'categories', 'my_subscriptions', 'settings', 'profile',
  'show_subscriptions', 'show_privacy', 'export_data', 
  'delete_account_confirm', 'delete_account_final',
  'referral_program', 'referral_refresh', 'referral_details', 'referral_withdraw',
  'create_promo_code', 'show_user_promo_codes', 'show_user_promo_requests', 'user_stats'
];

/**
 * Настройка навигационных маршрутов
 * @param {Object} navigation - Объект навигации
 * @param {Object} handlers - Объект с обработчиками
 */
export function setupNavigation(navigation, handlers) {
  const {
    startHandler,
    subscriptionHandler,
    settingsHandler,
    profileHandler,
    referralHandler
  } = handlers;

  // Главные экраны
  navigation.register('main_menu', startHandler.startHandler);
  navigation.register('back_to_main', startHandler.startHandler);
  navigation.register('categories', subscriptionHandler.showCategories);
  navigation.register('my_subscriptions', subscriptionHandler.mySubscriptions);
  navigation.register('settings', settingsHandler.showSettings);
  navigation.register('profile', profileHandler.showProfile);
  
  // Реферальная система
  navigation.register('referral_program', referralHandler.showReferralProgram);
  navigation.register('referral_refresh', referralHandler.refreshReferralStats);
  navigation.register('referral_details', referralHandler.showReferralDetails);
  navigation.register('referral_withdraw', referralHandler.showWithdrawOptions);
  navigation.register('create_promo_code', referralHandler.createPromoCode);
  navigation.register('show_user_promo_codes', referralHandler.showUserPromoCodes);
  navigation.register('show_user_promo_requests', referralHandler.showUserPromoRequests);
  
  // Профиль
  navigation.register('user_stats', profileHandler.showUserStats);
  
  // Дополнительные экраны
  navigation.register('show_subscriptions', subscriptionHandler.mySubscriptions);
  navigation.register('show_privacy', settingsHandler.showPrivacyPolicy);
  navigation.register('export_data', settingsHandler.exportUserData);
  navigation.register('delete_account_confirm', settingsHandler.confirmDeleteAccount);
  navigation.register('delete_account_final', settingsHandler.deleteAccount);
  
  console.log(LOG_CONFIG.STARTUP.NAVIGATION_REGISTERED(navigation.getRoutes().length));
} 
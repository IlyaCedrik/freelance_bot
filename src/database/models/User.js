import { supabase } from '../../config/supabase.js';

class User {
  static async findByTelegramId(telegramId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  static async create(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        telegram_id: userData.telegramId,
        username: userData.username,
        first_name: userData.firstName,
        last_name: userData.lastName,
        language_code: userData.languageCode || 'ru'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateActivity(telegramId) {
    const { error } = await supabase
      .from('users')
      .update({ 
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegramId);

    if (error) throw error;
  }

  static async isAdmin(telegramId) {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('telegram_id', telegramId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.role === 'admin';
  }

  static async getUserRole(telegramId) {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('telegram_id', telegramId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.role || 'user';
  }

  static async setUserRole(telegramId, role) {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('telegram_id', telegramId);

    if (error) throw error;
  }

  static async updateEmail(telegramId, email) {
    const { error } = await supabase
      .from('users')
      .update({ 
        email,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegramId);

    if (error) throw error;
  }

  static async getAllAdmins() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (error) throw error;
    return data;
  }

  static async getActiveSubscribers() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        subscriptions!inner(
          *,
          categories(*)
        )
      `)
      .eq('is_active', true)
      .eq('subscriptions.is_active', true)
      .gte('subscriptions.expires_at', new Date().toISOString());

    if (error) throw error;
    return data;
  }

  // Проверка и создание недостающих данных реферальной системы
  static async ensureReferralDataExists(userId) {
    try {
      const user = await this.findByTelegramId(userId);
      if (!user) return;

      let needsUpdate = false;
      const updates = {};

      // Проверяем наличие реферального кода
      if (!user.referral_code) {
        const { default: Referral } = await import('./Referral.js');
        updates.referral_code = await Referral.generateReferralCode(user.id);
        needsUpdate = true;
      }

      // Проверяем инициализацию полей
      if (user.referral_balance === null || user.referral_balance === undefined) {
        updates.referral_balance = 0;
        needsUpdate = true;
      }

      if (user.active_referrals_count === null || user.active_referrals_count === undefined) {
        updates.active_referrals_count = 0;
        needsUpdate = true;
      }

      // Обновляем пользователя если нужно
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        if (updateError) throw updateError;
        console.log(`✅ Автоматически обновлены данные реферальной системы для пользователя ${userId}`);
      }

      // Проверяем наличие статистики
      const { data: stats, error: statsError } = await supabase
        .from('referral_stats')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (statsError && statsError.code === 'PGRST116') {
        // Создаем статистику если не существует
        const { error: createStatsError } = await supabase
          .from('referral_stats')
          .insert([{
            user_id: user.id,
            total_referrals: 0,
            active_referrals: 0,
            total_activations: 0,
            total_payments: 0,
            total_payment_amount: 0,
            total_commission_earned: 0,
            current_commission_percent: 10.00
          }]);

        if (createStatsError && createStatsError.code !== '23505') {
          throw createStatsError;
        }
        console.log(`✅ Автоматически создана статистика реферальной системы для пользователя ${userId}`);
      }

    } catch (error) {
      console.error(`❌ Ошибка при проверке данных реферальной системы для пользователя ${userId}:`, error);
      // Не прерываем основную работу из-за ошибок в реферальной системе
    }
  }
}

export default User; 
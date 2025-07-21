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
}

export default User; 
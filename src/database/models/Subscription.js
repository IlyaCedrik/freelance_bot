import { supabase } from '../../config/supabase.js';

class Subscription {
  static async getUserSubscriptions(userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        categories(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  }

  static async create(userId, categoryId, expiresAt) {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert([{
        user_id: userId,
        category_id: categoryId,
        is_active: true,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deactivate(userId, categoryId) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('category_id', categoryId);

    if (error) throw error;
  }

  static async isUserSubscribed(userId, categoryId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }
}

export default Subscription; 
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

  static async create(userId, categoryId, expiresAt, isTrial = false) {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert([{
        user_id: userId,
        category_id: categoryId,
        is_active: true,
        expires_at: expiresAt,
        is_trial: isTrial
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

  // Проверить, использовал ли пользователь пробный период для категории
  static async hasUserUsedTrial(userId, categoryId) {
    const { data, error } = await supabase
      .from('users')
      .select('used_trial_categories')
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    const usedTrials = data?.used_trial_categories || [];
    return usedTrials.includes(categoryId);
  }

  // Создать пробную подписку
  static async createTrialSubscription(userId, categoryId) {
    // Проверяем, использовал ли пользователь уже пробный период
    const hasUsedTrial = await this.hasUserUsedTrial(userId, categoryId);
    if (hasUsedTrial) {
      throw new Error('Пользователь уже использовал пробный период для этой категории');
    }

    // Создаем пробную подписку на 1 день
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const subscription = await this.create(userId, categoryId, expiresAt.toISOString(), true);

    // Добавляем категорию в список использованных пробных периодов
    const { error: updateError } = await supabase.rpc('add_used_trial_category', {
      user_id: userId,
      category_id: categoryId
    });

    if (updateError) {
      // Если RPC функция не существует, обновляем напрямую
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('used_trial_categories')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const usedTrials = userData?.used_trial_categories || [];
      usedTrials.push(categoryId);

      const { error: directUpdateError } = await supabase
        .from('users')
        .update({ used_trial_categories: usedTrials })
        .eq('id', userId);

      if (directUpdateError) throw directUpdateError;
    }

    return subscription;
  }
}

export default Subscription; 
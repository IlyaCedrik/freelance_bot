import { supabase } from '../../config/supabase.js';

class Referral {
  // Генерация уникального реферального кода
  static async generateReferralCode(userId) {
    let attempts = 0;
    let code;
    
    do {
      code = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      attempts++;
      
      // Проверяем уникальность кода
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', code)
        .single();
      
      if (!existing) {
        break;
      }
    } while (attempts < 10);
    
    if (attempts >= 10) {
      throw new Error('Не удалось сгенерировать уникальный реферальный код');
    }
    
    const { data, error } = await supabase
      .from('users')
      .update({ referral_code: code })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return code;
  }

  // Создание промокода
  static async createPromoCode(userId, codeData) {
    const { data, error } = await supabase
      .from('referral_codes')
      .insert([{
        user_id: userId,
        code: codeData.code.toUpperCase(),
        type: 'promo',
        bonus_days: codeData.bonusDays || 0,
        discount_percent: codeData.discountPercent || 0,
        usage_limit: codeData.usageLimit
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Применение реферального кода/промокода при регистрации
  static async applyReferralCode(code, newUserId) {
    const upperCode = code.toUpperCase();
    
    // Проверяем код в таблице users (реферальные ссылки)
    const { data: referrer } = await supabase
      .from('users')
      .select('id, referral_code')
      .eq('referral_code', upperCode)
      .single();

    if (referrer && referrer.id !== newUserId) {
      // Устанавливаем реферера
      const { error } = await supabase
        .from('users')
        .update({ referrer_id: referrer.id })
        .eq('id', newUserId);
      
      if (error) throw error;
      
      await this.updateReferralStats(referrer.id, 'new_referral');
      return { type: 'referral', referrerId: referrer.id };
    }

    // Проверяем промокоды
    const { data: promoCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', upperCode)
      .eq('type', 'promo')
      .eq('is_active', true)
      .single();

    if (promoCode && (promoCode.usage_limit === null || promoCode.usage_count < promoCode.usage_limit)) {
      // Увеличиваем счетчик использований
      await supabase
        .from('referral_codes')
        .update({ usage_count: promoCode.usage_count + 1 })
        .eq('id', promoCode.id);
      
      // Если есть реферер у промокода, устанавливаем связь
      if (promoCode.user_id) {
        await supabase
          .from('users')
          .update({ referrer_id: promoCode.user_id })
          .eq('id', newUserId);
        
        await this.updateReferralStats(promoCode.user_id, 'new_referral');
        
        // Уведомляем создателя промокода об использовании
        await this.notifyPromoCodeUsage(promoCode, newUserId);
      }
      
      return { 
        type: 'promo', 
        bonusDays: promoCode.bonus_days,
        discountPercent: promoCode.discount_percent,
        referrerId: promoCode.user_id
      };
    }

    return null;
  }

  // Начисление комиссии
  static async addCommission(referrerId, referredUserId, paymentId, paymentAmount) {
    const stats = await this.getReferralStats(referrerId);
    const commissionPercent = stats.current_commission_percent;
    const commissionAmount = Math.round(paymentAmount * commissionPercent / 100);

    const { data, error } = await supabase
      .from('referral_commissions')
      .insert([{
        referrer_id: referrerId,
        referred_user_id: referredUserId,
        payment_id: paymentId,
        commission_amount: commissionAmount,
        commission_percent: commissionPercent
      }])
      .select()
      .single();

    if (error) throw error;

    // Обновляем баланс реферера
    await supabase.rpc('increment_balance', {
      user_uuid: referrerId,
      amount_to_add: commissionAmount
    });

    await this.updateReferralStats(referrerId, 'new_commission', paymentAmount);
    
    // Проверяем и обновляем процент комиссии
    await this.updateCommissionPercent(referrerId);
    
    return data;
  }

  // Получение статистики реферальной программы
  static async getReferralStats(userId) {
    const { data, error } = await supabase
      .from('referral_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Создаем статистику если не существует
      return await this.createReferralStats(userId);
    }
    
    if (error) throw error;
    return data;
  }

  // Создание начальной статистики для пользователя
  static async createReferralStats(userId) {
    const { data, error } = await supabase
      .from('referral_stats')
      .insert([{
        user_id: userId,
        total_referrals: 0,
        active_referrals: 0,
        total_activations: 0,
        total_payments: 0,
        total_payment_amount: 0,
        total_commission_earned: 0,
        current_commission_percent: 10.00
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Обновление статистики
  static async updateReferralStats(userId, action, amount = 0) {
    // Сначала проверим существование записи
    await this.getReferralStats(userId);
    
    const updates = { updated_at: new Date().toISOString() };
    
    switch (action) {
      case 'new_referral':
        // Увеличиваем количество рефералов
        const { data: currentStats } = await supabase
          .from('referral_stats')
          .select('total_referrals')
          .eq('user_id', userId)
          .single();
        
        updates.total_referrals = (currentStats?.total_referrals || 0) + 1;
        break;
        
      case 'activation':
        const { data: activationStats } = await supabase
          .from('referral_stats')
          .select('total_activations')
          .eq('user_id', userId)
          .single();
        
        updates.total_activations = (activationStats?.total_activations || 0) + 1;
        break;
        
      case 'new_payment':
        const { data: paymentStats } = await supabase
          .from('referral_stats')
          .select('total_payments, total_payment_amount')
          .eq('user_id', userId)
          .single();
        
        updates.total_payments = (paymentStats?.total_payments || 0) + 1;
        updates.total_payment_amount = (paymentStats?.total_payment_amount || 0) + amount;
        break;
        
      case 'new_commission':
        const commissionAmount = Math.round(amount * 0.1); // 10% по умолчанию
        const { data: commissionStats } = await supabase
          .from('referral_stats')
          .select('total_commission_earned')
          .eq('user_id', userId)
          .single();
        
        updates.total_commission_earned = (commissionStats?.total_commission_earned || 0) + commissionAmount;
        break;
    }

    const { error } = await supabase
      .from('referral_stats')
      .update(updates)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Обновление процента комиссии на основе количества активных рефералов
  static async updateCommissionPercent(userId) {
    const { data: stats } = await supabase
      .from('referral_stats')
      .select('active_referrals, current_commission_percent')
      .eq('user_id', userId)
      .single();

    if (!stats) return;

    let newPercent = 10.00; // Базовый процент
    
    if (stats.active_referrals >= 15) {
      newPercent = 50.00; // Повышенный процент
    }

    if (newPercent !== stats.current_commission_percent) {
      await supabase
        .from('referral_stats')
        .update({ 
          current_commission_percent: newPercent,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    }
  }

  // Получение списка рефералов пользователя
  static async getUserReferrals(userId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        username,
        created_at,
        subscriptions!inner(
          is_active,
          expires_at,
          categories(name)
        )
      `)
      .eq('referrer_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Получение истории комиссий
  static async getCommissionHistory(userId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('referral_commissions')
      .select(`
        *,
        payments(amount, created_at, categories(name)),
        users!referred_user_id(first_name, username)
      `)
      .eq('referrer_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Проверка, может ли пользователь создавать промокоды
  static async canCreatePromoCodes(userId) {
    return true; // Все пользователи могут создавать промокоды
  }

  // Уведомление создателя промокода об использовании
  static async notifyPromoCodeUsage(promoCode, newUserId) {
    try {
      // Получаем данные создателя промокода и нового пользователя
      const { data: creator } = await supabase
        .from('users')
        .select('telegram_id, first_name')
        .eq('id', promoCode.user_id)
        .single();

      const { data: newUser } = await supabase
        .from('users')
        .select('first_name, username')
        .eq('id', newUserId)
        .single();

      if (!creator) return;

      const userName = newUser?.first_name || newUser?.username || 'Новый пользователь';

      // Используем notificationService для отправки уведомления
      const { default: notificationService } = await import('../../services/notificationService.js');
      await notificationService.sendPromoCodeUsageNotification(
        creator.telegram_id,
        promoCode,
        userName
      );

    } catch (error) {
      console.error('Error notifying promo code usage:', error);
      // Не прерываем процесс из-за ошибки уведомления
    }
  }
}

export default Referral; 
import { supabase } from '../../config/supabase.js';
import Referral from '../models/Referral.js';

/**
 * Скрипт для миграции существующих пользователей к реферальной системе
 * Запускается единоразово после внедрения реферальной системы
 */

class ExistingUsersMigration {
  
  // Генерация уникального реферального кода (аналогично методу в Referral.js)
  static async generateUniqueReferralCode() {
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
    
    return code;
  }

  // Основная функция миграции
  static async migrateAllUsers() {
    console.log('🚀 Начинаем миграцию существующих пользователей...');
    
    try {
      // Получаем всех пользователей без реферальных кодов
      const { data: usersWithoutCodes, error: usersError } = await supabase
        .from('users')
        .select('id, telegram_id, first_name, created_at')
        .is('referral_code', null);

      if (usersError) throw usersError;

      console.log(`📊 Найдено пользователей без реферальных кодов: ${usersWithoutCodes.length}`);

      let successCount = 0;
      let errorCount = 0;

      // Обрабатываем пользователей по частям для избежания перегрузки
      const batchSize = 10;
      for (let i = 0; i < usersWithoutCodes.length; i += batchSize) {
        const batch = usersWithoutCodes.slice(i, i + batchSize);
        
        console.log(`⚙️ Обрабатываем пользователей ${i + 1}-${Math.min(i + batchSize, usersWithoutCodes.length)} из ${usersWithoutCodes.length}`);
        
        await Promise.all(
          batch.map(async (user) => {
            try {
              await this.migrateUser(user);
              successCount++;
              console.log(`✅ Пользователь ${user.telegram_id} (${user.first_name || 'Без имени'}) обновлен`);
            } catch (error) {
              errorCount++;
              console.error(`❌ Ошибка при обновлении пользователя ${user.telegram_id}:`, error.message);
            }
          })
        );

        // Небольшая пауза между батчами
        if (i + batchSize < usersWithoutCodes.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('\n🎉 Миграция завершена!');
      console.log(`✅ Успешно обновлено: ${successCount} пользователей`);
      console.log(`❌ Ошибок: ${errorCount}`);
      
      // Проверяем результат
      await this.validateMigration();

    } catch (error) {
      console.error('💥 Критическая ошибка при миграции:', error);
      throw error;
    }
  }

  // Миграция одного пользователя
  static async migrateUser(user) {
    // 1. Генерируем реферальный код
    const referralCode = await this.generateUniqueReferralCode();
    
    // 2. Обновляем пользователя
    const { error: updateError } = await supabase
      .from('users')
      .update({
        referral_code: referralCode,
        referral_balance: 0,
        active_referrals_count: 0
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // 3. Создаем начальную статистику
    const { error: statsError } = await supabase
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

    if (statsError && statsError.code !== '23505') { // Игнорируем ошибку дублирования
      throw statsError;
    }
  }

  // Проверка результатов миграции
  static async validateMigration() {
    console.log('\n🔍 Проверяем результаты миграции...');
    
    // Проверяем пользователей без реферальных кодов
    const { data: usersWithoutCodes } = await supabase
      .from('users')
      .select('count')
      .is('referral_code', null);

    // Проверяем пользователей без статистики
    const { data: usersWithoutStats } = await supabase
      .from('users')
      .select(`
        id,
        referral_stats!left(user_id)
      `)
      .is('referral_stats.user_id', null);

    console.log(`📊 Пользователей без реферальных кодов: ${usersWithoutCodes?.[0]?.count || 0}`);
    console.log(`📊 Пользователей без статистики: ${usersWithoutStats?.length || 0}`);

    if ((usersWithoutCodes?.[0]?.count || 0) === 0 && (usersWithoutStats?.length || 0) === 0) {
      console.log('✅ Миграция прошла успешно! Все пользователи обновлены.');
    } else {
      console.log('⚠️ Обнаружены пользователи без полных данных. Возможно, требуется повторный запуск.');
    }
  }

  // Миграция для конкретного пользователя (если нужно исправить отдельные случаи)
  static async migrateSingleUser(telegramId) {
    console.log(`🔧 Миграция пользователя ${telegramId}...`);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error) throw error;
    if (!user) throw new Error('Пользователь не найден');

    await this.migrateUser(user);
    console.log(`✅ Пользователь ${telegramId} успешно обновлен`);
  }

  // Откат миграции (на случай проблем)
  static async rollbackMigration() {
    console.log('🔄 Начинаем откат миграции...');
    
    try {
      // Удаляем реферальные коды у всех пользователей
      const { error: updateError } = await supabase
        .from('users')
        .update({
          referral_code: null,
          referral_balance: null,
          active_referrals_count: null,
          referrer_id: null
        })
        .not('referral_code', 'is', null);

      if (updateError) throw updateError;

      // Очищаем все таблицы реферальной системы
      await supabase.from('referral_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('referral_commissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('referral_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      console.log('✅ Откат миграции завершен');
    } catch (error) {
      console.error('❌ Ошибка при откате:', error);
      throw error;
    }
  }
}

export default ExistingUsersMigration; 
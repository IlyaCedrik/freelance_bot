-- Реферальная система
-- Добавляем поля в таблицу users для реферальной программы

-- Добавляем поля к таблице users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS referral_balance INTEGER DEFAULT 0, -- В копейках 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS active_referrals_count INTEGER DEFAULT 0;

-- Таблица промокодов и реферальных ссылок
CREATE TABLE referral_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL DEFAULT 'referral', -- 'referral' или 'promo'
  bonus_days INTEGER DEFAULT 0, -- Дополнительные дни для промокода
  discount_percent INTEGER DEFAULT 0, -- Скидка для промокода
  usage_limit INTEGER, -- Лимит использований (NULL = без лимита)
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица начислений по реферальной программе
CREATE TABLE referral_commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES users(id),
  referred_user_id UUID NOT NULL REFERENCES users(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  commission_amount INTEGER NOT NULL, -- В копейках
  commission_percent DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Статистика реферальной программы
CREATE TABLE referral_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_referrals INTEGER DEFAULT 0,
  active_referrals INTEGER DEFAULT 0,
  total_activations INTEGER DEFAULT 0,
  total_payments INTEGER DEFAULT 0,
  total_payment_amount INTEGER DEFAULT 0,
  total_commission_earned INTEGER DEFAULT 0,
  current_commission_percent DECIMAL(5,2) DEFAULT 10.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Индексы для оптимизации производительности
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referrer_id ON users(referrer_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_commissions_referrer_id ON referral_commissions(referrer_id);
CREATE INDEX idx_referral_commissions_referred_user_id ON referral_commissions(referred_user_id);
CREATE INDEX idx_referral_stats_user_id ON referral_stats(user_id);

-- Функция для инкремента значений
CREATE OR REPLACE FUNCTION increment_balance(user_uuid UUID, amount_to_add INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET referral_balance = COALESCE(referral_balance, 0) + amount_to_add
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления статистики активных рефералов
CREATE OR REPLACE FUNCTION update_active_referrals_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем количество активных рефералов для реферера
    IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        -- Увеличиваем счетчик при создании активной подписки
        UPDATE referral_stats 
        SET active_referrals = (
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            JOIN subscriptions s ON u.id = s.user_id
            WHERE u.referrer_id = (SELECT referrer_id FROM users WHERE id = NEW.user_id)
            AND s.is_active = true
            AND s.expires_at > NOW()
        )
        WHERE user_id = (SELECT referrer_id FROM users WHERE id = NEW.user_id)
        AND (SELECT referrer_id FROM users WHERE id = NEW.user_id) IS NOT NULL;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
        -- Обновляем при изменении статуса подписки
        UPDATE referral_stats 
        SET active_referrals = (
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            JOIN subscriptions s ON u.id = s.user_id
            WHERE u.referrer_id = (SELECT referrer_id FROM users WHERE id = NEW.user_id)
            AND s.is_active = true
            AND s.expires_at > NOW()
        )
        WHERE user_id = (SELECT referrer_id FROM users WHERE id = NEW.user_id)
        AND (SELECT referrer_id FROM users WHERE id = NEW.user_id) IS NOT NULL;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Обновляем при удалении подписки
        UPDATE referral_stats 
        SET active_referrals = (
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            JOIN subscriptions s ON u.id = s.user_id
            WHERE u.referrer_id = (SELECT referrer_id FROM users WHERE id = OLD.user_id)
            AND s.is_active = true
            AND s.expires_at > NOW()
        )
        WHERE user_id = (SELECT referrer_id FROM users WHERE id = OLD.user_id)
        AND (SELECT referrer_id FROM users WHERE id = OLD.user_id) IS NOT NULL;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления количества активных рефералов
CREATE TRIGGER update_active_referrals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_active_referrals_count();

-- Добавляем триггер обновления времени для referral_stats
CREATE TRIGGER update_referral_stats_updated_at 
  BEFORE UPDATE ON referral_stats 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 
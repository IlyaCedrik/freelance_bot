-- Добавление таблицы запросов на создание промокодов
-- Обычные пользователи могут отправлять запросы, админы их одобряют

CREATE TABLE promo_code_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_code VARCHAR(50) NOT NULL,
  bonus_days INTEGER DEFAULT 0,
  discount_percent INTEGER DEFAULT 0,
  usage_limit INTEGER,
  description TEXT, -- Описание от пользователя, зачем нужен промокод
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  admin_id UUID REFERENCES users(id), -- Кто обработал запрос
  admin_comment TEXT, -- Комментарий администратора
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(requested_code) -- Промокод должен быть уникальным
);

-- Индексы для оптимизации
CREATE INDEX idx_promo_requests_user_id ON promo_code_requests(user_id);
CREATE INDEX idx_promo_requests_status ON promo_code_requests(status);
CREATE INDEX idx_promo_requests_admin_id ON promo_code_requests(admin_id);
CREATE INDEX idx_promo_requests_created_at ON promo_code_requests(created_at);

-- Добавляем триггер обновления времени
CREATE TRIGGER update_promo_requests_processed_at 
  BEFORE UPDATE ON promo_code_requests 
  FOR EACH ROW 
  WHEN (OLD.status != NEW.status)
  EXECUTE FUNCTION update_updated_at_column(); 
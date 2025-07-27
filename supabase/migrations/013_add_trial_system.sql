-- Добавить поддержку пробных подписок
-- Добавляем поле is_trial в таблицу subscriptions
ALTER TABLE subscriptions 
ADD COLUMN is_trial BOOLEAN DEFAULT false;

-- Добавляем поле used_trial_categories в таблицу users для отслеживания использованных пробных периодов
ALTER TABLE users 
ADD COLUMN used_trial_categories TEXT[] DEFAULT '{}';

-- Создаем индексы для оптимизации запросов
CREATE INDEX idx_subscriptions_is_trial ON subscriptions(is_trial);
CREATE INDEX idx_users_used_trial_categories ON users USING GIN(used_trial_categories);

-- Комментарии для документации
COMMENT ON COLUMN subscriptions.is_trial IS 'Является ли подписка пробной (1 день бесплатно)';
COMMENT ON COLUMN users.used_trial_categories IS 'Массив ID категорий, для которых пользователь уже использовал пробный период'; 
-- Clean roles system migration - only what's needed, no sent_jobs

-- Add role column to users table if not exists
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- Create index for role column
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable Row Level Security on relevant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create SECURITY DEFINER function to check admin status (avoids recursion)
CREATE OR REPLACE FUNCTION check_user_is_admin(check_telegram_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query without going through RLS
  SELECT role INTO user_role 
  FROM users 
  WHERE telegram_id = check_telegram_id;
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can register" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

DROP POLICY IF EXISTS "Everyone can view categories" ON categories;
DROP POLICY IF EXISTS "Only admins can modify categories" ON categories;
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

DROP POLICY IF EXISTS "Everyone can view active channels" ON parsing_channels;
DROP POLICY IF EXISTS "Only admins can modify channels" ON parsing_channels;
DROP POLICY IF EXISTS "channels_select_policy" ON parsing_channels;
DROP POLICY IF EXISTS "channels_insert_policy" ON parsing_channels;
DROP POLICY IF EXISTS "channels_update_policy" ON parsing_channels;
DROP POLICY IF EXISTS "channels_delete_policy" ON parsing_channels;

-- Create clean policies for users
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    OR check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    OR check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

-- Create clean policies for categories
CREATE POLICY "categories_select_policy" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_insert_policy" ON categories
  FOR INSERT WITH CHECK (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "categories_update_policy" ON categories
  FOR UPDATE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "categories_delete_policy" ON categories
  FOR DELETE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

-- Create clean policies for parsing_channels
CREATE POLICY "channels_select_policy" ON parsing_channels
  FOR SELECT USING (
    is_active = true 
    OR check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "channels_insert_policy" ON parsing_channels
  FOR INSERT WITH CHECK (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "channels_update_policy" ON parsing_channels
  FOR UPDATE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "channels_delete_policy" ON parsing_channels
  FOR DELETE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

-- Clean policies for subscriptions (minimal set)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can modify own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete_policy" ON subscriptions;

CREATE POLICY "subscriptions_all_policy" ON subscriptions
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

-- Clean policies for payments (minimal set)
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;
DROP POLICY IF EXISTS "Only admins can update payments" ON payments;
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;

CREATE POLICY "payments_all_policy" ON payments
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR current_setting('app.current_user_telegram_id', true) IS NULL
    OR current_setting('app.current_user_telegram_id', true) = ''
  );

-- Legacy functions for compatibility
CREATE OR REPLACE FUNCTION is_admin(user_telegram_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN check_user_is_admin(user_telegram_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role(user_telegram_id BIGINT)
RETURNS VARCHAR(20) AS $$
DECLARE
  user_role VARCHAR(20);
BEGIN
  SELECT role INTO user_role 
  FROM users 
  WHERE telegram_id = user_telegram_id;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
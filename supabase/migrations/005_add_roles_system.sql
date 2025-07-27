-- Add roles system and Row Level Security

-- Add role column to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- Create index for role column
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable Row Level Security on all relevant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_telegram_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE telegram_id = user_telegram_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get current user role by telegram_id
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

-- RLS Policies for users table
-- Users can read their own data, admins can read all
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    OR is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- Admins can update any user, users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    OR is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- Anyone can insert new users (registration)
CREATE POLICY "Anyone can register" ON users
  FOR INSERT WITH CHECK (true);

-- RLS Policies for categories table
-- Everyone can read categories
CREATE POLICY "Everyone can view categories" ON categories
  FOR SELECT USING (true);

-- Only admins can modify categories
CREATE POLICY "Only admins can modify categories" ON categories
  FOR ALL USING (
    is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- RLS Policies for parsing_channels table
-- Everyone can read active channels
CREATE POLICY "Everyone can view active channels" ON parsing_channels
  FOR SELECT USING (is_active = true OR is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT));

-- Only admins can modify parsing channels
CREATE POLICY "Only admins can modify channels" ON parsing_channels
  FOR ALL USING (
    is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- RLS Policies for subscriptions table
-- Users can view their own subscriptions, admins can view all
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- Users can modify their own subscriptions, admins can modify all
CREATE POLICY "Users can modify own subscriptions" ON subscriptions
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- RLS Policies for payments table
-- Users can view their own payments, admins can view all
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- Payments can only be created by users for themselves or by admins
CREATE POLICY "Users can create own payments" ON payments
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- Only admins can update payments (status changes)
CREATE POLICY "Only admins can update payments" ON payments
  FOR UPDATE USING (
    is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
  );

-- To assign admin role to existing user, run:
-- UPDATE users SET role = 'admin' WHERE telegram_id = YOUR_TELEGRAM_ID;

-- Example commands to assign admin role:
-- UPDATE users SET role = 'admin' WHERE telegram_id = 123456789;
-- UPDATE users SET role = 'admin' WHERE username = 'your_username'; 
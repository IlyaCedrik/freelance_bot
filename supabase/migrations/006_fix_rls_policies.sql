-- Fix RLS policies that are blocking user registration

-- Drop existing policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can register" ON users;

-- Create new, corrected policies for users table

-- Policy for SELECT (viewing profiles)
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    -- Users can see their own data
    telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    OR 
    -- Admins can see all users
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Policy for INSERT (registration) - allow anyone to register
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (true);

-- Policy for UPDATE (profile updates)
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    -- Users can update their own data
    telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    OR 
    -- Admins can update any user
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Update other table policies to be more permissive for bot operations

-- Categories: make more permissive for reading
DROP POLICY IF EXISTS "Everyone can view categories" ON categories;
CREATE POLICY "categories_select_policy" ON categories
  FOR SELECT USING (true);

-- Channels: make more permissive for reading
DROP POLICY IF EXISTS "Everyone can view active channels" ON parsing_channels;
CREATE POLICY "channels_select_policy" ON parsing_channels
  FOR SELECT USING (
    is_active = true 
    OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Subscriptions: fix policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can modify own subscriptions" ON subscriptions;

CREATE POLICY "subscriptions_select_policy" ON subscriptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "subscriptions_insert_policy" ON subscriptions
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "subscriptions_update_policy" ON subscriptions
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "subscriptions_delete_policy" ON subscriptions
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Fix payments policies  
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;
DROP POLICY IF EXISTS "Only admins can update payments" ON payments;

CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "payments_insert_policy" ON payments
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "payments_update_policy" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT 
      AND u.role = 'admin'
    )
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  ); 
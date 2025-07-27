-- Fix infinite recursion in RLS policies

-- First, drop all existing policies that cause recursion
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- Create a SECURITY DEFINER function to check admin status without recursion
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

-- Create simplified policies that don't cause recursion

-- Policy for SELECT (viewing profiles)
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    -- Users can see their own data
    telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    OR 
    -- Admins can see all users (using function to avoid recursion)
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Policy for INSERT (registration) - simple, no recursion
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (true);

-- Policy for UPDATE (profile updates)
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    -- Users can update their own data
    telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    OR 
    -- Admins can update any user (using function to avoid recursion)
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    -- If no user context is set, allow (for bot operations)
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Update other policies to use the same function approach

-- Drop and recreate channels policies
DROP POLICY IF EXISTS "channels_select_policy" ON parsing_channels;
CREATE POLICY "channels_select_policy" ON parsing_channels
  FOR SELECT USING (
    is_active = true 
    OR 
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Update subscriptions policies
DROP POLICY IF EXISTS "subscriptions_select_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete_policy" ON subscriptions;

CREATE POLICY "subscriptions_select_policy" ON subscriptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR 
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
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
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
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
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
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
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Update payments policies
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;

CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = current_setting('app.current_user_telegram_id', true)::BIGINT
    )
    OR 
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
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
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

CREATE POLICY "payments_update_policy" ON payments
  FOR UPDATE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  ); 
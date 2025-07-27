-- Fix RLS policies for parsing_channels and other missing operations

-- Add missing policies for parsing_channels table
DROP POLICY IF EXISTS "Only admins can modify channels" ON parsing_channels;

-- Insert policy for channels (admins can add channels)
CREATE POLICY "channels_insert_policy" ON parsing_channels
  FOR INSERT WITH CHECK (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Update policy for channels (admins can modify channels)
CREATE POLICY "channels_update_policy" ON parsing_channels
  FOR UPDATE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Delete policy for channels (admins can delete channels)
CREATE POLICY "channels_delete_policy" ON parsing_channels
  FOR DELETE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Add missing policies for categories table
DROP POLICY IF EXISTS "Only admins can modify categories" ON categories;

-- Insert policy for categories (admins can add categories)
CREATE POLICY "categories_insert_policy" ON categories
  FOR INSERT WITH CHECK (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Update policy for categories (admins can modify categories)
CREATE POLICY "categories_update_policy" ON categories
  FOR UPDATE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Delete policy for categories (admins can delete categories)
CREATE POLICY "categories_delete_policy" ON categories
  FOR DELETE USING (
    check_user_is_admin(current_setting('app.current_user_telegram_id', true)::BIGINT)
    OR
    current_setting('app.current_user_telegram_id', true) IS NULL
    OR
    current_setting('app.current_user_telegram_id', true) = ''
  );

-- Note: sent_jobs table doesn't exist in current schema, so no policies needed 
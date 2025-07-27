-- Fix error with non-existent sent_jobs table

-- The previous migration tried to create policies for sent_jobs table that doesn't exist
-- This migration safely handles cleanup without causing errors

-- Use a DO block to safely handle non-existent table
DO $$
BEGIN
    -- Try to drop policies only if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sent_jobs') THEN
        -- Drop policies if they exist
        DROP POLICY IF EXISTS "sent_jobs_select_policy" ON sent_jobs;
        DROP POLICY IF EXISTS "sent_jobs_insert_policy" ON sent_jobs;
        
        -- Disable RLS if table exists
        ALTER TABLE sent_jobs DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Cleaned up sent_jobs table policies';
    ELSE
        RAISE NOTICE 'sent_jobs table does not exist - no cleanup needed';
    END IF;
END $$;

-- Note: This migration ensures no errors occur when sent_jobs table doesn't exist 
-- Remove jobs and sent_jobs tables since they're not needed

-- Drop tables in correct order (sent_jobs first due to foreign key)
DROP TABLE IF EXISTS sent_jobs CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- Remove any policies that might exist for these tables
DO $$
BEGIN
    -- Try to drop policies for jobs table if it existed
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'jobs') THEN
        DROP POLICY IF EXISTS "jobs_select_policy" ON jobs;
        DROP POLICY IF EXISTS "jobs_insert_policy" ON jobs;
        DROP POLICY IF EXISTS "jobs_update_policy" ON jobs;
        DROP POLICY IF EXISTS "jobs_delete_policy" ON jobs;
    END IF;
    
    -- Try to drop policies for sent_jobs table if it existed  
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sent_jobs') THEN
        DROP POLICY IF EXISTS "sent_jobs_select_policy" ON sent_jobs;
        DROP POLICY IF EXISTS "sent_jobs_insert_policy" ON sent_jobs;
        DROP POLICY IF EXISTS "sent_jobs_update_policy" ON sent_jobs;
        DROP POLICY IF EXISTS "sent_jobs_delete_policy" ON sent_jobs;
    END IF;
    
    RAISE NOTICE 'Jobs and sent_jobs tables removed successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Tables jobs/sent_jobs did not exist or were already removed';
END $$;

-- Note: This migration removes jobs and sent_jobs tables completely
-- The bot will work with direct parsing and sending without storing job history 
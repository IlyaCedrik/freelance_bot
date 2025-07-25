-- Migration to remove jobs-related tables
-- Parser now works autonomously without storing jobs in database
-- Keep categories for subscriptions and payments

-- Drop sent_jobs table first (has foreign key to jobs)
DROP TABLE IF EXISTS sent_jobs;

-- Drop jobs table
DROP TABLE IF EXISTS jobs;

-- Remove related indexes
DROP INDEX IF EXISTS idx_jobs_category_id;
DROP INDEX IF EXISTS idx_jobs_published_at;
DROP INDEX IF EXISTS idx_jobs_source;
DROP INDEX IF EXISTS idx_sent_jobs_user_id; 
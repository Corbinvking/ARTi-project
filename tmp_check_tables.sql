-- Check if submissions table exists
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%submission%';

-- Check if members / repost_credit_wallet tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%member%' OR tablename LIKE '%repost%' OR tablename LIKE '%wallet%');

-- Check row count in soundcloud_submissions
SELECT count(*) as submission_count FROM soundcloud_submissions;

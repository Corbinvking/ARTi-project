-- Check for credit/wallet tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%credit%' OR tablename LIKE '%wallet%');

-- Check soundcloud_members columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'soundcloud_members' ORDER BY ordinal_position;

-- Check soundcloud_submissions columns  
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'soundcloud_submissions' ORDER BY ordinal_position;

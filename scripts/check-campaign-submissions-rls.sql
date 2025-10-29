-- Check RLS policies on campaign_submissions table
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'campaign_submissions';

-- Show current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'campaign_submissions';


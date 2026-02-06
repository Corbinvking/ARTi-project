-- Check for views named submissions or members
SELECT table_name, table_type FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('submissions', 'members', 'repost_credit_wallet')
ORDER BY table_name;

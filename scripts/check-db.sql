-- Check roles
SELECT rolname FROM pg_roles WHERE rolname LIKE '%supa%' OR rolname = 'postgres' ORDER BY rolname;

-- Try creating pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Test crypt works
SELECT crypt('testpassword', gen_salt('bf')) AS test_hash;

-- Check existing salespeople
SELECT count(*) as salespeople_count FROM public.salespeople;

-- Check columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'salespeople' AND table_schema = 'public' ORDER BY ordinal_position;

-- Check profiles table exists
SELECT count(*) as profiles_count FROM public.profiles;

-- Count auth users
SELECT count(*) as auth_users_count FROM auth.users;

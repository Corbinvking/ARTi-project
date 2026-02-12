SELECT extname FROM pg_extension ORDER BY extname;
SELECT count(*) as auth_users FROM auth.users;
SELECT count(*) as salespeople FROM public.salespeople;
SELECT column_name FROM information_schema.columns WHERE table_name = 'salespeople' AND table_schema = 'public' ORDER BY ordinal_position;

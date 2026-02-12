SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public' ORDER BY ordinal_position;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_roles' AND table_schema = 'public' ORDER BY ordinal_position;
SELECT * FROM public.users LIMIT 2;
SELECT enum_range(NULL::app_role);

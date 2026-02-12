SELECT email FROM auth.users ORDER BY email;
SELECT name, email FROM public.salespeople ORDER BY name;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as profiles_exists;

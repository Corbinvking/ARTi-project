-- Fix: Populate public.users and user_roles for all sales auth users

-- 1. Insert into public.users
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  u.created_at,
  u.updated_at
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'sales'
AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert into user_roles (role enum is 'salesperson' not 'sales')
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'salesperson'::app_role
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'sales'
AND EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = u.id)
AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id)
ON CONFLICT DO NOTHING;

-- 3. Verify
SELECT '=== public.users ===' as info;
SELECT pu.id, pu.email, pu.full_name, ur.role
FROM public.users pu
LEFT JOIN public.user_roles ur ON ur.user_id = pu.id
ORDER BY pu.full_name;

SELECT '=== COUNTS ===' as info;
SELECT
  (SELECT count(*) FROM public.users) as total_public_users,
  (SELECT count(*) FROM public.user_roles) as total_user_roles,
  (SELECT count(*) FROM auth.users WHERE raw_user_meta_data->>'role' = 'sales') as sales_auth_users;

-- Find stale users: exist in public.users but NOT in auth.users
SELECT '=== STALE USERS (in public.users but NOT in auth.users) ===' as info;
SELECT pu.id, pu.email, pu.full_name, ur.role
FROM public.users pu
LEFT JOIN public.user_roles ur ON ur.user_id = pu.id
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id)
ORDER BY pu.full_name;

-- Also check: users in auth.users but NOT in public.users (orphaned auth)
SELECT '=== ORPHANED AUTH (in auth.users but NOT in public.users) ===' as info;
SELECT au.id, au.email, au.raw_user_meta_data->>'full_name' as name
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ORDER BY au.email;

-- Show all public.users for reference
SELECT '=== ALL public.users ===' as info;
SELECT pu.id, pu.email, pu.full_name, ur.role,
  EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id) as has_auth
FROM public.users pu
LEFT JOIN public.user_roles ur ON ur.user_id = pu.id
ORDER BY pu.full_name;

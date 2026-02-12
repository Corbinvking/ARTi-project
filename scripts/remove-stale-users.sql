-- Remove stale users that exist in public.users but NOT in auth.users
-- These are leftover seed/test data that can't be deleted via the UI

-- List what we're about to delete
SELECT 'Deleting stale users:' as info;
SELECT pu.id, pu.email, pu.full_name
FROM public.users pu
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id)
ORDER BY pu.full_name;

-- 1. Delete their user_roles first (FK constraint)
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT pu.id FROM public.users pu
  WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id)
);

-- 2. Delete their user_permissions if any
DELETE FROM public.user_permissions
WHERE user_id IN (
  SELECT pu.id FROM public.users pu
  WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id)
);

-- 3. Delete their vendor_users mappings if any
DELETE FROM public.vendor_users
WHERE user_id IN (
  SELECT pu.id FROM public.users pu
  WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id)
);

-- 4. Delete their profiles if any
DELETE FROM public.profiles
WHERE id IN (
  SELECT pu.id FROM public.users pu
  WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id)
);

-- 5. Delete from public.users
DELETE FROM public.users
WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = public.users.id);

-- Verify clean state
SELECT '=== Remaining public.users ===' as info;
SELECT pu.id, pu.email, pu.full_name, ur.role,
  EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id) as has_auth
FROM public.users pu
LEFT JOIN public.user_roles ur ON ur.user_id = pu.id
ORDER BY pu.full_name;

SELECT '=== COUNTS ===' as info;
SELECT
  (SELECT count(*) FROM public.users) as public_users,
  (SELECT count(*) FROM auth.users) as auth_users,
  (SELECT count(*) FROM public.user_roles) as user_roles;

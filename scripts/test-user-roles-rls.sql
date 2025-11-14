-- Test script to verify user_roles RLS policies work without infinite recursion

-- Set the current user to test as the admin user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '97bf0622-6d2f-4bed-931d-e9134307545f'; -- admin@arti-demo.com

-- Test 1: Query user_roles (should work without infinite recursion)
SELECT 
    'Test 1: Query user_roles' as test_name,
    count(*) as user_roles_count
FROM public.user_roles;

-- Test 2: Query users table (should work for admins)
SELECT 
    'Test 2: Query users' as test_name,
    count(*) as users_count
FROM public.users;

-- Test 3: Verify the helper function works
SELECT 
    'Test 3: is_vendor_manager()' as test_name,
    public.is_vendor_manager() as is_manager;

-- Test 4: Show current policies on user_roles
SELECT 
    'Policies on user_roles:' as info,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Reset role
RESET role;


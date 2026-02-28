-- Fix infinite recursion in user_roles RLS policies
-- The problem: policies were querying user_roles to check if user is admin,
-- which triggered the same policy again, causing infinite recursion
-- The solution: Use SECURITY DEFINER functions that bypass RLS

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "admins_managers_view_all_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "admins_managers_manage_user_roles" ON public.user_roles;

-- Recreate policies using SECURITY DEFINER helper functions
-- These functions bypass RLS, preventing infinite recursion

-- Allow users to view their own role
CREATE POLICY "users_view_own_role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Allow admins and managers to view all user roles (uses helper function)
CREATE POLICY "admins_managers_view_all_user_roles"
  ON public.user_roles FOR SELECT
  USING (public.is_vendor_manager()); -- SECURITY DEFINER function, no recursion

-- Allow admins/managers to manage user roles (uses helper function)
CREATE POLICY "admins_managers_manage_user_roles"
  ON public.user_roles FOR ALL
  USING (public.is_vendor_manager()) -- SECURITY DEFINER function, no recursion
  WITH CHECK (public.is_vendor_manager());

-- Verify policies are created
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;


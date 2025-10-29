-- Fix RLS policies to allow admins to view user_roles and vendor_users

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "user_roles_org_isolation" ON public.user_roles;

-- Allow admins and managers to view all user roles
CREATE POLICY "admins_managers_view_all_user_roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Allow users to view their own role
CREATE POLICY "users_view_own_role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Allow admins/managers to manage user roles
CREATE POLICY "admins_managers_manage_user_roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Also ensure vendor_users has proper policies
DROP POLICY IF EXISTS "admin_manager_can_view_vendor_mappings" ON public.vendor_users;

CREATE POLICY "admins_managers_view_vendor_mappings"
  ON public.vendor_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );


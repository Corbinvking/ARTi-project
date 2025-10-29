-- Fix RLS policies on public.users to allow admins to view all users

-- First, check if any policies exist
DO $$ 
BEGIN
  -- Drop existing restrictive policies if they exist
  DROP POLICY IF EXISTS "users_org_isolation" ON public.users;
  DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
  
  RAISE NOTICE 'Dropped old policies';
END $$;

-- Allow users to view their own profile
CREATE POLICY "users_can_view_own_profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile  
CREATE POLICY "users_can_update_own_profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Allow admins and managers to view all users
CREATE POLICY "admin_manager_can_view_all_users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Allow admins to manage all users
CREATE POLICY "admin_can_manage_users"
  ON public.users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;


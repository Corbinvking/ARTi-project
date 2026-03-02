-- Fix RLS policies for vendor_users table
-- Vendors need to be able to see their own vendor_users association

-- Drop existing policies
DROP POLICY IF EXISTS "vendor_users_org_isolation" ON public.vendor_users;
DROP POLICY IF EXISTS "vendors_can_view_own_mapping" ON public.vendor_users;
DROP POLICY IF EXISTS "admin_manager_can_view_vendor_mappings" ON public.vendor_users;
DROP POLICY IF EXISTS "admin_manager_can_manage_vendor_mappings" ON public.vendor_users;

-- Create new policies
-- 1. Vendors can view their own mapping
CREATE POLICY "vendors_can_view_own_mapping" 
  ON public.vendor_users 
  FOR SELECT 
  USING (user_id = auth.uid());

-- 2. Admin/manager can view all vendor mappings in their org
CREATE POLICY "admin_manager_can_view_vendor_mappings" 
  ON public.vendor_users 
  FOR SELECT 
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- 3. Admin/manager can manage vendor mappings in their org
CREATE POLICY "admin_manager_can_manage_vendor_mappings" 
  ON public.vendor_users 
  FOR ALL 
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );


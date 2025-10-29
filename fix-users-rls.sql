-- Fix RLS on public.users
DROP POLICY IF EXISTS users_org_isolation ON public.users;
DROP POLICY IF EXISTS admin_manager_can_view_all_users ON public.users;
CREATE POLICY admin_manager_can_view_all_users ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
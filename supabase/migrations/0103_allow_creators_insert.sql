-- Allow authenticated users to insert creators without org_id RLS restriction
-- The existing creators_org_isolation policy blocks inserts when auth.uid()
-- doesn't match memberships, but the app needs any authenticated user to add creators.
CREATE POLICY allow_insert_creators ON public.creators
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to delete creators
-- The existing creators_org_isolation policy blocks deletes when auth.uid()
-- doesn't match memberships, but the app needs any authenticated user to manage creators.
CREATE POLICY allow_delete_creators ON public.creators
  FOR DELETE TO authenticated USING (true);

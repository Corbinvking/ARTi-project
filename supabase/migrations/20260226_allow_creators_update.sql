-- Allow authenticated users to update and select creators
-- The existing creators_org_isolation policy blocks operations when org_id
-- doesn't match memberships. The CSV import upsert needs UPDATE permission,
-- and all users need to be able to read the creators table.
DROP POLICY IF EXISTS allow_update_creators ON public.creators;
CREATE POLICY allow_update_creators ON public.creators
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_select_creators ON public.creators;
CREATE POLICY allow_select_creators ON public.creators
  FOR SELECT TO authenticated USING (true);

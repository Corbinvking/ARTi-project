-- Fix the UPDATE RLS policy for platform_development_reports
-- The previous policy queried auth.users which can be blocked by internal RLS.
-- This version reads the role from the JWT token directly via auth.jwt().

DROP POLICY IF EXISTS "Admins can update reports" ON platform_development_reports;

CREATE POLICY "Admins and submitters can update reports"
  ON platform_development_reports
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR auth.uid() = submitted_by
  );

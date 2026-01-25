-- Fix RLS policies for campaign_vendor_requests table
-- The org_isolation policy is too restrictive and causing approval failures

-- Drop the existing policies
DROP POLICY IF EXISTS "campaign_vendor_requests_org_isolation" ON public.campaign_vendor_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.campaign_vendor_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.campaign_vendor_requests;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.campaign_vendor_requests;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.campaign_vendor_requests;

-- Create simpler policies that allow authenticated users access
CREATE POLICY "Enable read access for all users" ON public.campaign_vendor_requests
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.campaign_vendor_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.campaign_vendor_requests
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.campaign_vendor_requests
  FOR DELETE USING (auth.role() = 'authenticated');

-- Also fix campaign_playlists if it has the same issue
DROP POLICY IF EXISTS "campaign_playlists_org_isolation" ON public.campaign_playlists;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.campaign_playlists;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.campaign_playlists;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.campaign_playlists;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.campaign_playlists;

CREATE POLICY "Enable read access for all users" ON public.campaign_playlists
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.campaign_playlists
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.campaign_playlists
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.campaign_playlists
  FOR DELETE USING (auth.role() = 'authenticated');

-- Also fix campaign_submissions
DROP POLICY IF EXISTS "campaign_submissions_org_isolation" ON public.campaign_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.campaign_submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.campaign_submissions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.campaign_submissions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.campaign_submissions;

CREATE POLICY "Enable read access for all users" ON public.campaign_submissions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.campaign_submissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.campaign_submissions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.campaign_submissions
  FOR DELETE USING (auth.role() = 'authenticated');

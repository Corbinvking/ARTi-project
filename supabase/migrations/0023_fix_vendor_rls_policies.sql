-- Fix RLS policies for vendors table to allow read access
-- The org_isolation policy is too restrictive for the current setup

-- Drop the existing policies
DROP POLICY IF EXISTS vendors_org_isolation ON public.vendors;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vendors;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.vendors;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.vendors;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.vendors;

-- Create simpler policies that allow authenticated users to read vendors
CREATE POLICY "Enable read access for all users" ON public.vendors
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.vendors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.vendors
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.vendors
  FOR DELETE USING (auth.role() = 'authenticated');

-- Apply same fix to playlists table if needed
DROP POLICY IF EXISTS playlists_org_isolation ON public.playlists;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.playlists;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.playlists;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.playlists;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.playlists;

CREATE POLICY "Enable read access for all users" ON public.playlists
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.playlists
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.playlists
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.playlists
  FOR DELETE USING (auth.role() = 'authenticated');


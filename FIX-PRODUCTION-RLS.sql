-- Fix RLS policies for campaign_playlists table on PRODUCTION

-- 1. Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'campaign_playlists';

-- 2. Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Users can view campaign_playlists in their org" ON campaign_playlists;
DROP POLICY IF EXISTS "campaign_playlists_select_policy" ON campaign_playlists;

-- 3. Create permissive SELECT policy
CREATE POLICY "Allow authenticated users to read campaign_playlists"
ON campaign_playlists
FOR SELECT
TO authenticated
USING (true);

-- 4. Verify RLS is enabled
ALTER TABLE campaign_playlists ENABLE ROW LEVEL SECURITY;

-- 5. Grant SELECT permission to authenticated role
GRANT SELECT ON campaign_playlists TO authenticated;
GRANT SELECT ON campaign_playlists TO anon;

-- 6. Test query (run this to verify it works)
SELECT COUNT(*) FROM campaign_playlists;


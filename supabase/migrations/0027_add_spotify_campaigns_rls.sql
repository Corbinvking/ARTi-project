-- Add RLS policies for spotify_campaigns table
-- This allows all authenticated and anon users to read campaigns

-- Enable RLS on spotify_campaigns if not already enabled
ALTER TABLE spotify_campaigns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to spotify_campaigns" ON spotify_campaigns;
DROP POLICY IF EXISTS "Allow authenticated users full access to spotify_campaigns" ON spotify_campaigns;

-- Allow anyone (including anon) to read campaigns
CREATE POLICY "Allow public read access to spotify_campaigns"
  ON spotify_campaigns
  FOR SELECT
  USING (true);

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated users full access to spotify_campaigns"
  ON spotify_campaigns
  FOR ALL
  USING (auth.role() = 'authenticated');


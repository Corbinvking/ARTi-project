-- ================================================================================
-- DIRECT SQL IMPORT FOR SCRAPED PLAYLIST DATA
-- ================================================================================
-- This SQL script imports scraped playlist data directly into the database
-- without needing JWT authentication (run via psql or Supabase Studio)
--
-- Usage:
--   Run this in Supabase Studio SQL Editor on PRODUCTION
-- ================================================================================

-- Example for one campaign (replace with actual data from your JSON files)

-- Step 1: Update campaign with SFA URL
UPDATE spotify_campaigns
SET 
  sfa = 'https://artists.spotify.com/c/song/08Bd5NkwharGRRlyycDD8R/stats',
  updated_at = NOW()
WHERE url LIKE '%08Bd5NkwharGRRlyycDD8R%';

-- Step 2: Insert/Update playlist data for that campaign
-- Get the campaign_id first
DO $$
DECLARE
  v_campaign_id UUID;
BEGIN
  -- Find campaign by track ID in URL
  SELECT id INTO v_campaign_id
  FROM spotify_campaigns
  WHERE url LIKE '%08Bd5NkwharGRRlyycDD8R%'
  LIMIT 1;

  IF v_campaign_id IS NOT NULL THEN
    -- Insert playlist data (example - replace with actual data)
    INSERT INTO campaign_playlists (
      campaign_id,
      playlist_name,
      playlist_curator,
      streams_28d,
      streams_7d,
      streams_12m,
      date_added,
      last_scraped
    ) VALUES
      (v_campaign_id, 'Discover Weekly', 'Spotify', 1234, 567, 5678, '2024-01-01', NOW()),
      (v_campaign_id, 'Daily Mix 1', 'Spotify', 890, 234, 3456, '2024-01-01', NOW())
    ON CONFLICT (campaign_id, playlist_name, playlist_curator) 
    DO UPDATE SET
      streams_28d = EXCLUDED.streams_28d,
      streams_7d = EXCLUDED.streams_7d,
      streams_12m = EXCLUDED.streams_12m,
      last_scraped = EXCLUDED.last_scraped,
      updated_at = NOW();
  END IF;
END $$;

-- ================================================================================
-- NOTE: This is just an example structure
-- We need to generate the actual SQL from your scraped JSON files
-- ================================================================================


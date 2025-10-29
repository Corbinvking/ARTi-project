-- Fix is_algorithmic flag for ALL playlists with Spotify as curator

UPDATE campaign_playlists
SET is_algorithmic = true
WHERE playlist_curator ILIKE '%spotify%'
  AND is_algorithmic = false;

-- Show what was updated
SELECT 
  'Updated playlists' as info,
  COUNT(*) as count
FROM campaign_playlists
WHERE playlist_curator ILIKE '%spotify%'
  AND is_algorithmic = true;

-- Show examples
SELECT 
  playlist_name,
  playlist_curator,
  is_algorithmic,
  streams_28d
FROM campaign_playlists
WHERE playlist_curator ILIKE '%spotify%'
ORDER BY streams_28d DESC
LIMIT 20;


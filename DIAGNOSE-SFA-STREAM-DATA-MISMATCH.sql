-- Diagnose SFA links vs Stream Data mismatch

-- 1. Count campaigns with scraped SFA links
SELECT 'Campaigns with scraped SFA links' as metric, COUNT(*) as count
FROM spotify_campaigns 
WHERE sfa LIKE '%artists.spotify.com/c/artist%';

-- 2. Count campaigns with stream data
SELECT 'Campaigns with stream data' as metric, COUNT(DISTINCT campaign_id) as count
FROM campaign_playlists;

-- 3. Campaigns WITH SFA link but NO stream data
SELECT 'Campaigns with SFA but NO stream data' as metric, COUNT(*) as count
FROM spotify_campaigns sc
WHERE sc.sfa LIKE '%artists.spotify.com/c/artist%'
  AND NOT EXISTS (
    SELECT 1 FROM campaign_playlists cp WHERE cp.campaign_id = sc.id
  );

-- 4. Show examples of campaigns with SFA but no stream data
SELECT 'Examples of SFA links without stream data:' as info;
SELECT sc.id, sc.sfa
FROM spotify_campaigns sc
WHERE sc.sfa LIKE '%artists.spotify.com/c/artist%'
  AND NOT EXISTS (
    SELECT 1 FROM campaign_playlists cp WHERE cp.campaign_id = sc.id
  )
LIMIT 10;

-- 5. Extract track IDs from those SFA links to check if they were scraped
SELECT 'Track IDs from SFA links without data:' as info;
SELECT 
  sc.id,
  substring(sc.sfa from 'song/([a-zA-Z0-9]+)') as track_id,
  sc.sfa
FROM spotify_campaigns sc
WHERE sc.sfa LIKE '%artists.spotify.com/c/artist%'
  AND NOT EXISTS (
    SELECT 1 FROM campaign_playlists cp WHERE cp.campaign_id = sc.id
  )
LIMIT 10;


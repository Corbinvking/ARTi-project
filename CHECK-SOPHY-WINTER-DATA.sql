-- Check Sophy Winter campaign data

-- 1. Find the campaign
SELECT 'Campaign Info' as section;
SELECT cg.id, cg.name, cg.status
FROM campaign_groups cg
JOIN clients c ON cg.client_id = c.id
WHERE c.name ILIKE '%Sophy%Winter%'
LIMIT 5;

-- 2. Find associated spotify_campaigns
SELECT 'Spotify Campaigns' as section;
SELECT sc.id, sc.campaign_group_id
FROM spotify_campaigns sc
JOIN campaign_groups cg ON sc.campaign_group_id = cg.id
JOIN clients c ON cg.client_id = c.id
WHERE c.name ILIKE '%Sophy%Winter%';

-- 3. Check algorithmic playlists for this campaign
SELECT 'Algorithmic Playlists' as section;
SELECT 
  cp.playlist_name,
  cp.playlist_curator,
  cp.is_algorithmic,
  cp.streams_7d,
  cp.streams_28d,
  cp.streams_12m
FROM campaign_playlists cp
JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
JOIN campaign_groups cg ON sc.campaign_group_id = cg.id
JOIN clients c ON cg.client_id = c.id
WHERE c.name ILIKE '%Sophy%Winter%'
  AND cp.is_algorithmic = true
ORDER BY cp.streams_28d DESC;

-- 4. Count them
SELECT 'Count' as section;
SELECT COUNT(*) as algorithmic_playlist_count
FROM campaign_playlists cp
JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
JOIN campaign_groups cg ON sc.campaign_group_id = cg.id
JOIN clients c ON cg.client_id = c.id
WHERE c.name ILIKE '%Sophy%Winter%'
  AND cp.is_algorithmic = true;


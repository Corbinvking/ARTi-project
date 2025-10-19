-- Find out why "Segan - DNBMF" has no playlists but "Segan" does

-- 1. Show both campaign groups
SELECT 
    id,
    name,
    status,
    created_at
FROM campaign_groups 
WHERE name LIKE '%Segan%'
ORDER BY created_at;

-- 2. Show spotify_campaigns (songs) for "Segan - DNBMF"
\echo ''
\echo '=== Songs under "Segan - DNBMF" ==='
SELECT 
    sc.id,
    sc.campaign,
    sc.campaign_group_id,
    COUNT(cp.id) as playlist_count
FROM spotify_campaigns sc
LEFT JOIN campaign_playlists cp ON cp.campaign_id = sc.id
WHERE sc.campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82'
GROUP BY sc.id, sc.campaign, sc.campaign_group_id;

-- 3. Show spotify_campaigns (songs) for "Segan"
\echo ''
\echo '=== Songs under "Segan" ==='
SELECT 
    sc.id,
    sc.campaign,
    sc.campaign_group_id,
    COUNT(cp.id) as playlist_count
FROM spotify_campaigns sc
LEFT JOIN campaign_playlists cp ON cp.campaign_id = sc.id
WHERE sc.campaign_group_id = 'ef98b550-4722-4dcb-ad24-951565b7ff15'
GROUP BY sc.id, sc.campaign, sc.campaign_group_id;

-- 4. Show which track IDs have playlist data
\echo ''
\echo '=== Track IDs with playlist data ==='
SELECT DISTINCT
    sc.id as campaign_id,
    sc.campaign,
    SUBSTRING(sc.url FROM 'track/([a-zA-Z0-9]+)') as track_id,
    COUNT(cp.id) as playlist_count
FROM spotify_campaigns sc
JOIN campaign_playlists cp ON cp.campaign_id = sc.id
WHERE sc.campaign LIKE '%Segan%'
GROUP BY sc.id, sc.campaign, sc.url;


-- Check if we have playlists for the Segan campaign
-- Campaign ID: be7da8c7-4195-443b-91fa-425182876d82

-- 1. Check the campaign_group
SELECT 
    id,
    name,
    org_id,
    status
FROM campaign_groups 
WHERE id = 'be7da8c7-4195-443b-91fa-425182876d82';

-- 2. Find the spotify_campaigns (songs) for this group
SELECT 
    id,
    campaign,
    campaign_group_id,
    org_id
FROM spotify_campaigns 
WHERE campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82';

-- 3. Check if we have campaign_playlists for those songs
SELECT 
    cp.id,
    cp.campaign_id,
    cp.playlist_name,
    cp.streams_28d,
    cp.is_algorithmic,
    cp.org_id,
    sc.campaign as song_campaign
FROM campaign_playlists cp
LEFT JOIN spotify_campaigns sc ON cp.campaign_id = sc.id
WHERE sc.campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82';

-- 4. Check user membership
SELECT 
    m.user_id,
    m.org_id,
    m.role,
    u.email
FROM memberships m
JOIN users u ON m.user_id = u.id
WHERE m.user_id = '97bf0622-6d2f-4bed-931d-e9134307545f';

-- 5. Check if org_id matches between playlists and user's organization
SELECT 
    'Mismatch!' as warning,
    cp.org_id as playlist_org_id,
    m.org_id as user_org_id
FROM campaign_playlists cp
CROSS JOIN memberships m
WHERE m.user_id = '97bf0622-6d2f-4bed-931d-e9134307545f'
AND cp.org_id != m.org_id
LIMIT 1;


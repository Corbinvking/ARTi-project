-- Run these queries on PRODUCTION database to check playlist data

-- 1. Check if campaign_playlists table has data for this campaign
SELECT 
  cp.*,
  v.name as vendor_name
FROM campaign_playlists cp
LEFT JOIN vendors v ON cp.vendor_id = v.id
WHERE cp.campaign_id IN (
  SELECT id 
  FROM spotify_campaigns 
  WHERE campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82'
)
ORDER BY cp.is_algorithmic DESC, cp.streams_28d DESC;

-- 2. Check which songs belong to this campaign group
SELECT 
  id,
  campaign,
  url,
  sfa
FROM spotify_campaigns
WHERE campaign_group_id = 'be7da8c7-4195-443b-91fa-425182876d82';

-- 3. Check total playlist count in production
SELECT 
  is_algorithmic,
  COUNT(*) as total_playlists,
  SUM(streams_28d) as total_streams
FROM campaign_playlists
GROUP BY is_algorithmic;

-- 4. Check if campaign_playlists has ANY data
SELECT COUNT(*) as total_records FROM campaign_playlists;


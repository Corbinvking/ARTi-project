-- Check for duplicate campaigns
SELECT 
  campaign_name, 
  youtube_url, 
  COUNT(*) as duplicate_count,
  array_agg(id) as campaign_ids
FROM youtube_campaigns 
GROUP BY campaign_name, youtube_url 
HAVING COUNT(*) > 1 
ORDER BY duplicate_count DESC 
LIMIT 20;

-- Check total campaigns
SELECT COUNT(*) as total_campaigns FROM youtube_campaigns;

-- Check campaigns with same name but different URLs
SELECT 
  campaign_name,
  COUNT(DISTINCT youtube_url) as url_count,
  COUNT(*) as total_count
FROM youtube_campaigns
GROUP BY campaign_name
HAVING COUNT(DISTINCT youtube_url) > 1
ORDER BY total_count DESC
LIMIT 10;


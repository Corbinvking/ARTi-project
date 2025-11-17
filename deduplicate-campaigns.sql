-- Deduplicate YouTube Campaigns
-- Keep the most recent version of each duplicate (by created_at)

BEGIN;

-- Show what will be deleted (for safety)
WITH duplicates AS (
  SELECT 
    id,
    campaign_name,
    youtube_url,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_name, youtube_url 
      ORDER BY created_at DESC
    ) as row_num
  FROM youtube_campaigns
)
SELECT 
  COUNT(*) as campaigns_to_delete
FROM duplicates
WHERE row_num > 1;

-- Delete duplicates (keep most recent)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_name, youtube_url 
      ORDER BY created_at DESC, id DESC
    ) as row_num
  FROM youtube_campaigns
)
DELETE FROM youtube_campaigns
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Show results
SELECT 
  'Campaigns remaining' as status,
  COUNT(*) as count
FROM youtube_campaigns;

COMMIT;


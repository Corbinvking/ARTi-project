SELECT campaign_name, current_views, views_7_days 
FROM youtube_campaigns 
WHERE views_7_days IS NOT NULL AND views_7_days > 0 
LIMIT 10;


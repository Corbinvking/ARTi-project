SELECT id, campaign, last_scraped_at, updated_at, streams_12m, streams_7d 
FROM spotify_campaigns 
WHERE campaign ILIKE '%DNBMF%' OR campaign ILIKE '%Segan%' 
LIMIT 5;


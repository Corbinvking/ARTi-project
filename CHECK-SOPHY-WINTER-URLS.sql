-- Check Sophy Winter Spotify URLs

SELECT 
  sc.id,
  cg.name as campaign_name,
  sc.url as spotify_url,
  sc.sfa as sfa_url,
  SUBSTRING(sc.url FROM 'track/([a-zA-Z0-9]+)') as track_id_from_url,
  SUBSTRING(sc.sfa FROM 'song/([a-zA-Z0-9]+)') as track_id_from_sfa
FROM spotify_campaigns sc
JOIN campaign_groups cg ON sc.campaign_group_id = cg.id
JOIN clients c ON cg.client_id = c.id
WHERE c.name ILIKE '%Sophy%Winter%';


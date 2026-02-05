SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'youtube_campaigns' 
AND column_name IN ('internal_notes', 'client_notes');

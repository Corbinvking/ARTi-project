-- Populate client emails from spotify_campaigns data
-- This script extracts unique client emails from spotify_campaigns and updates the clients table

-- Update clients with emails from spotify_campaigns
-- For each client, gather all unique non-empty emails from their campaigns
UPDATE clients c
SET emails = (
  SELECT ARRAY_AGG(DISTINCT sc.client_email)
  FROM spotify_campaigns sc
  WHERE sc.client_id = c.id
    AND sc.client_email IS NOT NULL
    AND sc.client_email != ''
    AND sc.client_email NOT LIKE '%,%'  -- Skip rows with multiple comma-separated emails
);

-- Show clients with emails
SELECT name, emails FROM clients WHERE emails IS NOT NULL AND array_length(emails, 1) > 0 ORDER BY name LIMIT 20;

-- Show count of clients with emails
SELECT 
  COUNT(*) FILTER (WHERE emails IS NOT NULL AND array_length(emails, 1) > 0) as with_emails,
  COUNT(*) FILTER (WHERE emails IS NULL OR array_length(emails, 1) = 0) as without_emails,
  COUNT(*) as total
FROM clients;


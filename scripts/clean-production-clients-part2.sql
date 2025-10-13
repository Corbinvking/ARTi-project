-- Part 2: Clean up remaining garbage client entries
-- Unlink campaigns from invalid clients (notes, emails, descriptions, etc.)
UPDATE spotify_campaigns 
SET client_id = NULL 
WHERE client_id IN (
  SELECT id FROM clients 
  WHERE name LIKE '%,%'
     OR name LIKE '%@%'
     OR name LIKE '%lol%'
     OR name LIKE '%song%'
     OR name LIKE '%dialy%'
     OR name LIKE '%period%'
     OR name LIKE '%.%y%'
     OR name LIKE '%M sc%'
     OR name LIKE '%k for%'
     OR name LIKE '%k SP%'
     OR name LIKE '%MUST%'
     OR name LIKE '%pm%'
     OR name LIKE '%am%'
     OR LENGTH(TRIM(name)) > 50
);

-- Delete invalid clients
DELETE FROM clients 
WHERE name LIKE '%,%'
   OR name LIKE '%@%'
   OR name LIKE '%lol%'
   OR name LIKE '%song%'
   OR name LIKE '%dialy%'
   OR name LIKE '%period%'
   OR name LIKE '%.%y%'
   OR name LIKE '%M sc%'
   OR name LIKE '%k for%'
   OR name LIKE '%k SP%'
   OR name LIKE '%MUST%'
   OR name LIKE '%pm%'
   OR name LIKE '%am%'
   OR LENGTH(TRIM(name)) > 50;

-- Show final count
SELECT COUNT(*) as total_clients FROM clients;


-- Clean up production clients by removing invalid entries
-- and fixing timestamps

-- First, update all clients to have proper timestamps
UPDATE clients 
SET 
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- Delete clients with invalid names (numbers, years, dates, etc.)
DELETE FROM clients 
WHERE name ~ '^\d+$'  -- Pure numbers like "1369", "2", "2017"
   OR name ~ '^\d{4}$'  -- Years like "2017", "2018"
   OR name ~ '^\d{4},\d'  -- Dates like "2025,9/18/2025"
   OR name LIKE '%@%@%'  -- Multiple emails
   OR name LIKE 'checked%'
   OR LENGTH(name) < 2
   OR name IN ('CRP', 'TBD', 'N/A', '80', '2');

-- Show final count
SELECT COUNT(*) as total_clients FROM clients;

-- Fix creators: set org_id so they pass RLS policy
UPDATE creators 
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- Verify
SELECT id, instagram_handle, org_id FROM creators ORDER BY instagram_handle;

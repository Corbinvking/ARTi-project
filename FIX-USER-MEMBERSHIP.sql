-- Create membership for admin user so they can see campaign_playlists

-- Insert membership for the admin user
INSERT INTO memberships (user_id, org_id, role)
VALUES (
  '97bf0622-6d2f-4bed-931d-e9134307545f',  -- admin@arti-demo.com
  '00000000-0000-0000-0000-000000000001',  -- Default org ID
  'admin'
)
ON CONFLICT (user_id, org_id) DO NOTHING;

-- Verify the membership was created
SELECT 
  user_id,
  org_id,
  role,
  created_at
FROM memberships
WHERE user_id = '97bf0622-6d2f-4bed-931d-e9134307545f';


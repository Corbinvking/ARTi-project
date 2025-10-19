-- Fix: Create user and membership without role column

-- 1. Check users table schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Insert user without role column
INSERT INTO users (id, email)
VALUES (
  '97bf0622-6d2f-4bed-931d-e9134307545f',
  'admin@arti-demo.com'
)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 3. Create membership
INSERT INTO memberships (user_id, org_id, role)
VALUES (
  '97bf0622-6d2f-4bed-931d-e9134307545f',
  '00000000-0000-0000-0000-000000000001',
  'admin'
)
ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

-- 4. Verify
SELECT 'User created:' as status;
SELECT id, email FROM users WHERE id = '97bf0622-6d2f-4bed-931d-e9134307545f';

SELECT 'Membership created:' as status;
SELECT user_id, org_id, role FROM memberships WHERE user_id = '97bf0622-6d2f-4bed-931d-e9134307545f';

SELECT 'Now the RLS policy should work!' as result;


-- Check and fix user and membership records

-- 1. Check if user exists in auth.users (Supabase auth table)
SELECT id, email, role FROM auth.users WHERE id = '97bf0622-6d2f-4bed-931d-e9134307545f';

-- 2. Check what's in the users table (if it exists)
SELECT id, email FROM users LIMIT 5;

-- 3. Create user record in users table (if table exists)
INSERT INTO users (id, email, role)
VALUES (
  '97bf0622-6d2f-4bed-931d-e9134307545f',
  'admin@arti-demo.com',
  'admin'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Now create the membership
INSERT INTO memberships (user_id, org_id, role)
VALUES (
  '97bf0622-6d2f-4bed-931d-e9134307545f',
  '00000000-0000-0000-0000-000000000001',
  'admin'
)
ON CONFLICT (user_id, org_id) DO NOTHING;

-- 5. Verify everything
SELECT 'Users table:' as info;
SELECT id, email, role FROM users WHERE id = '97bf0622-6d2f-4bed-931d-e9134307545f';

SELECT 'Memberships table:' as info;
SELECT user_id, org_id, role FROM memberships WHERE user_id = '97bf0622-6d2f-4bed-931d-e9134307545f';


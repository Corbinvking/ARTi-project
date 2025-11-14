-- Fix YouTube campaigns access for authenticated users
-- Run this on production database

-- Option 1: Add your user to the default org memberships
-- Replace 'YOUR_EMAIL@example.com' with your actual login email

DO $$
DECLARE
  user_uuid UUID;
  default_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Find user by email (replace with your email)
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = 'YOUR_EMAIL@example.com' -- <<< CHANGE THIS
  LIMIT 1;
  
  IF user_uuid IS NOT NULL THEN
    -- Add membership if it doesn't exist
    INSERT INTO memberships (user_id, org_id, role, status)
    VALUES (user_uuid, default_org_id, 'admin', 'active')
    ON CONFLICT (user_id, org_id) DO NOTHING;
    
    RAISE NOTICE 'Added user % to default org memberships', user_uuid;
  ELSE
    RAISE NOTICE 'User not found with that email';
  END IF;
END $$;

-- Option 2: Temporary fix - Allow all authenticated users to see YouTube campaigns
-- (Like Spotify campaigns)
DROP POLICY IF EXISTS "Allow authenticated users full access to youtube_campaigns" ON youtube_campaigns;
CREATE POLICY "Allow authenticated users full access to youtube_campaigns"
  ON youtube_campaigns
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Also fix for related tables
DROP POLICY IF EXISTS "Allow authenticated users full access to youtube_clients" ON youtube_clients;
CREATE POLICY "Allow authenticated users full access to youtube_clients"
  ON youtube_clients
  FOR ALL
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users full access to youtube_salespersons" ON youtube_salespersons;
CREATE POLICY "Allow authenticated users full access to youtube_salespersons"
  ON youtube_salespersons
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Verify the fix
SELECT 
  'YouTube Campaigns' as table_name,
  COUNT(*) as total_records
FROM youtube_campaigns
UNION ALL
SELECT 
  'YouTube Clients' as table_name,
  COUNT(*) as total_records  
FROM youtube_clients
UNION ALL
SELECT 
  'YouTube Salespersons' as table_name,
  COUNT(*) as total_records
FROM youtube_salespersons;


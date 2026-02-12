-- Check existing RLS policies on instagram_campaign_creators
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'instagram_campaign_creators';

-- Add permissive read policy for all authenticated users (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'instagram_campaign_creators' 
    AND policyname = 'Allow read access to instagram_campaign_creators'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow read access to instagram_campaign_creators" ON instagram_campaign_creators FOR SELECT USING (true)';
  END IF;
END $$;

-- Add permissive insert policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'instagram_campaign_creators' 
    AND policyname = 'Allow insert to instagram_campaign_creators'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow insert to instagram_campaign_creators" ON instagram_campaign_creators FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- Add permissive update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'instagram_campaign_creators' 
    AND policyname = 'Allow update to instagram_campaign_creators'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow update to instagram_campaign_creators" ON instagram_campaign_creators FOR UPDATE USING (true)';
  END IF;
END $$;

-- Add permissive delete policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'instagram_campaign_creators' 
    AND policyname = 'Allow delete from instagram_campaign_creators'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow delete from instagram_campaign_creators" ON instagram_campaign_creators FOR DELETE USING (true)';
  END IF;
END $$;

-- Verify policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'instagram_campaign_creators';

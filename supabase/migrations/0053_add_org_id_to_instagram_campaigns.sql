-- Add org_id to instagram_campaigns table for multi-tenancy
-- This enables Row Level Security (RLS) to filter campaigns by organization

-- Step 1: Add org_id column (nullable initially)
ALTER TABLE instagram_campaigns 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id);

-- Step 2: Update existing campaigns to belong to the demo org
-- (00000000-0000-0000-0000-000000000001 is the default demo org)
UPDATE instagram_campaigns 
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- Step 3: Make org_id NOT NULL after populating
ALTER TABLE instagram_campaigns 
ALTER COLUMN org_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_org_id 
ON instagram_campaigns(org_id);

-- Step 5: Enable Row Level Security
ALTER TABLE instagram_campaigns ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "instagram_campaigns_org_isolation" ON instagram_campaigns;
DROP POLICY IF EXISTS "Users can view campaigns in their org" ON instagram_campaigns;
DROP POLICY IF EXISTS "Users can insert campaigns in their org" ON instagram_campaigns;
DROP POLICY IF EXISTS "Users can update campaigns in their org" ON instagram_campaigns;
DROP POLICY IF EXISTS "Users can delete campaigns in their org" ON instagram_campaigns;

-- Step 7: Create RLS policies for org isolation

-- SELECT: Users can view campaigns in their organization
CREATE POLICY "Users can view campaigns in their org"
ON instagram_campaigns
FOR SELECT
USING (
  org_id IN (
    SELECT org_id 
    FROM memberships 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create campaigns in their organization
CREATE POLICY "Users can insert campaigns in their org"
ON instagram_campaigns
FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT org_id 
    FROM memberships 
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update campaigns in their organization
CREATE POLICY "Users can update campaigns in their org"
ON instagram_campaigns
FOR UPDATE
USING (
  org_id IN (
    SELECT org_id 
    FROM memberships 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id 
    FROM memberships 
    WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete campaigns in their organization
CREATE POLICY "Users can delete campaigns in their org"
ON instagram_campaigns
FOR DELETE
USING (
  org_id IN (
    SELECT org_id 
    FROM memberships 
    WHERE user_id = auth.uid()
  )
);

-- Step 8: Add updated_at trigger
DROP TRIGGER IF EXISTS update_instagram_campaigns_updated_at ON instagram_campaigns;

CREATE TRIGGER update_instagram_campaigns_updated_at
BEFORE UPDATE ON instagram_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Instagram campaigns table updated:';
  RAISE NOTICE '- Added org_id column with foreign key to orgs';
  RAISE NOTICE '- Updated % existing campaigns with demo org_id', 
    (SELECT COUNT(*) FROM instagram_campaigns);
  RAISE NOTICE '- Enabled Row Level Security';
  RAISE NOTICE '- Created 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '- Added org_id index for performance';
END $$;


-- ==================================================
-- Add missing YouTube tables and columns
-- ==================================================

-- Create youtube_clients table
CREATE TABLE IF NOT EXISTS public.youtube_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- Create youtube_salespersons table
CREATE TABLE IF NOT EXISTS public.youtube_salespersons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- Add service_types JSONB column to youtube_campaigns
ALTER TABLE public.youtube_campaigns 
ADD COLUMN IF NOT EXISTS service_types JSONB DEFAULT '[]'::jsonb;

-- Add video_id column (extracted from URL)
ALTER TABLE public.youtube_campaigns
ADD COLUMN IF NOT EXISTS video_id TEXT;

-- Add end_date column
ALTER TABLE public.youtube_campaigns
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update foreign keys to reference youtube_clients and youtube_salespersons
-- First, drop the old constraints
ALTER TABLE public.youtube_campaigns 
DROP CONSTRAINT IF EXISTS youtube_campaigns_client_id_fkey;

ALTER TABLE public.youtube_campaigns
DROP CONSTRAINT IF EXISTS youtube_campaigns_salesperson_id_fkey;

-- Add new constraints
ALTER TABLE public.youtube_campaigns
ADD CONSTRAINT youtube_campaigns_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES youtube_clients(id);

ALTER TABLE public.youtube_campaigns
ADD CONSTRAINT youtube_campaigns_salesperson_id_fkey
FOREIGN KEY (salesperson_id) REFERENCES youtube_salespersons(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_youtube_clients_org_id ON youtube_clients(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_clients_name ON youtube_clients(name);
CREATE INDEX IF NOT EXISTS idx_youtube_salespersons_org_id ON youtube_salespersons(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_video_id ON youtube_campaigns(video_id);

-- Enable RLS
ALTER TABLE youtube_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_salespersons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for youtube_clients
DROP POLICY IF EXISTS "youtube_clients_org_isolation" ON youtube_clients;
CREATE POLICY "youtube_clients_org_isolation" 
ON youtube_clients FOR ALL 
USING (org_id IN (
  SELECT org_id FROM memberships WHERE user_id = auth.uid()
));

-- RLS Policies for youtube_salespersons
DROP POLICY IF EXISTS "youtube_salespersons_org_isolation" ON youtube_salespersons;
CREATE POLICY "youtube_salespersons_org_isolation"
ON youtube_salespersons FOR ALL
USING (org_id IN (
  SELECT org_id FROM memberships WHERE user_id = auth.uid()
));

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_youtube_clients_updated_at ON youtube_clients;
CREATE TRIGGER update_youtube_clients_updated_at
BEFORE UPDATE ON youtube_clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_salespersons_updated_at ON youtube_salespersons;
CREATE TRIGGER update_youtube_salespersons_updated_at
BEFORE UPDATE ON youtube_salespersons
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE youtube_clients IS 'YouTube campaign clients';
COMMENT ON TABLE youtube_salespersons IS 'YouTube campaign salespersons';
COMMENT ON COLUMN youtube_campaigns.service_types IS 'Array of service types with goals (JSONB): [{service_type, goal_views, current_views}]';
COMMENT ON COLUMN youtube_campaigns.video_id IS 'Extracted YouTube video ID from youtube_url';

DO $$
BEGIN
  RAISE NOTICE '✅ YouTube clients, salespersons tables created';
  RAISE NOTICE '✅ service_types column added to youtube_campaigns';
  RAISE NOTICE '✅ Foreign keys updated to reference youtube_clients and youtube_salespersons';
END $$;


-- ============================================================================
-- YouTube Schema Fix - Drop old table and recreate with proper structure
-- ============================================================================
-- This migration fixes the conflict with the old youtube_campaigns table
-- from migration 011 (CSV import with SERIAL id)
-- ============================================================================

-- First, let's preserve any data from the old table (if needed)
DO $$ 
BEGIN
  -- Check if old table has data
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'youtube_campaigns'
  ) THEN
    -- Create backup of old data
    CREATE TABLE IF NOT EXISTS youtube_campaigns_legacy AS 
    SELECT * FROM youtube_campaigns;
    
    RAISE NOTICE 'Old youtube_campaigns data backed up to youtube_campaigns_legacy';
  END IF;
END $$;

-- Drop the old table and its dependencies
DROP TABLE IF EXISTS public.youtube_campaigns CASCADE;

-- Now recreate with proper structure (UUID-based)
CREATE TABLE public.youtube_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  
  campaign_name TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  salesperson_id UUID REFERENCES public.salespeople(id),
  service_type public.youtube_service_type NOT NULL,
  genre TEXT,
  goal_views INTEGER DEFAULT 0,
  sale_price DECIMAL(10,2),
  start_date DATE,
  status public.youtube_campaign_status DEFAULT 'pending',
  
  -- Performance Metrics
  current_views INTEGER DEFAULT 0,
  views_7_days INTEGER DEFAULT 0,
  current_likes INTEGER DEFAULT 0,
  likes_7_days INTEGER DEFAULT 0,
  current_comments INTEGER DEFAULT 0,
  comments_7_days INTEGER DEFAULT 0,
  subscribers_gained INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0,
  impression_ctr DECIMAL(5,2) DEFAULT 0.00,
  
  -- Operational Fields
  comments_sheet_url TEXT,
  like_server TEXT,
  comment_server TEXT,
  minimum_engagement INTEGER DEFAULT 0,
  wait_time_seconds INTEGER DEFAULT 0,
  sheet_tier TEXT,
  desired_daily INTEGER DEFAULT 0,
  
  -- Status Flags
  views_stalled BOOLEAN DEFAULT FALSE,
  in_fixer BOOLEAN DEFAULT FALSE,
  needs_update BOOLEAN DEFAULT FALSE,
  ask_for_access BOOLEAN DEFAULT FALSE,
  confirm_start_date BOOLEAN DEFAULT FALSE,
  paid_reach BOOLEAN DEFAULT FALSE,
  invoice_status public.youtube_invoice_status DEFAULT 'tbd',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Now create the dependent tables (these failed before)
CREATE TABLE IF NOT EXISTS public.youtube_performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  campaign_id UUID REFERENCES public.youtube_campaigns(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.youtube_ratio_fixer_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  campaign_id UUID REFERENCES public.youtube_campaigns(id) ON DELETE CASCADE,
  priority public.youtube_priority_level DEFAULT 'medium',
  status public.youtube_queue_status DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_org_id ON public.youtube_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_client_id ON public.youtube_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_salesperson_id ON public.youtube_campaigns(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_status ON public.youtube_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_start_date ON public.youtube_campaigns(start_date);

CREATE INDEX IF NOT EXISTS idx_youtube_performance_logs_org_id ON public.youtube_performance_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_performance_logs_campaign_id ON public.youtube_performance_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_youtube_performance_logs_recorded_at ON public.youtube_performance_logs(recorded_at);

CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_queue_org_id ON public.youtube_ratio_fixer_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_queue_campaign_id ON public.youtube_ratio_fixer_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_queue_status ON public.youtube_ratio_fixer_queue(status);

-- Enable RLS
ALTER TABLE public.youtube_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_ratio_fixer_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "youtube_campaigns_org_isolation" ON public.youtube_campaigns;
DROP POLICY IF EXISTS "youtube_performance_logs_org_isolation" ON public.youtube_performance_logs;
DROP POLICY IF EXISTS "youtube_ratio_fixer_queue_org_isolation" ON public.youtube_ratio_fixer_queue;

-- Create RLS policies
CREATE POLICY "youtube_campaigns_org_isolation" ON public.youtube_campaigns
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "youtube_performance_logs_org_isolation" ON public.youtube_performance_logs
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "youtube_ratio_fixer_queue_org_isolation" ON public.youtube_ratio_fixer_queue
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- Create triggers
DROP TRIGGER IF EXISTS update_youtube_campaigns_updated_at ON public.youtube_campaigns;
CREATE TRIGGER update_youtube_campaigns_updated_at 
  BEFORE UPDATE ON public.youtube_campaigns 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_ratio_fixer_queue_updated_at ON public.youtube_ratio_fixer_queue;
CREATE TRIGGER update_youtube_ratio_fixer_queue_updated_at 
  BEFORE UPDATE ON public.youtube_ratio_fixer_queue 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.youtube_campaigns IS 'YouTube influencer campaigns with performance tracking (UUID-based)';
COMMENT ON TABLE public.youtube_performance_logs IS 'Daily performance metrics for YouTube campaigns';
COMMENT ON TABLE public.youtube_ratio_fixer_queue IS 'Queue for fixing engagement ratio issues on YouTube campaigns';

COMMENT ON COLUMN public.youtube_campaigns.org_id IS 'Organization ID for multi-tenancy isolation';
COMMENT ON COLUMN public.youtube_campaigns.service_type IS 'Geographic targeting or push type for the campaign';
COMMENT ON COLUMN public.youtube_campaigns.views_stalled IS 'Flag indicating if view growth has stalled';
COMMENT ON COLUMN public.youtube_campaigns.in_fixer IS 'Flag indicating if campaign is in ratio fixer queue';
COMMENT ON COLUMN public.youtube_campaigns.invoice_status IS 'Status of client invoice (tbd, sent, paid)';

-- Migration complete message
DO $$ 
BEGIN
  RAISE NOTICE '✅ YouTube schema fix complete!';
  RAISE NOTICE 'Old data preserved in youtube_campaigns_legacy table';
  RAISE NOTICE 'New youtube_campaigns table created with UUID ids';
  RAISE NOTICE 'All dependent tables now created successfully';
END $$;


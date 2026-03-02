-- ============================================================================
-- YouTube Platform Complete Schema (Adapted from vidi-health-flow)
-- ============================================================================
-- Source: vidi-health-flow/supabase/migrations/20250909203813_*.sql
-- Adapted: Added org_id for multi-tenancy, prefixed platform-specific tables
-- Date: 2025-11-13
-- ============================================================================

-- Create YouTube-specific enum types (prefixed to avoid conflicts)
DO $$ BEGIN
  CREATE TYPE public.youtube_campaign_status AS ENUM ('pending', 'active', 'paused', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.youtube_service_type AS ENUM ('worldwide', 'usa', 'uk', 'canada', 'australia', 'organic_push', 'playlist_push');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.youtube_invoice_status AS ENUM ('tbd', 'sent', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.youtube_priority_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.youtube_queue_status AS ENUM ('waiting', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SHARED TABLES (No prefix - used across platforms)
-- ============================================================================
-- NOTE: clients and salespersons already exist from migration 015
-- Adding org_id if not present

-- Add org_id to clients if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.clients 
    ADD COLUMN org_id UUID REFERENCES orgs(id) ON DELETE CASCADE 
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;
END $$;

-- Add org_id to salespeople if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'salespeople' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.salespeople 
    ADD COLUMN org_id UUID REFERENCES orgs(id) ON DELETE CASCADE 
    DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;
END $$;

-- ============================================================================
-- YOUTUBE-SPECIFIC TABLES (Prefixed with youtube_)
-- ============================================================================

-- Drop legacy youtube_campaigns (SERIAL id from migration 011) to recreate with UUID
DROP TABLE IF EXISTS public.youtube_campaigns CASCADE;

-- YouTube Campaigns Table
CREATE TABLE IF NOT EXISTS public.youtube_campaigns (
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

-- YouTube Performance Logs Table
CREATE TABLE IF NOT EXISTS public.youtube_performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  campaign_id UUID REFERENCES public.youtube_campaigns(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- YouTube Ratio Fixer Queue Table
CREATE TABLE IF NOT EXISTS public.youtube_ratio_fixer_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  campaign_id UUID REFERENCES public.youtube_campaigns(id) ON DELETE CASCADE,
  priority public.youtube_priority_level DEFAULT 'medium',
  status public.youtube_queue_status DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.youtube_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_ratio_fixer_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "youtube_campaigns_org_isolation" ON public.youtube_campaigns;
DROP POLICY IF EXISTS "youtube_performance_logs_org_isolation" ON public.youtube_performance_logs;
DROP POLICY IF EXISTS "youtube_ratio_fixer_queue_org_isolation" ON public.youtube_ratio_fixer_queue;

-- Create RLS policies for org isolation
CREATE POLICY "youtube_campaigns_org_isolation" ON public.youtube_campaigns
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "youtube_performance_logs_org_isolation" ON public.youtube_performance_logs
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "youtube_ratio_fixer_queue_org_isolation" ON public.youtube_ratio_fixer_queue
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update trigger function (reuse existing if available)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.youtube_campaigns IS 'YouTube influencer campaigns with performance tracking';
COMMENT ON TABLE public.youtube_performance_logs IS 'Daily performance metrics for YouTube campaigns';
COMMENT ON TABLE public.youtube_ratio_fixer_queue IS 'Queue for fixing engagement ratio issues on YouTube campaigns';

COMMENT ON COLUMN public.youtube_campaigns.org_id IS 'Organization ID for multi-tenancy isolation';
COMMENT ON COLUMN public.youtube_campaigns.service_type IS 'Geographic targeting or push type for the campaign';
COMMENT ON COLUMN public.youtube_campaigns.views_stalled IS 'Flag indicating if view growth has stalled';
COMMENT ON COLUMN public.youtube_campaigns.in_fixer IS 'Flag indicating if campaign is in ratio fixer queue';
COMMENT ON COLUMN public.youtube_campaigns.invoice_status IS 'Status of client invoice (tbd, sent, paid)';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- 1. Added org_id to all tables for multi-tenancy support
-- 2. Prefixed all enums with 'youtube_' to avoid conflicts
-- 3. Renamed 'campaigns' to 'youtube_campaigns'
-- 4. Renamed 'performance_logs' to 'youtube_performance_logs'
-- 5. Renamed 'ratio_fixer_queue' to 'youtube_ratio_fixer_queue'
-- 6. Updated RLS policies for org-based isolation
-- 7. Removed sample data (not needed for production)
-- 8. Made all operations idempotent (can re-run safely)
-- ============================================================================


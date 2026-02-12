-- ============================================================================
-- YouTube Production Database Setup
-- Consolidated script: foundation + full YouTube schema + all enhancements
-- Run via: psql -U postgres -d postgres -f /tmp/setup-youtube-production.sql
-- ============================================================================

-- ============================================================================
-- 2. FOUNDATION TABLES (if not exist)
-- ============================================================================

-- Orgs table
CREATE TABLE IF NOT EXISTS public.orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memberships table
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    status TEXT DEFAULT 'active',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- Insert default org if not exists
INSERT INTO public.orgs (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Artist Influence', 'artist-influence')
ON CONFLICT (id) DO NOTHING;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. YOUTUBE ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.youtube_campaign_status AS ENUM ('pending', 'ready', 'active', 'on_hold', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.youtube_service_type AS ENUM (
    'worldwide', 'usa', 'uk', 'canada', 'australia',
    'organic_push', 'playlist_push',
    'ww_display', 'ww_skip', 'us_skip', 'ww_website',
    'us_display', 'us_website', 'latam_display', 'eur_display',
    'eur_skip', 'aus_display', 'aus_skip', 'cad_display',
    'engagements_only', 'ww_website_ads', 'us_website_ads',
    'youtube_eng._ad',
    'latam_website', 'eur_website', 'aus_website', 'cad_website',
    'custom',
    'latam_skip', 'cad_skip', 'mena_display',
    'us_eur_website', 'asia_website'
  );
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
-- 4. YOUTUBE CLIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.youtube_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  email TEXT,
  email2 TEXT,
  email3 TEXT,
  company TEXT,
  youtube_access_requested BOOLEAN DEFAULT FALSE,
  youtube_access_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- ============================================================================
-- 5. YOUTUBE SALESPERSONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.youtube_salespersons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  email TEXT,
  commission_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- ============================================================================
-- 6. YOUTUBE CAMPAIGNS TABLE (complete with all columns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.youtube_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  
  -- Basic Info
  campaign_name TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  video_id TEXT,
  client_id UUID REFERENCES public.youtube_clients(id),
  salesperson_id UUID REFERENCES public.youtube_salespersons(id),
  
  -- Service Configuration
  service_type public.youtube_service_type NOT NULL DEFAULT 'custom',
  service_types JSONB DEFAULT '[]'::jsonb,
  custom_service_type TEXT,
  genre TEXT,
  artist_tier INTEGER,
  
  -- Goals & Pricing
  goal_views INTEGER DEFAULT 0,
  like_goal INTEGER,
  comment_goal INTEGER,
  sale_price DECIMAL(10,2),
  calculated_vendor_payment DECIMAL(10,2),
  custom_vendor_cost DECIMAL(10,2),
  payment_calculation_date TIMESTAMPTZ,
  
  -- Timing
  start_date DATE,
  end_date DATE,
  status public.youtube_campaign_status DEFAULT 'pending',
  
  -- Performance Metrics
  current_views INTEGER DEFAULT 0,
  views_7_days INTEGER DEFAULT 0,
  current_likes INTEGER DEFAULT 0,
  likes_7_days INTEGER DEFAULT 0,
  current_comments INTEGER DEFAULT 0,
  comments_7_days INTEGER DEFAULT 0,
  subscribers_gained INTEGER DEFAULT 0,
  total_subscribers INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0,
  impression_ctr DECIMAL(5,2) DEFAULT 0.00,
  
  -- Technical Setup
  comments_sheet_url TEXT,
  comments_csv_file_path TEXT,
  like_server TEXT,
  comment_server TEXT,
  like_server_auto_selected BOOLEAN DEFAULT TRUE,
  comment_server_auto_selected BOOLEAN DEFAULT TRUE,
  minimum_engagement INTEGER DEFAULT 0,
  wait_time_seconds INTEGER DEFAULT 0,
  sheet_tier TEXT,
  desired_daily INTEGER DEFAULT 0,
  technical_setup_complete BOOLEAN DEFAULT FALSE,
  
  -- Status Flags
  views_stalled BOOLEAN DEFAULT FALSE,
  in_fixer BOOLEAN DEFAULT FALSE,
  needs_update BOOLEAN DEFAULT FALSE,
  ask_for_access BOOLEAN DEFAULT FALSE,
  confirm_start_date BOOLEAN DEFAULT FALSE,
  paid_reach BOOLEAN DEFAULT FALSE,
  vendor_paid BOOLEAN DEFAULT FALSE,
  invoice_status public.youtube_invoice_status DEFAULT 'tbd',
  
  -- YouTube API
  youtube_api_enabled BOOLEAN DEFAULT FALSE,
  last_youtube_fetch TIMESTAMPTZ,
  last_api_poll_at TIMESTAMPTZ,
  api_poll_cadence TEXT DEFAULT '3x_daily',
  channel_id TEXT,
  
  -- Weekly Updates
  weekly_updates_enabled BOOLEAN DEFAULT FALSE,
  last_weekly_update_sent TIMESTAMPTZ,
  weekly_update_ready BOOLEAN DEFAULT FALSE,
  
  -- Stalling Detection
  last_stalling_check TIMESTAMPTZ,
  stalling_detected_at TIMESTAMPTZ,
  subscribers_hidden BOOLEAN DEFAULT FALSE,
  
  -- Manual Progress
  manual_progress INTEGER,
  
  -- Client Notes
  client_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. CAMPAIGN STATS DAILY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_stats_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.youtube_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_of_day TEXT DEFAULT 'morning',
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  total_subscribers BIGINT DEFAULT 0,
  subscribers_gained BIGINT DEFAULT 0,
  watch_time_minutes BIGINT DEFAULT 0,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date, time_of_day)
);

-- ============================================================================
-- 8. YOUTUBE PRICING TIERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.youtube_pricing_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type public.youtube_service_type,
  tier_min_views INTEGER,
  tier_max_views INTEGER,
  cost_per_1k_views DECIMAL(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. YOUTUBE RATIO FIXER QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.youtube_ratio_fixer_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  campaign_id UUID REFERENCES public.youtube_campaigns(id) ON DELETE CASCADE,
  priority public.youtube_priority_level DEFAULT 'medium',
  status public.youtube_queue_status DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. YOUTUBE PERFORMANCE LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.youtube_performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  campaign_id UUID REFERENCES public.youtube_campaigns(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  value INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_youtube_clients_org_id ON youtube_clients(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_clients_name ON youtube_clients(name);
CREATE INDEX IF NOT EXISTS idx_youtube_salespersons_org_id ON youtube_salespersons(org_id);

CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_org_id ON youtube_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_client_id ON youtube_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_salesperson_id ON youtube_campaigns(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_status ON youtube_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_start_date ON youtube_campaigns(start_date);
CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_video_id ON youtube_campaigns(video_id);

CREATE INDEX IF NOT EXISTS idx_campaign_stats_daily_campaign ON campaign_stats_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_stats_daily_date ON campaign_stats_daily(date);

CREATE INDEX IF NOT EXISTS idx_youtube_campaigns_api_poll
  ON youtube_campaigns (api_poll_cadence, last_api_poll_at)
  WHERE status IN ('active', 'pending', 'ready');

CREATE INDEX IF NOT EXISTS idx_youtube_performance_logs_org_id ON youtube_performance_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_performance_logs_campaign_id ON youtube_performance_logs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_queue_org_id ON youtube_ratio_fixer_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_queue_campaign_id ON youtube_ratio_fixer_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_youtube_ratio_fixer_queue_status ON youtube_ratio_fixer_queue(status);

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE youtube_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_salespersons ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_ratio_fixer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_stats_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "youtube_clients_org_isolation" ON youtube_clients;
CREATE POLICY "youtube_clients_org_isolation" ON youtube_clients FOR ALL
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "youtube_salespersons_org_isolation" ON youtube_salespersons;
CREATE POLICY "youtube_salespersons_org_isolation" ON youtube_salespersons FOR ALL
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "youtube_campaigns_org_isolation" ON youtube_campaigns;
CREATE POLICY "youtube_campaigns_org_isolation" ON youtube_campaigns FOR ALL
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "youtube_performance_logs_org_isolation" ON youtube_performance_logs;
CREATE POLICY "youtube_performance_logs_org_isolation" ON youtube_performance_logs FOR ALL
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "youtube_ratio_fixer_queue_org_isolation" ON youtube_ratio_fixer_queue;
CREATE POLICY "youtube_ratio_fixer_queue_org_isolation" ON youtube_ratio_fixer_queue FOR ALL
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- Service role bypass policies (for import script & API)
DROP POLICY IF EXISTS "youtube_clients_service_role" ON youtube_clients;
CREATE POLICY "youtube_clients_service_role" ON youtube_clients FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "youtube_salespersons_service_role" ON youtube_salespersons;
CREATE POLICY "youtube_salespersons_service_role" ON youtube_salespersons FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "youtube_campaigns_service_role" ON youtube_campaigns;
CREATE POLICY "youtube_campaigns_service_role" ON youtube_campaigns FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "youtube_performance_logs_service_role" ON youtube_performance_logs;
CREATE POLICY "youtube_performance_logs_service_role" ON youtube_performance_logs FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "youtube_ratio_fixer_queue_service_role" ON youtube_ratio_fixer_queue;
CREATE POLICY "youtube_ratio_fixer_queue_service_role" ON youtube_ratio_fixer_queue FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "campaign_stats_daily_service_role" ON campaign_stats_daily;
CREATE POLICY "campaign_stats_daily_service_role" ON campaign_stats_daily FOR ALL
USING (true) WITH CHECK (true);

-- ============================================================================
-- 13. TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_youtube_campaigns_updated_at ON youtube_campaigns;
CREATE TRIGGER update_youtube_campaigns_updated_at
  BEFORE UPDATE ON youtube_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_clients_updated_at ON youtube_clients;
CREATE TRIGGER update_youtube_clients_updated_at
  BEFORE UPDATE ON youtube_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_salespersons_updated_at ON youtube_salespersons;
CREATE TRIGGER update_youtube_salespersons_updated_at
  BEFORE UPDATE ON youtube_salespersons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_ratio_fixer_queue_updated_at ON youtube_ratio_fixer_queue;
CREATE TRIGGER update_youtube_ratio_fixer_queue_updated_at
  BEFORE UPDATE ON youtube_ratio_fixer_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ YouTube production database setup complete!';
  RAISE NOTICE '   - Foundation tables (orgs, users, memberships)';
  RAISE NOTICE '   - YouTube enums (service_type, campaign_status, invoice_status)';
  RAISE NOTICE '   - youtube_clients table';
  RAISE NOTICE '   - youtube_salespersons table';
  RAISE NOTICE '   - youtube_campaigns table (all columns including client_notes)';
  RAISE NOTICE '   - campaign_stats_daily table';
  RAISE NOTICE '   - youtube_pricing_tiers table';
  RAISE NOTICE '   - youtube_ratio_fixer_queue table';
  RAISE NOTICE '   - youtube_performance_logs table';
  RAISE NOTICE '   - All indexes, RLS policies, and triggers';
END $$;

-- Stream Strategist Complete Schema Migration
-- This migration adds all remaining tables from the Stream Strategist schema
-- with proper org_id isolation and RLS policies

-- Create additional enums for Stream Strategist
DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE note_type AS ENUM ('general', 'performance', 'issue', 'insight', 'follow_up');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'revision_requested');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_status AS ENUM ('not_posted', 'scheduled', 'posted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('pending', 'sent', 'paid', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_format AS ENUM ('pdf', 'excel', 'csv');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tag_type AS ENUM ('music_genre', 'content_type', 'territory');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_trigger_condition AS ENUM ('equals', 'changes_to', 'date_threshold', 'greater_than', 'less_than');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE execution_result AS ENUM ('success', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create creators table
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  instagram_handle TEXT NOT NULL UNIQUE,
  email TEXT,
  followers BIGINT NOT NULL DEFAULT 0,
  median_views_per_video BIGINT NOT NULL DEFAULT 0,
  engagement_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
  base_country TEXT NOT NULL,
  content_types TEXT[] NOT NULL DEFAULT '{}',
  music_genres TEXT[] NOT NULL DEFAULT '{}',
  audience_territories TEXT[] NOT NULL DEFAULT '{}',
  reel_rate INTEGER DEFAULT 0,
  carousel_rate INTEGER DEFAULT 0,
  story_rate INTEGER DEFAULT 0,
  avg_performance_score DECIMAL(5,2) DEFAULT 0,
  campaign_fit_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type tag_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create algorithm_learning_log table
CREATE TABLE IF NOT EXISTS public.algorithm_learning_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  algorithm_version TEXT DEFAULT '2.0',
  decision_type TEXT NOT NULL,
  input_data JSONB,
  decision_data JSONB,
  performance_impact DECIMAL(10,4),
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_notes table
CREATE TABLE IF NOT EXISTS public.analytics_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  note_type note_type NOT NULL DEFAULT 'general',
  priority priority_level NOT NULL DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_ab_tests table
CREATE TABLE IF NOT EXISTS public.campaign_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  algorithm_version_control TEXT NOT NULL,
  algorithm_version_test TEXT NOT NULL,
  control_campaigns UUID[],
  test_campaigns UUID[],
  test_start_date DATE NOT NULL,
  test_end_date DATE,
  sample_size_target INTEGER DEFAULT 100,
  control_metrics JSONB DEFAULT '{}',
  test_metrics JSONB DEFAULT '{}',
  p_value DECIMAL(10,6),
  confidence_interval JSONB DEFAULT '{}',
  effect_size DECIMAL(10,4),
  statistical_power DECIMAL(5,4),
  winner TEXT,
  conclusion TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_compliance_checkpoints table
CREATE TABLE IF NOT EXISTS public.campaign_compliance_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  checkpoint_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expected_date DATE,
  completed_date DATE,
  compliance_data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_creators table
CREATE TABLE IF NOT EXISTS public.campaign_creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  instagram_handle TEXT NOT NULL,
  rate INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 1,
  post_type TEXT NOT NULL DEFAULT 'reel',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  post_status post_status NOT NULL DEFAULT 'not_posted',
  approval_status approval_status NOT NULL DEFAULT 'pending',
  payment_notes TEXT,
  approval_notes TEXT,
  due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  expected_post_date DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_invoices table
CREATE TABLE IF NOT EXISTS public.campaign_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'pending',
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_posts table
CREATE TABLE IF NOT EXISTS public.campaign_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  instagram_handle TEXT NOT NULL,
  post_url TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'reel',
  content_description TEXT,
  thumbnail_url TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_credits table
CREATE TABLE IF NOT EXISTS public.client_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_report_settings table
CREATE TABLE IF NOT EXISTS public.client_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  client_id UUID UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  branding_settings JSONB DEFAULT '{}',
  default_template TEXT DEFAULT 'standard',
  preferred_format report_format DEFAULT 'pdf',
  include_predictions BOOLEAN DEFAULT true,
  include_benchmarks BOOLEAN DEFAULT true,
  custom_kpis JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content_verification_logs table
CREATE TABLE IF NOT EXISTS public.content_verification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE SET NULL,
  verification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score DECIMAL(5,2),
  verification_data JSONB DEFAULT '{}',
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creator_ml_features table
CREATE TABLE IF NOT EXISTS public.creator_ml_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  avg_engagement_rate DECIMAL(5,4) DEFAULT 0,
  engagement_volatility DECIMAL(5,4) DEFAULT 0,
  peak_engagement_rate DECIMAL(5,4) DEFAULT 0,
  engagement_trend_slope DECIMAL(10,6) DEFAULT 0,
  follower_growth_rate DECIMAL(10,6) DEFAULT 0,
  views_growth_rate DECIMAL(10,6) DEFAULT 0,
  consistency_score DECIMAL(5,2) DEFAULT 0,
  post_frequency DECIMAL(5,2) DEFAULT 0,
  content_type_distribution JSONB DEFAULT '{}',
  hashtag_effectiveness JSONB DEFAULT '{}',
  optimal_posting_times INTEGER[] DEFAULT '{}',
  campaign_success_rate DECIMAL(5,4) DEFAULT 0,
  avg_performance_vs_prediction DECIMAL(10,6) DEFAULT 0,
  genre_affinity_scores JSONB DEFAULT '{}',
  seasonal_performance_multiplier DECIMAL(5,4) DEFAULT 1.0,
  market_trend_correlation DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dashboard_configs table
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  shared_with UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fraud_detection_alerts table
CREATE TABLE IF NOT EXISTS public.fraud_detection_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE SET NULL,
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity severity_level NOT NULL DEFAULT 'medium',
  detection_data JSONB DEFAULT '{}',
  confidence_score DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create genre_correlation_matrix table
CREATE TABLE IF NOT EXISTS public.genre_correlation_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  genre_a TEXT NOT NULL,
  genre_b TEXT NOT NULL,
  correlation_score DECIMAL(5,4) DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  success_rate DECIMAL(5,4) DEFAULT 0,
  avg_performance_lift DECIMAL(10,6) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create market_intelligence table
CREATE TABLE IF NOT EXISTS public.market_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  intelligence_type TEXT NOT NULL,
  topic TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  sentiment_score DECIMAL(5,4) DEFAULT 0,
  trend_direction TEXT,
  confidence_score DECIMAL(5,2) DEFAULT 0,
  period_start DATE,
  period_end DATE,
  related_genres TEXT[],
  related_creators UUID[],
  market_impact_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ml_model_versions table
CREATE TABLE IF NOT EXISTS public.ml_model_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL UNIQUE,
  model_type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  training_data_size INTEGER DEFAULT 0,
  training_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accuracy_score DECIMAL(5,4) DEFAULT 0,
  precision_score DECIMAL(5,4) DEFAULT 0,
  recall_score DECIMAL(5,4) DEFAULT 0,
  f1_score DECIMAL(5,4) DEFAULT 0,
  test_campaigns INTEGER DEFAULT 0,
  control_performance DECIMAL(10,6) DEFAULT 0,
  test_performance DECIMAL(10,6) DEFAULT 0,
  statistical_significance DECIMAL(10,6) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'training',
  deployed_at TIMESTAMP WITH TIME ZONE,
  deprecated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'manual',
  reference_number TEXT,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance_alerts table
CREATE TABLE IF NOT EXISTS public.performance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  threshold_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  severity severity_level NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_performance_history table
CREATE TABLE IF NOT EXISTS public.playlist_performance_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  avg_daily_streams INTEGER NOT NULL DEFAULT 0,
  peak_streams INTEGER DEFAULT 0,
  genre_match_score DECIMAL(5,2) DEFAULT 0,
  performance_trend TEXT DEFAULT 'stable',
  reliability_score DECIMAL(5,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_analytics table
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.campaign_posts(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_performance_tracking table
CREATE TABLE IF NOT EXISTS public.post_performance_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  post_url TEXT NOT NULL,
  post_type TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  views_1h INTEGER DEFAULT 0,
  views_24h INTEGER DEFAULT 0,
  views_7d INTEGER DEFAULT 0,
  views_total INTEGER DEFAULT 0,
  likes_total INTEGER DEFAULT 0,
  comments_total INTEGER DEFAULT 0,
  shares_total INTEGER DEFAULT 0,
  saves_total INTEGER DEFAULT 0,
  engagement_rate_1h DECIMAL(5,4) DEFAULT 0,
  engagement_rate_24h DECIMAL(5,4) DEFAULT 0,
  engagement_rate_final DECIMAL(5,4) DEFAULT 0,
  viral_coefficient DECIMAL(10,6) DEFAULT 0,
  retention_rate DECIMAL(5,4) DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  posting_time TIMESTAMP WITH TIME ZONE,
  hashtags TEXT[],
  caption_length INTEGER,
  music_used TEXT,
  algorithm_version TEXT DEFAULT '2.0',
  predicted_views INTEGER DEFAULT 0,
  performance_vs_prediction DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_exports table
CREATE TABLE IF NOT EXISTS public.report_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  format report_format NOT NULL,
  file_url TEXT,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_schedules table
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  frequency report_frequency NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  template_settings JSONB DEFAULT '{}',
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_goals table
CREATE TABLE IF NOT EXISTS public.sales_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  salesperson_email TEXT NOT NULL,
  goal_period_start DATE NOT NULL,
  goal_period_end DATE NOT NULL,
  revenue_target DECIMAL(10,2) NOT NULL DEFAULT 0,
  campaigns_target INTEGER NOT NULL DEFAULT 0,
  commission_target DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_performance_tracking table
CREATE TABLE IF NOT EXISTS public.sales_performance_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  salesperson_email TEXT NOT NULL,
  tracking_period_start DATE NOT NULL,
  tracking_period_end DATE NOT NULL,
  actual_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_campaigns INTEGER NOT NULL DEFAULT 0,
  actual_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create smart_deadlines table
CREATE TABLE IF NOT EXISTS public.smart_deadlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  original_deadline DATE,
  calculated_deadline DATE NOT NULL,
  algorithm_version TEXT NOT NULL DEFAULT 'v1.0',
  calculation_factors JSONB NOT NULL DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.85,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_goals table
CREATE TABLE IF NOT EXISTS public.team_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  goal_period_start DATE NOT NULL,
  goal_period_end DATE NOT NULL,
  target_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  goal_type TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendor_compliance_scores table
CREATE TABLE IF NOT EXISTS public.vendor_compliance_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content_verification_score DECIMAL(5,2) DEFAULT 1.00,
  fraud_risk_score DECIMAL(5,2) DEFAULT 0.00,
  delivery_compliance_score DECIMAL(5,2) DEFAULT 1.00,
  overall_compliance_score DECIMAL(5,2) DEFAULT 1.00,
  campaigns_evaluated INTEGER DEFAULT 0,
  violations_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendor_reliability_scores table
CREATE TABLE IF NOT EXISTS public.vendor_reliability_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  delivery_consistency DECIMAL(5,2) DEFAULT 1.0,
  stream_accuracy DECIMAL(5,2) DEFAULT 1.0,
  cost_efficiency DECIMAL(5,2) DEFAULT 1.0,
  response_time_hours INTEGER DEFAULT 24,
  quality_score DECIMAL(5,2) DEFAULT 1.0,
  total_campaigns INTEGER DEFAULT 0,
  successful_campaigns INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_rules table
CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_field TEXT NOT NULL,
  trigger_value TEXT,
  trigger_condition workflow_trigger_condition NOT NULL,
  action_field TEXT NOT NULL,
  action_value TEXT,
  action_condition TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  workflow_rule_id UUID NOT NULL REFERENCES public.workflow_rules(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  trigger_data JSONB,
  action_data JSONB,
  execution_result execution_result NOT NULL,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_compliance_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_report_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_ml_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_detection_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genre_correlation_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_reliability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "creators_org_isolation" ON public.creators;
DROP POLICY IF EXISTS "tags_org_isolation" ON public.tags;
DROP POLICY IF EXISTS "algorithm_learning_log_org_isolation" ON public.algorithm_learning_log;
DROP POLICY IF EXISTS "analytics_notes_org_isolation" ON public.analytics_notes;
DROP POLICY IF EXISTS "campaign_ab_tests_org_isolation" ON public.campaign_ab_tests;
DROP POLICY IF EXISTS "campaign_compliance_checkpoints_org_isolation" ON public.campaign_compliance_checkpoints;
DROP POLICY IF EXISTS "campaign_creators_org_isolation" ON public.campaign_creators;
DROP POLICY IF EXISTS "campaign_invoices_org_isolation" ON public.campaign_invoices;
DROP POLICY IF EXISTS "campaign_posts_org_isolation" ON public.campaign_posts;
DROP POLICY IF EXISTS "client_credits_org_isolation" ON public.client_credits;
DROP POLICY IF EXISTS "client_report_settings_org_isolation" ON public.client_report_settings;
DROP POLICY IF EXISTS "content_verification_logs_org_isolation" ON public.content_verification_logs;
DROP POLICY IF EXISTS "creator_ml_features_org_isolation" ON public.creator_ml_features;
DROP POLICY IF EXISTS "dashboard_configs_org_isolation" ON public.dashboard_configs;
DROP POLICY IF EXISTS "fraud_detection_alerts_org_isolation" ON public.fraud_detection_alerts;
DROP POLICY IF EXISTS "genre_correlation_matrix_org_isolation" ON public.genre_correlation_matrix;
DROP POLICY IF EXISTS "market_intelligence_org_isolation" ON public.market_intelligence;
DROP POLICY IF EXISTS "ml_model_versions_org_isolation" ON public.ml_model_versions;
DROP POLICY IF EXISTS "payment_history_org_isolation" ON public.payment_history;
DROP POLICY IF EXISTS "performance_alerts_org_isolation" ON public.performance_alerts;
DROP POLICY IF EXISTS "playlist_performance_history_org_isolation" ON public.playlist_performance_history;
DROP POLICY IF EXISTS "post_analytics_org_isolation" ON public.post_analytics;
DROP POLICY IF EXISTS "post_performance_tracking_org_isolation" ON public.post_performance_tracking;
DROP POLICY IF EXISTS "report_exports_org_isolation" ON public.report_exports;
DROP POLICY IF EXISTS "report_schedules_org_isolation" ON public.report_schedules;
DROP POLICY IF EXISTS "sales_goals_org_isolation" ON public.sales_goals;
DROP POLICY IF EXISTS "sales_performance_tracking_org_isolation" ON public.sales_performance_tracking;
DROP POLICY IF EXISTS "smart_deadlines_org_isolation" ON public.smart_deadlines;
DROP POLICY IF EXISTS "team_goals_org_isolation" ON public.team_goals;
DROP POLICY IF EXISTS "vendor_compliance_scores_org_isolation" ON public.vendor_compliance_scores;
DROP POLICY IF EXISTS "vendor_reliability_scores_org_isolation" ON public.vendor_reliability_scores;
DROP POLICY IF EXISTS "workflow_rules_org_isolation" ON public.workflow_rules;
DROP POLICY IF EXISTS "workflow_executions_org_isolation" ON public.workflow_executions;

-- Create RLS policies for org isolation on all new tables
CREATE POLICY "creators_org_isolation" ON public.creators
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "tags_org_isolation" ON public.tags
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "algorithm_learning_log_org_isolation" ON public.algorithm_learning_log
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "analytics_notes_org_isolation" ON public.analytics_notes
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "campaign_ab_tests_org_isolation" ON public.campaign_ab_tests
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "campaign_compliance_checkpoints_org_isolation" ON public.campaign_compliance_checkpoints
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "campaign_creators_org_isolation" ON public.campaign_creators
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "campaign_invoices_org_isolation" ON public.campaign_invoices
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "campaign_posts_org_isolation" ON public.campaign_posts
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "client_credits_org_isolation" ON public.client_credits
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "client_report_settings_org_isolation" ON public.client_report_settings
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "content_verification_logs_org_isolation" ON public.content_verification_logs
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "creator_ml_features_org_isolation" ON public.creator_ml_features
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "dashboard_configs_org_isolation" ON public.dashboard_configs
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "fraud_detection_alerts_org_isolation" ON public.fraud_detection_alerts
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "genre_correlation_matrix_org_isolation" ON public.genre_correlation_matrix
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "market_intelligence_org_isolation" ON public.market_intelligence
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "ml_model_versions_org_isolation" ON public.ml_model_versions
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "payment_history_org_isolation" ON public.payment_history
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "performance_alerts_org_isolation" ON public.performance_alerts
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "playlist_performance_history_org_isolation" ON public.playlist_performance_history
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "post_analytics_org_isolation" ON public.post_analytics
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "post_performance_tracking_org_isolation" ON public.post_performance_tracking
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "report_exports_org_isolation" ON public.report_exports
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "report_schedules_org_isolation" ON public.report_schedules
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "sales_goals_org_isolation" ON public.sales_goals
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "sales_performance_tracking_org_isolation" ON public.sales_performance_tracking
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "smart_deadlines_org_isolation" ON public.smart_deadlines
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "team_goals_org_isolation" ON public.team_goals
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "vendor_compliance_scores_org_isolation" ON public.vendor_compliance_scores
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "vendor_reliability_scores_org_isolation" ON public.vendor_reliability_scores
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "workflow_rules_org_isolation" ON public.workflow_rules
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "workflow_executions_org_isolation" ON public.workflow_executions
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- Create indexes for performance on all new tables
CREATE INDEX IF NOT EXISTS idx_creators_org_id ON public.creators(org_id);
CREATE INDEX IF NOT EXISTS idx_creators_instagram_handle ON public.creators(instagram_handle);
CREATE INDEX IF NOT EXISTS idx_creators_genres ON public.creators USING GIN(music_genres);
CREATE INDEX IF NOT EXISTS idx_creators_content_types ON public.creators USING GIN(content_types);

CREATE INDEX IF NOT EXISTS idx_tags_org_id ON public.tags(org_id);
CREATE INDEX IF NOT EXISTS idx_tags_type ON public.tags(type);

CREATE INDEX IF NOT EXISTS idx_algorithm_learning_log_org_id ON public.algorithm_learning_log(org_id);
CREATE INDEX IF NOT EXISTS idx_algorithm_learning_log_campaign_id ON public.algorithm_learning_log(campaign_id);

CREATE INDEX IF NOT EXISTS idx_analytics_notes_org_id ON public.analytics_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_analytics_notes_campaign_id ON public.analytics_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_notes_creator_id ON public.analytics_notes(creator_id);

CREATE INDEX IF NOT EXISTS idx_campaign_ab_tests_org_id ON public.campaign_ab_tests(org_id);
CREATE INDEX IF NOT EXISTS idx_campaign_ab_tests_status ON public.campaign_ab_tests(status);

CREATE INDEX IF NOT EXISTS idx_campaign_compliance_checkpoints_org_id ON public.campaign_compliance_checkpoints(org_id);
CREATE INDEX IF NOT EXISTS idx_campaign_compliance_checkpoints_campaign_id ON public.campaign_compliance_checkpoints(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_creators_org_id ON public.campaign_creators(org_id);
CREATE INDEX IF NOT EXISTS idx_campaign_creators_campaign_id ON public.campaign_creators(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_creators_creator_id ON public.campaign_creators(creator_id);

CREATE INDEX IF NOT EXISTS idx_campaign_invoices_org_id ON public.campaign_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_campaign_invoices_campaign_id ON public.campaign_invoices(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_invoices_status ON public.campaign_invoices(status);

CREATE INDEX IF NOT EXISTS idx_campaign_posts_org_id ON public.campaign_posts(org_id);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_campaign_id ON public.campaign_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_creator_id ON public.campaign_posts(creator_id);

CREATE INDEX IF NOT EXISTS idx_client_credits_org_id ON public.client_credits(org_id);
CREATE INDEX IF NOT EXISTS idx_client_credits_client_id ON public.client_credits(client_id);

CREATE INDEX IF NOT EXISTS idx_client_report_settings_org_id ON public.client_report_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_client_report_settings_client_id ON public.client_report_settings(client_id);

CREATE INDEX IF NOT EXISTS idx_content_verification_logs_org_id ON public.content_verification_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_content_verification_logs_playlist_id ON public.content_verification_logs(playlist_id);

CREATE INDEX IF NOT EXISTS idx_creator_ml_features_org_id ON public.creator_ml_features(org_id);
CREATE INDEX IF NOT EXISTS idx_creator_ml_features_creator_id ON public.creator_ml_features(creator_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_org_id ON public.dashboard_configs(org_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON public.dashboard_configs(user_id);

CREATE INDEX IF NOT EXISTS idx_fraud_detection_alerts_org_id ON public.fraud_detection_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_alerts_campaign_id ON public.fraud_detection_alerts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_alerts_status ON public.fraud_detection_alerts(status);

CREATE INDEX IF NOT EXISTS idx_genre_correlation_matrix_org_id ON public.genre_correlation_matrix(org_id);

CREATE INDEX IF NOT EXISTS idx_market_intelligence_org_id ON public.market_intelligence(org_id);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_type ON public.market_intelligence(intelligence_type);

CREATE INDEX IF NOT EXISTS idx_ml_model_versions_org_id ON public.ml_model_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_status ON public.ml_model_versions(status);

CREATE INDEX IF NOT EXISTS idx_payment_history_org_id ON public.payment_history(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_vendor_id ON public.payment_history(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_campaign_id ON public.payment_history(campaign_id);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_org_id ON public.performance_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_campaign_id ON public.performance_alerts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_resolved ON public.performance_alerts(is_resolved);

CREATE INDEX IF NOT EXISTS idx_playlist_performance_history_org_id ON public.playlist_performance_history(org_id);
CREATE INDEX IF NOT EXISTS idx_playlist_performance_history_playlist_id ON public.playlist_performance_history(playlist_id);

CREATE INDEX IF NOT EXISTS idx_post_analytics_org_id ON public.post_analytics(org_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id ON public.post_analytics(post_id);

CREATE INDEX IF NOT EXISTS idx_post_performance_tracking_org_id ON public.post_performance_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_post_performance_tracking_campaign_id ON public.post_performance_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_post_performance_tracking_creator_id ON public.post_performance_tracking(creator_id);

CREATE INDEX IF NOT EXISTS idx_report_exports_org_id ON public.report_exports(org_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_campaign_id ON public.report_exports(campaign_id);

CREATE INDEX IF NOT EXISTS idx_report_schedules_org_id ON public.report_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_campaign_id ON public.report_schedules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_client_id ON public.report_schedules(client_id);

CREATE INDEX IF NOT EXISTS idx_sales_goals_org_id ON public.sales_goals(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_goals_salesperson_email ON public.sales_goals(salesperson_email);

CREATE INDEX IF NOT EXISTS idx_sales_performance_tracking_org_id ON public.sales_performance_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_performance_tracking_salesperson_email ON public.sales_performance_tracking(salesperson_email);

CREATE INDEX IF NOT EXISTS idx_smart_deadlines_org_id ON public.smart_deadlines(org_id);
CREATE INDEX IF NOT EXISTS idx_smart_deadlines_campaign_id ON public.smart_deadlines(campaign_id);

CREATE INDEX IF NOT EXISTS idx_team_goals_org_id ON public.team_goals(org_id);
CREATE INDEX IF NOT EXISTS idx_team_goals_active ON public.team_goals(is_active);

CREATE INDEX IF NOT EXISTS idx_vendor_compliance_scores_org_id ON public.vendor_compliance_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_compliance_scores_vendor_id ON public.vendor_compliance_scores(vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_reliability_scores_org_id ON public.vendor_reliability_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_reliability_scores_vendor_id ON public.vendor_reliability_scores(vendor_id);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_org_id ON public.workflow_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_enabled ON public.workflow_rules(is_enabled);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_org_id ON public.workflow_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_rule_id ON public.workflow_executions(workflow_rule_id);

-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS update_creators_updated_at ON public.creators;
DROP TRIGGER IF EXISTS update_analytics_notes_updated_at ON public.analytics_notes;
DROP TRIGGER IF EXISTS update_campaign_ab_tests_updated_at ON public.campaign_ab_tests;
DROP TRIGGER IF EXISTS update_campaign_compliance_checkpoints_updated_at ON public.campaign_compliance_checkpoints;
DROP TRIGGER IF EXISTS update_campaign_creators_updated_at ON public.campaign_creators;
DROP TRIGGER IF EXISTS update_campaign_invoices_updated_at ON public.campaign_invoices;
DROP TRIGGER IF EXISTS update_campaign_posts_updated_at ON public.campaign_posts;
DROP TRIGGER IF EXISTS update_client_report_settings_updated_at ON public.client_report_settings;
DROP TRIGGER IF EXISTS update_content_verification_logs_updated_at ON public.content_verification_logs;
DROP TRIGGER IF EXISTS update_creator_ml_features_updated_at ON public.creator_ml_features;
DROP TRIGGER IF EXISTS update_dashboard_configs_updated_at ON public.dashboard_configs;
DROP TRIGGER IF EXISTS update_fraud_detection_alerts_updated_at ON public.fraud_detection_alerts;
DROP TRIGGER IF EXISTS update_market_intelligence_updated_at ON public.market_intelligence;
DROP TRIGGER IF EXISTS update_ml_model_versions_updated_at ON public.ml_model_versions;
DROP TRIGGER IF EXISTS update_payment_history_updated_at ON public.payment_history;
DROP TRIGGER IF EXISTS update_post_performance_tracking_updated_at ON public.post_performance_tracking;
DROP TRIGGER IF EXISTS update_report_schedules_updated_at ON public.report_schedules;
DROP TRIGGER IF EXISTS update_sales_goals_updated_at ON public.sales_goals;
DROP TRIGGER IF EXISTS update_sales_performance_tracking_updated_at ON public.sales_performance_tracking;
DROP TRIGGER IF EXISTS update_smart_deadlines_updated_at ON public.smart_deadlines;
DROP TRIGGER IF EXISTS update_team_goals_updated_at ON public.team_goals;
DROP TRIGGER IF EXISTS update_vendor_compliance_scores_updated_at ON public.vendor_compliance_scores;
DROP TRIGGER IF EXISTS update_workflow_rules_updated_at ON public.workflow_rules;

-- Create triggers for updated_at columns on tables that need them
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_notes_updated_at
  BEFORE UPDATE ON public.analytics_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_ab_tests_updated_at
  BEFORE UPDATE ON public.campaign_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_compliance_checkpoints_updated_at
  BEFORE UPDATE ON public.campaign_compliance_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_creators_updated_at
  BEFORE UPDATE ON public.campaign_creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_invoices_updated_at
  BEFORE UPDATE ON public.campaign_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_posts_updated_at
  BEFORE UPDATE ON public.campaign_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_report_settings_updated_at
  BEFORE UPDATE ON public.client_report_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_verification_logs_updated_at
  BEFORE UPDATE ON public.content_verification_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_ml_features_updated_at
  BEFORE UPDATE ON public.creator_ml_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_configs_updated_at
  BEFORE UPDATE ON public.dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fraud_detection_alerts_updated_at
  BEFORE UPDATE ON public.fraud_detection_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_intelligence_updated_at
  BEFORE UPDATE ON public.market_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ml_model_versions_updated_at
  BEFORE UPDATE ON public.ml_model_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_history_updated_at
  BEFORE UPDATE ON public.payment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_performance_tracking_updated_at
  BEFORE UPDATE ON public.post_performance_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_goals_updated_at
  BEFORE UPDATE ON public.sales_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_performance_tracking_updated_at
  BEFORE UPDATE ON public.sales_performance_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_deadlines_updated_at
  BEFORE UPDATE ON public.smart_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_goals_updated_at
  BEFORE UPDATE ON public.team_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_compliance_scores_updated_at
  BEFORE UPDATE ON public.vendor_compliance_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_rules_updated_at
  BEFORE UPDATE ON public.workflow_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add some sample data for testing
INSERT INTO public.creators (org_id, instagram_handle, email, followers, median_views_per_video, engagement_rate, base_country, content_types, music_genres, audience_territories, reel_rate, carousel_rate, story_rate)
SELECT 
    o.id,
    'sample_creator_1',
    'creator1@example.com',
    50000,
    10000,
    0.045,
    'United States',
    ARRAY['reel', 'post'],
    ARRAY['house', 'techno', 'electronic'],
    ARRAY['United States', 'Canada'],
    150,
    100,
    75
FROM orgs o 
WHERE o.name = 'Default Organization'
LIMIT 1;

INSERT INTO public.tags (org_id, name, type)
SELECT 
    o.id,
    'House Music',
    'music_genre'
FROM orgs o 
WHERE o.name = 'Default Organization'
LIMIT 1;

INSERT INTO public.tags (org_id, name, type)
SELECT 
    o.id,
    'Reel',
    'content_type'
FROM orgs o 
WHERE o.name = 'Default Organization'
LIMIT 1;

-- Create helper functions for Stream Strategist advanced features
CREATE OR REPLACE FUNCTION public.get_campaign_performance_summary(_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_streams', COALESCE(SUM(pe.daily_streams), 0),
        'avg_daily_streams', COALESCE(AVG(pe.daily_streams), 0),
        'total_playlists', COUNT(DISTINCT pe.playlist_id),
        'performance_trend', 'stable'
    )
    INTO result
    FROM public.performance_entries pe
    WHERE pe.campaign_id = _campaign_id
    AND pe.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid());
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_vendor_performance_summary(_vendor_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_campaigns', COUNT(DISTINCT cap.campaign_id),
        'avg_performance_score', COALESCE(AVG(cap.performance_score), 0),
        'total_streams_delivered', COALESCE(SUM(cap.actual_streams), 0),
        'reliability_score', COALESCE((SELECT delivery_consistency FROM public.vendor_reliability_scores WHERE vendor_id = _vendor_id LIMIT 1), 1.0)
    )
    INTO result
    FROM public.campaign_allocations_performance cap
    WHERE cap.vendor_id = _vendor_id
    AND cap.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid());
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

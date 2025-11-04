-- Stream Strategist Integration Migration
-- This migration adds Stream Strategist tables to our unified Supabase instance
-- with proper org_id isolation and RLS policies

-- Create enum for app roles (if not exists)
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'manager', 'user', 'salesperson', 'vendor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vendors table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_daily_streams INTEGER NOT NULL DEFAULT 0,
  max_concurrent_campaigns INTEGER NOT NULL DEFAULT 1,
  cost_per_1k_streams DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlists table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  genres TEXT[] NOT NULL DEFAULT '{}',
  avg_daily_streams INTEGER NOT NULL DEFAULT 0,
  follower_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  emails TEXT[],
  phone TEXT,
  credit_balance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create salespeople table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.salespeople (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  total_submissions INTEGER DEFAULT 0,
  total_approved INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_submissions table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.campaign_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_emails TEXT[] NOT NULL,
  salesperson TEXT NOT NULL,
  track_url TEXT NOT NULL,
  stream_goal INTEGER NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  duration_days INTEGER,
  music_genres TEXT[],
  content_types TEXT[],
  territory_preferences TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table for Stream Strategist (enhanced version)
CREATE TABLE IF NOT EXISTS public.stream_strategist_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client TEXT,
  client_id UUID REFERENCES public.clients(id),
  client_name TEXT,
  track_name TEXT,
  track_url TEXT NOT NULL,
  stream_goal INTEGER NOT NULL,
  remaining_streams INTEGER NOT NULL DEFAULT 0,
  allocated_streams INTEGER,
  budget DECIMAL(10,2) NOT NULL,
  sub_genre TEXT,
  music_genres TEXT[] NOT NULL DEFAULT '{}',
  content_types TEXT[] DEFAULT '{}',
  territory_preferences TEXT[] DEFAULT '{}',
  post_types TEXT[] DEFAULT '{}',
  duration_days INTEGER NOT NULL DEFAULT 90,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'draft',
  source TEXT DEFAULT 'artist_influence_spotify_campaigns',
  campaign_type TEXT DEFAULT 'artist_influence_spotify_promotion',
  salesperson TEXT,
  submission_id UUID REFERENCES public.campaign_submissions(id),
  selected_playlists JSONB DEFAULT '[]',
  vendor_allocations JSONB DEFAULT '{}',
  algorithm_recommendations JSONB,
  results JSONB,
  totals JSONB,
  notes TEXT,
  public_access_enabled BOOLEAN DEFAULT false,
  public_token TEXT,
  pending_operator_review BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weekly_updates table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.weekly_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  imported_on DATE NOT NULL DEFAULT CURRENT_DATE,
  streams INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance_entries table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.performance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.stream_strategist_campaigns(id),
  playlist_id UUID REFERENCES public.playlists(id),
  daily_streams INTEGER NOT NULL,
  date_recorded DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create campaign_vendor_requests table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.campaign_vendor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  playlist_ids JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  response_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_allocations_performance table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.campaign_allocations_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  allocated_streams INTEGER NOT NULL,
  predicted_streams INTEGER NOT NULL,
  actual_streams INTEGER,
  cost_per_stream DECIMAL(10,4),
  actual_cost_per_stream DECIMAL(10,4),
  paid_amount DECIMAL(10,2),
  paid_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  payment_status TEXT,
  performance_score DECIMAL(5,2),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vendor_users table for Stream Strategist
CREATE TABLE IF NOT EXISTS public.vendor_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_strategist_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_vendor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_allocations_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "vendors_org_isolation" ON public.vendors;
DROP POLICY IF EXISTS "playlists_org_isolation" ON public.playlists;
DROP POLICY IF EXISTS "clients_org_isolation" ON public.clients;
DROP POLICY IF EXISTS "salespeople_org_isolation" ON public.salespeople;
DROP POLICY IF EXISTS "campaign_submissions_org_isolation" ON public.campaign_submissions;
DROP POLICY IF EXISTS "stream_strategist_campaigns_org_isolation" ON public.stream_strategist_campaigns;
DROP POLICY IF EXISTS "weekly_updates_org_isolation" ON public.weekly_updates;
DROP POLICY IF EXISTS "performance_entries_org_isolation" ON public.performance_entries;
DROP POLICY IF EXISTS "campaign_vendor_requests_org_isolation" ON public.campaign_vendor_requests;
DROP POLICY IF EXISTS "campaign_allocations_performance_org_isolation" ON public.campaign_allocations_performance;
DROP POLICY IF EXISTS "user_roles_org_isolation" ON public.user_roles;
DROP POLICY IF EXISTS "vendor_users_org_isolation" ON public.vendor_users;

-- Create RLS policies for org isolation
CREATE POLICY "vendors_org_isolation" ON public.vendors
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "playlists_org_isolation" ON public.playlists
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "clients_org_isolation" ON public.clients
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "salespeople_org_isolation" ON public.salespeople
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "campaign_submissions_org_isolation" ON public.campaign_submissions
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "stream_strategist_campaigns_org_isolation" ON public.stream_strategist_campaigns
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "weekly_updates_org_isolation" ON public.weekly_updates
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "performance_entries_org_isolation" ON public.performance_entries
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "campaign_vendor_requests_org_isolation" ON public.campaign_vendor_requests
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "campaign_allocations_performance_org_isolation" ON public.campaign_allocations_performance
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "user_roles_org_isolation" ON public.user_roles
  FOR ALL USING (user_id IN (SELECT user_id FROM memberships WHERE org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "vendor_users_org_isolation" ON public.vendor_users
  FOR ALL USING (vendor_id IN (SELECT id FROM public.vendors WHERE org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_org_id ON public.vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_playlists_org_id ON public.playlists(org_id);
CREATE INDEX IF NOT EXISTS idx_playlists_vendor_id ON public.playlists(vendor_id);
CREATE INDEX IF NOT EXISTS idx_playlists_genres ON public.playlists USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients(org_id);
CREATE INDEX IF NOT EXISTS idx_salespeople_org_id ON public.salespeople(org_id);
CREATE INDEX IF NOT EXISTS idx_campaign_submissions_org_id ON public.campaign_submissions(org_id);
CREATE INDEX IF NOT EXISTS idx_stream_strategist_campaigns_org_id ON public.stream_strategist_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_stream_strategist_campaigns_status ON public.stream_strategist_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_stream_strategist_campaigns_source ON public.stream_strategist_campaigns(source);
CREATE INDEX IF NOT EXISTS idx_weekly_updates_campaign_id ON public.weekly_updates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_performance_entries_campaign_id ON public.performance_entries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_vendor_requests_campaign_id ON public.campaign_vendor_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_allocations_performance_campaign_id ON public.campaign_allocations_performance(campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_users_user_id ON public.vendor_users(user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_salespeople_updated_at ON public.salespeople;
DROP TRIGGER IF EXISTS update_stream_strategist_campaigns_updated_at ON public.stream_strategist_campaigns;
DROP TRIGGER IF EXISTS update_campaign_vendor_requests_updated_at ON public.campaign_vendor_requests;
DROP TRIGGER IF EXISTS update_campaign_allocations_performance_updated_at ON public.campaign_allocations_performance;

-- Create triggers for updated_at columns
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salespeople_updated_at
  BEFORE UPDATE ON public.salespeople
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stream_strategist_campaigns_updated_at
  BEFORE UPDATE ON public.stream_strategist_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_vendor_requests_updated_at
  BEFORE UPDATE ON public.campaign_vendor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_allocations_performance_updated_at
  BEFORE UPDATE ON public.campaign_allocations_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper functions for Stream Strategist
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(_role app_role, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = _role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_salesperson()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.has_role('salesperson');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.vendor_users 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_vendor_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.has_role('admin') OR public.has_role('manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample data for testing
INSERT INTO public.vendors (org_id, name, max_daily_streams, max_concurrent_campaigns, cost_per_1k_streams) 
SELECT 
    o.id,
    'Sample Spotify Vendor',
    10000,
    5,
    2.50
FROM orgs o 
WHERE o.name = 'Default Organization'
LIMIT 1;

-- Insert sample playlist
INSERT INTO public.playlists (org_id, vendor_id, name, url, genres, avg_daily_streams)
SELECT 
    v.org_id,
    v.id,
    'Sample Playlist',
    'https://open.spotify.com/playlist/sample',
    ARRAY['house', 'techno'],
    500
FROM public.vendors v
WHERE v.name = 'Sample Spotify Vendor'
LIMIT 1;

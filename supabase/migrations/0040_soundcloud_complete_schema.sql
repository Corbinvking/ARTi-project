-- ============================================================================
-- SoundCloud Platform Complete Schema (Adapted from artist-spark)
-- ============================================================================
-- Source: artist-spark/supabase/migrations/20250819063414_*.sql
-- Adapted: Added org_id for multi-tenancy, prefixed platform-specific tables
-- Date: 2025-11-13
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SOUNDCLOUD-SPECIFIC ENUMS (Prefixed to avoid conflicts)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.soundcloud_member_status AS ENUM ('active', 'needs_reconnect');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.soundcloud_size_tier AS ENUM ('T1', 'T2', 'T3', 'T4');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.soundcloud_submission_status AS ENUM ('new', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.soundcloud_inquiry_status AS ENUM ('undecided', 'admitted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.soundcloud_complaint_status AS ENUM ('todo', 'in_progress', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.soundcloud_target_band_mode AS ENUM ('balance', 'size');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SOUNDCLOUD GENRE TAXONOMY TABLES
-- ============================================================================

-- Genre Families (Top-level genres)
CREATE TABLE IF NOT EXISTS public.soundcloud_genre_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id, name)
);

-- Subgenres (Nested under families)
CREATE TABLE IF NOT EXISTS public.soundcloud_subgenres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  family_id UUID REFERENCES public.soundcloud_genre_families(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  patterns TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id, family_id, name)
);

-- ============================================================================
-- SOUNDCLOUD CORE TABLES
-- ============================================================================

-- Members (SoundCloud reposting artists)
CREATE TABLE IF NOT EXISTS public.soundcloud_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  size_tier public.soundcloud_size_tier DEFAULT 'T1',
  families TEXT[] DEFAULT '{}',
  subgenres TEXT[] DEFAULT '{}',
  emails TEXT[] DEFAULT '{}' CHECK (array_length(emails, 1) <= 5),
  primary_email TEXT,
  status public.soundcloud_member_status DEFAULT 'active',
  last_submission_at TIMESTAMP WITH TIME ZONE,
  
  -- Limits and fairness
  monthly_submission_limit INTEGER DEFAULT 4,
  submissions_this_month INTEGER DEFAULT 0,
  monthly_credit_limit INTEGER DEFAULT 1000,
  reach_factor DECIMAL(4,3) DEFAULT 0.060,
  credits_given INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  net_credits INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Submissions (Track submissions from artists)
CREATE TABLE IF NOT EXISTS public.soundcloud_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  member_id UUID REFERENCES public.soundcloud_members(id) ON DELETE CASCADE NOT NULL,
  track_url TEXT NOT NULL,
  artist_name TEXT,
  subgenres TEXT[] DEFAULT '{}',
  family TEXT,
  status public.soundcloud_submission_status DEFAULT 'new',
  support_date DATE,
  support_url TEXT,
  need_live_link BOOLEAN DEFAULT false,
  suggested_supporters UUID[] DEFAULT '{}',
  expected_reach_min INTEGER DEFAULT 0,
  expected_reach_max INTEGER DEFAULT 0,
  expected_reach_planned INTEGER DEFAULT 0,
  qa_flag BOOLEAN DEFAULT false,
  qa_reason TEXT,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  owner_id UUID REFERENCES auth.users(id),
  resend_message_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inquiries (Membership applications)
CREATE TABLE IF NOT EXISTS public.soundcloud_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  soundcloud_url TEXT,
  status public.soundcloud_inquiry_status DEFAULT 'undecided',
  admitted_group TEXT,
  admitted_at TIMESTAMP WITH TIME ZONE,
  member_id UUID REFERENCES public.soundcloud_members(id),
  ip_join_confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id),
  resend_message_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Complaints (Issue tracking)
CREATE TABLE IF NOT EXISTS public.soundcloud_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  email TEXT NOT NULL,
  song_url TEXT,
  notes TEXT,
  status public.soundcloud_complaint_status DEFAULT 'todo',
  owner_id UUID REFERENCES auth.users(id),
  ack_sent_at TIMESTAMP WITH TIME ZONE,
  resend_message_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Mail Events (Email delivery tracking)
CREATE TABLE IF NOT EXISTS public.soundcloud_mail_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  message_id TEXT NOT NULL,
  object_type TEXT NOT NULL CHECK (object_type IN ('submission', 'inquiry', 'complaint', 'member')),
  object_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  meta JSONB DEFAULT '{}'
);

-- Settings (Platform configuration - singleton per org)
CREATE TABLE IF NOT EXISTS public.soundcloud_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  decision_sla_hours INTEGER DEFAULT 24,
  proof_sla_hours INTEGER DEFAULT 24,
  inactivity_days INTEGER DEFAULT 90,
  preview_cache_days INTEGER DEFAULT 30,
  default_reach_factor DECIMAL(4,3) DEFAULT 0.060,
  target_band_mode public.soundcloud_target_band_mode DEFAULT 'balance',
  size_tier_thresholds JSONB DEFAULT '{"T1": {"min": 0, "max": 1000}, "T2": {"min": 1000, "max": 10000}, "T3": {"min": 10000, "max": 100000}, "T4": {"min": 100000, "max": 999999999}}',
  adjacency_matrix JSONB DEFAULT '{}',
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook TEXT,
  slack_channel TEXT DEFAULT '#soundcloud-groups',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Genre indexes
CREATE INDEX IF NOT EXISTS idx_soundcloud_genre_families_org_id ON public.soundcloud_genre_families(org_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_subgenres_org_id ON public.soundcloud_subgenres(org_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_subgenres_family_id ON public.soundcloud_subgenres(family_id);

-- Member indexes
CREATE INDEX IF NOT EXISTS idx_soundcloud_members_org_id ON public.soundcloud_members(org_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_members_emails ON public.soundcloud_members USING GIN(emails);
CREATE INDEX IF NOT EXISTS idx_soundcloud_members_status ON public.soundcloud_members(status);
CREATE INDEX IF NOT EXISTS idx_soundcloud_members_size_tier ON public.soundcloud_members(size_tier);

-- Submission indexes
CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_org_id ON public.soundcloud_submissions(org_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_status ON public.soundcloud_submissions(status);
CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_member_id ON public.soundcloud_submissions(member_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_support_date ON public.soundcloud_submissions(support_date);

-- Inquiry indexes
CREATE INDEX IF NOT EXISTS idx_soundcloud_inquiries_org_id ON public.soundcloud_inquiries(org_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_inquiries_status ON public.soundcloud_inquiries(status);

-- Complaint indexes
CREATE INDEX IF NOT EXISTS idx_soundcloud_complaints_org_id ON public.soundcloud_complaints(org_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_complaints_status ON public.soundcloud_complaints(status);

-- Mail event indexes
CREATE INDEX IF NOT EXISTS idx_soundcloud_mail_events_org_id ON public.soundcloud_mail_events(org_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_mail_events_message_id ON public.soundcloud_mail_events(message_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_mail_events_object ON public.soundcloud_mail_events(object_type, object_id);

-- Settings index
CREATE INDEX IF NOT EXISTS idx_soundcloud_settings_org_id ON public.soundcloud_settings(org_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.soundcloud_genre_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soundcloud_subgenres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soundcloud_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soundcloud_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soundcloud_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soundcloud_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soundcloud_mail_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soundcloud_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "soundcloud_genre_families_org_isolation" ON public.soundcloud_genre_families;
DROP POLICY IF EXISTS "soundcloud_subgenres_org_isolation" ON public.soundcloud_subgenres;
DROP POLICY IF EXISTS "soundcloud_members_org_isolation" ON public.soundcloud_members;
DROP POLICY IF EXISTS "soundcloud_submissions_org_isolation" ON public.soundcloud_submissions;
DROP POLICY IF EXISTS "soundcloud_inquiries_org_isolation" ON public.soundcloud_inquiries;
DROP POLICY IF EXISTS "soundcloud_complaints_org_isolation" ON public.soundcloud_complaints;
DROP POLICY IF EXISTS "soundcloud_mail_events_org_isolation" ON public.soundcloud_mail_events;
DROP POLICY IF EXISTS "soundcloud_settings_org_isolation" ON public.soundcloud_settings;

-- Create RLS policies for org isolation
CREATE POLICY "soundcloud_genre_families_org_isolation" ON public.soundcloud_genre_families
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "soundcloud_subgenres_org_isolation" ON public.soundcloud_subgenres
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "soundcloud_members_org_isolation" ON public.soundcloud_members
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "soundcloud_submissions_org_isolation" ON public.soundcloud_submissions
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "soundcloud_inquiries_org_isolation" ON public.soundcloud_inquiries
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "soundcloud_complaints_org_isolation" ON public.soundcloud_complaints
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "soundcloud_mail_events_org_isolation" ON public.soundcloud_mail_events
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "soundcloud_settings_org_isolation" ON public.soundcloud_settings
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get member ID for a user (SoundCloud-specific)
CREATE OR REPLACE FUNCTION public.soundcloud_get_member_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.soundcloud_members 
  WHERE _user_id::text = ANY(emails)
  LIMIT 1
$$;

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
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_soundcloud_genre_families_updated_at ON public.soundcloud_genre_families;
CREATE TRIGGER update_soundcloud_genre_families_updated_at 
  BEFORE UPDATE ON public.soundcloud_genre_families 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_soundcloud_subgenres_updated_at ON public.soundcloud_subgenres;
CREATE TRIGGER update_soundcloud_subgenres_updated_at 
  BEFORE UPDATE ON public.soundcloud_subgenres 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_soundcloud_members_updated_at ON public.soundcloud_members;
CREATE TRIGGER update_soundcloud_members_updated_at 
  BEFORE UPDATE ON public.soundcloud_members 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_soundcloud_submissions_updated_at ON public.soundcloud_submissions;
CREATE TRIGGER update_soundcloud_submissions_updated_at 
  BEFORE UPDATE ON public.soundcloud_submissions 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_soundcloud_inquiries_updated_at ON public.soundcloud_inquiries;
CREATE TRIGGER update_soundcloud_inquiries_updated_at 
  BEFORE UPDATE ON public.soundcloud_inquiries 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_soundcloud_complaints_updated_at ON public.soundcloud_complaints;
CREATE TRIGGER update_soundcloud_complaints_updated_at 
  BEFORE UPDATE ON public.soundcloud_complaints 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_soundcloud_settings_updated_at ON public.soundcloud_settings;
CREATE TRIGGER update_soundcloud_settings_updated_at 
  BEFORE UPDATE ON public.soundcloud_settings 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.soundcloud_members IS 'SoundCloud reposting artists with T1-T4 tier system and credit tracking';
COMMENT ON TABLE public.soundcloud_submissions IS 'Track submissions from artists requesting SoundCloud reposts';
COMMENT ON TABLE public.soundcloud_inquiries IS 'Membership applications from potential SoundCloud reposters';
COMMENT ON TABLE public.soundcloud_complaints IS 'Issue tracking and complaint management';
COMMENT ON TABLE public.soundcloud_genre_families IS 'Top-level genre taxonomy for SoundCloud content';
COMMENT ON TABLE public.soundcloud_subgenres IS 'Nested subgenres with pattern matching for classification';

COMMENT ON COLUMN public.soundcloud_members.size_tier IS 'T1 (<1k), T2 (1-10k), T3 (10-100k), T4 (>100k followers)';
COMMENT ON COLUMN public.soundcloud_members.net_credits IS 'Credits given minus credits used';
COMMENT ON COLUMN public.soundcloud_members.reach_factor IS 'Expected reach per repost (default 0.060 = 6%)';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- 1. Added org_id to all tables for multi-tenancy support
-- 2. Prefixed all tables with 'soundcloud_'
-- 3. Prefixed all enums with 'soundcloud_'
-- 4. Updated RLS policies for org-based isolation
-- 5. Removed sample data inserts (not needed for production)
-- 6. Made all operations idempotent (can re-run safely)
-- 7. Kept user_roles table unprefixed (shared across platforms)
-- 8. Created SoundCloud-specific helper function
-- ============================================================================


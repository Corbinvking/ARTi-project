-- ============================================================================
-- SoundCloud Manual Overrides & Paid Workflow Enhancement
-- ============================================================================
-- This migration adds:
-- 1. Scheduling date override fields
-- 2. Channel selection override fields
-- 3. Repost limits override (admin-only)
-- 4. Paid workflow enhancement (playlist required status)
-- 5. Campaign type differentiation (paid vs free)
-- ============================================================================

-- ============================================================================
-- ADD OVERRIDE FIELDS TO submissions TABLE
-- ============================================================================

-- Scheduling Override Fields
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS suggested_date DATE,
ADD COLUMN IF NOT EXISTS date_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_override_reason TEXT,
ADD COLUMN IF NOT EXISTS date_override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS date_override_at TIMESTAMP WITH TIME ZONE;

-- Channel Selection Override Fields
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS suggested_channels UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_channels UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS channel_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS channel_override_reason TEXT,
ADD COLUMN IF NOT EXISTS channel_size_mismatch_acknowledged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS channel_override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS channel_override_at TIMESTAMP WITH TIME ZONE;

-- Repost Limits Override Fields (Admin-only)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS repost_limit_per_profile INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS repost_limit_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS repost_limit_override_reason TEXT,
ADD COLUMN IF NOT EXISTS repost_limit_override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS repost_limit_override_at TIMESTAMP WITH TIME ZONE;

-- Paid Workflow Fields
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'free' CHECK (campaign_type IN ('paid', 'free')),
ADD COLUMN IF NOT EXISTS playlist_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playlist_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playlist_url TEXT,
ADD COLUMN IF NOT EXISTS playlist_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_id UUID,
ADD COLUMN IF NOT EXISTS tracking_link_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS final_report_sent_at TIMESTAMP WITH TIME ZONE;

-- Notes Enhancement - ensure internal_notes and client_notes exist
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- ============================================================================
-- ADD OVERRIDE FIELDS TO soundcloud_campaigns TABLE
-- ============================================================================

-- Scheduling Override Fields
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS suggested_start_date DATE,
ADD COLUMN IF NOT EXISTS date_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_override_reason TEXT,
ADD COLUMN IF NOT EXISTS date_override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS date_override_at TIMESTAMP WITH TIME ZONE;

-- Channel Selection Override Fields
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS suggested_channels UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_channels UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS channel_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS channel_override_reason TEXT,
ADD COLUMN IF NOT EXISTS channel_size_mismatch_acknowledged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS channel_override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS channel_override_at TIMESTAMP WITH TIME ZONE;

-- Repost Limits Override Fields (Admin-only)
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS repost_limit_per_profile INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS repost_limit_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS repost_limit_override_reason TEXT,
ADD COLUMN IF NOT EXISTS repost_limit_override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS repost_limit_override_at TIMESTAMP WITH TIME ZONE;

-- Playlist Workflow Fields
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS playlist_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playlist_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playlist_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_link_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS final_report_sent_at TIMESTAMP WITH TIME ZONE;

-- Notes Enhancement - ensure internal_notes and client_notes exist
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- ============================================================================
-- ADD INFLUENCE PLANNER DISCONNECT TRACKING TO MEMBERS
-- ============================================================================

ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS ip_disconnected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_reconnect_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_last_checked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_error_message TEXT;

-- ============================================================================
-- CREATE OVERRIDE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.soundcloud_override_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type TEXT NOT NULL CHECK (parent_type IN ('submission', 'campaign')),
  parent_id UUID NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('date', 'channel', 'repost_limit', 'notes_internal', 'notes_client')),
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  override_by UUID REFERENCES auth.users(id),
  override_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_soundcloud_override_history_parent 
  ON public.soundcloud_override_history(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_soundcloud_override_history_type 
  ON public.soundcloud_override_history(override_type);

-- Enable RLS
ALTER TABLE public.soundcloud_override_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy - allow authenticated users to view and insert
DROP POLICY IF EXISTS "soundcloud_override_history_select" ON public.soundcloud_override_history;
CREATE POLICY "soundcloud_override_history_select" 
  ON public.soundcloud_override_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "soundcloud_override_history_insert" ON public.soundcloud_override_history;
CREATE POLICY "soundcloud_override_history_insert" 
  ON public.soundcloud_override_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- CREATE PLAYLIST STATUS TYPE
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.soundcloud_playlist_status AS ENUM (
    'not_required',
    'awaiting_playlist',
    'playlist_received',
    'scheduled_for_repost'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- INDEXES FOR NEW COLUMNS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_submissions_campaign_type ON public.submissions(campaign_type);
CREATE INDEX IF NOT EXISTS idx_submissions_playlist_required ON public.submissions(playlist_required) WHERE playlist_required = true;
CREATE INDEX IF NOT EXISTS idx_submissions_date_is_override ON public.submissions(date_is_override) WHERE date_is_override = true;
CREATE INDEX IF NOT EXISTS idx_soundcloud_campaigns_playlist_required ON public.soundcloud_campaigns(playlist_required) WHERE playlist_required = true;
CREATE INDEX IF NOT EXISTS idx_members_ip_status ON public.members(influence_planner_status) WHERE influence_planner_status = 'disconnected';

-- ============================================================================
-- FUNCTION: Record Override
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_soundcloud_override(
  p_parent_type TEXT,
  p_parent_id UUID,
  p_override_type TEXT,
  p_previous_value JSONB,
  p_new_value JSONB,
  p_reason TEXT,
  p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.soundcloud_override_history (
    parent_type,
    parent_id,
    override_type,
    previous_value,
    new_value,
    reason,
    override_by
  ) VALUES (
    p_parent_type,
    p_parent_id,
    p_override_type,
    p_previous_value,
    p_new_value,
    p_reason,
    p_user_id
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.submissions.suggested_date IS 'System-suggested optimal scheduling date';
COMMENT ON COLUMN public.submissions.date_is_override IS 'True if ops selected a date different from suggestion';
COMMENT ON COLUMN public.submissions.suggested_channels IS 'System-suggested repost channels (member IDs)';
COMMENT ON COLUMN public.submissions.selected_channels IS 'Ops-selected channels (may differ from suggestions)';
COMMENT ON COLUMN public.submissions.channel_size_mismatch_acknowledged IS 'Ops acknowledged size mismatch warning';
COMMENT ON COLUMN public.submissions.repost_limit_per_profile IS 'Max reposts per profile per day (default 2)';
COMMENT ON COLUMN public.submissions.repost_limit_is_override IS 'Admin overrode the default repost limit';
COMMENT ON COLUMN public.submissions.campaign_type IS 'free = member submission, paid = client campaign';
COMMENT ON COLUMN public.submissions.playlist_required IS 'Campaign requires playlist before final repost';
COMMENT ON COLUMN public.submissions.playlist_received IS 'Client has provided the required playlist';

COMMENT ON TABLE public.soundcloud_override_history IS 'Audit trail for all manual overrides on SoundCloud campaigns/submissions';

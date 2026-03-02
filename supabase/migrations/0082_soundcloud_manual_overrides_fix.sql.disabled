-- ============================================================================
-- SoundCloud Manual Overrides & Paid Workflow Enhancement (FIXED for Production)
-- ============================================================================
-- This migration adds override fields to the soundcloud_* prefixed tables
-- ============================================================================

-- ============================================================================
-- ADD OVERRIDE FIELDS TO soundcloud_submissions TABLE
-- ============================================================================

-- Scheduling Override Fields
ALTER TABLE public.soundcloud_submissions
ADD COLUMN IF NOT EXISTS suggested_date DATE,
ADD COLUMN IF NOT EXISTS date_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_override_reason TEXT,
ADD COLUMN IF NOT EXISTS date_override_by UUID,
ADD COLUMN IF NOT EXISTS date_override_at TIMESTAMP WITH TIME ZONE;

-- Channel Selection Override Fields
ALTER TABLE public.soundcloud_submissions
ADD COLUMN IF NOT EXISTS suggested_channels UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_channels UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS channel_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS channel_override_reason TEXT,
ADD COLUMN IF NOT EXISTS channel_size_mismatch_acknowledged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS channel_override_by UUID,
ADD COLUMN IF NOT EXISTS channel_override_at TIMESTAMP WITH TIME ZONE;

-- Repost Limits Override Fields (Admin-only)
ALTER TABLE public.soundcloud_submissions
ADD COLUMN IF NOT EXISTS repost_limit_per_profile INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS repost_limit_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS repost_limit_override_reason TEXT,
ADD COLUMN IF NOT EXISTS repost_limit_override_by UUID,
ADD COLUMN IF NOT EXISTS repost_limit_override_at TIMESTAMP WITH TIME ZONE;

-- Paid Workflow Fields
ALTER TABLE public.soundcloud_submissions
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'free' CHECK (campaign_type IN ('paid', 'free')),
ADD COLUMN IF NOT EXISTS playlist_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playlist_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playlist_url TEXT,
ADD COLUMN IF NOT EXISTS playlist_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_id UUID,
ADD COLUMN IF NOT EXISTS tracking_link_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS final_report_sent_at TIMESTAMP WITH TIME ZONE;

-- Notes Enhancement
ALTER TABLE public.soundcloud_submissions
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- ============================================================================
-- ADD OVERRIDE FIELDS TO soundcloud_campaigns TABLE (already done, but re-run for safety)
-- ============================================================================

-- Scheduling Override Fields
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS suggested_start_date DATE,
ADD COLUMN IF NOT EXISTS date_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_override_reason TEXT,
ADD COLUMN IF NOT EXISTS date_override_by UUID,
ADD COLUMN IF NOT EXISTS date_override_at TIMESTAMP WITH TIME ZONE;

-- Channel Selection Override Fields
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS suggested_channels UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS selected_channels UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS channel_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS channel_override_reason TEXT,
ADD COLUMN IF NOT EXISTS channel_size_mismatch_acknowledged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS channel_override_by UUID,
ADD COLUMN IF NOT EXISTS channel_override_at TIMESTAMP WITH TIME ZONE;

-- Repost Limits Override Fields (Admin-only)
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS repost_limit_per_profile INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS repost_limit_is_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS repost_limit_override_reason TEXT,
ADD COLUMN IF NOT EXISTS repost_limit_override_by UUID,
ADD COLUMN IF NOT EXISTS repost_limit_override_at TIMESTAMP WITH TIME ZONE;

-- Playlist Workflow Fields
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS playlist_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playlist_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playlist_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_link_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS final_report_sent_at TIMESTAMP WITH TIME ZONE;

-- Notes Enhancement
ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- ============================================================================
-- ADD INFLUENCE PLANNER DISCONNECT TRACKING TO soundcloud_members
-- ============================================================================

ALTER TABLE public.soundcloud_members
ADD COLUMN IF NOT EXISTS ip_disconnected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_reconnect_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_last_checked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_error_message TEXT;

-- ============================================================================
-- INDEXES FOR NEW COLUMNS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_campaign_type ON public.soundcloud_submissions(campaign_type);
CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_playlist_required ON public.soundcloud_submissions(playlist_required) WHERE playlist_required = true;
CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_date_is_override ON public.soundcloud_submissions(date_is_override) WHERE date_is_override = true;
CREATE INDEX IF NOT EXISTS idx_soundcloud_campaigns_playlist_required ON public.soundcloud_campaigns(playlist_required) WHERE playlist_required = true;
CREATE INDEX IF NOT EXISTS idx_soundcloud_members_ip_status ON public.soundcloud_members(influence_planner_status) WHERE influence_planner_status = 'disconnected';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.soundcloud_submissions.suggested_date IS 'System-suggested optimal scheduling date';
COMMENT ON COLUMN public.soundcloud_submissions.date_is_override IS 'True if ops selected a date different from suggestion';
COMMENT ON COLUMN public.soundcloud_submissions.suggested_channels IS 'System-suggested repost channels (member IDs)';
COMMENT ON COLUMN public.soundcloud_submissions.selected_channels IS 'Ops-selected channels (may differ from suggestions)';
COMMENT ON COLUMN public.soundcloud_submissions.channel_size_mismatch_acknowledged IS 'Ops acknowledged size mismatch warning';
COMMENT ON COLUMN public.soundcloud_submissions.repost_limit_per_profile IS 'Max reposts per profile per day (default 2)';
COMMENT ON COLUMN public.soundcloud_submissions.repost_limit_is_override IS 'Admin overrode the default repost limit';
COMMENT ON COLUMN public.soundcloud_submissions.campaign_type IS 'free = member submission, paid = client campaign';
COMMENT ON COLUMN public.soundcloud_submissions.playlist_required IS 'Campaign requires playlist before final repost';
COMMENT ON COLUMN public.soundcloud_submissions.playlist_received IS 'Client has provided the required playlist';

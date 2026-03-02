-- ============================================================================
-- SoundCloud Influence Planner Paid Workflow Enhancement
-- ============================================================================
-- This migration adds:
-- 1. IP schedule tracking fields (schedule URLs, schedule IDs)
-- 2. Suggested dates JSONB for ranked slot suggestions
-- 3. Source invoice ID for linking paid campaigns to invoices
-- 4. Client email for direct notification
-- ============================================================================

-- ============================================================================
-- ADD IP SCHEDULE TRACKING TO soundcloud_submissions
-- ============================================================================

ALTER TABLE public.soundcloud_submissions
ADD COLUMN IF NOT EXISTS ip_schedule_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ip_schedule_id TEXT,
ADD COLUMN IF NOT EXISTS suggested_dates JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS source_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS sales_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS goal_reposts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- ADD IP SCHEDULE TRACKING TO soundcloud_campaigns
-- ============================================================================

ALTER TABLE public.soundcloud_campaigns
ADD COLUMN IF NOT EXISTS ip_schedule_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ip_schedule_id TEXT,
ADD COLUMN IF NOT EXISTS suggested_dates JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS source_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- INDEXES FOR NEW COLUMNS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_source_invoice
  ON public.soundcloud_submissions(source_invoice_id)
  WHERE source_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_soundcloud_submissions_invoice_status
  ON public.soundcloud_submissions(invoice_status);

CREATE INDEX IF NOT EXISTS idx_soundcloud_campaigns_source_invoice
  ON public.soundcloud_campaigns(source_invoice_id)
  WHERE source_invoice_id IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.soundcloud_submissions.ip_schedule_urls IS 'URLs returned by Influence Planner API after schedule creation';
COMMENT ON COLUMN public.soundcloud_submissions.ip_schedule_id IS 'Influence Planner schedule identifier';
COMMENT ON COLUMN public.soundcloud_submissions.suggested_dates IS 'System-suggested scheduling dates with quality ratings';
COMMENT ON COLUMN public.soundcloud_submissions.source_invoice_id IS 'External invoice system ID that triggered this campaign';
COMMENT ON COLUMN public.soundcloud_submissions.client_email IS 'Client email for notifications and tracking links';
COMMENT ON COLUMN public.soundcloud_submissions.client_name IS 'Client display name';
COMMENT ON COLUMN public.soundcloud_submissions.sales_price IS 'Campaign sale price in USD';
COMMENT ON COLUMN public.soundcloud_submissions.goal_reposts IS 'Target number of reposts for the campaign';
COMMENT ON COLUMN public.soundcloud_submissions.invoice_status IS 'Invoice payment status: pending, sent, paid';

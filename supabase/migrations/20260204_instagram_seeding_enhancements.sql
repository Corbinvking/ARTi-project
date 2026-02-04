-- Instagram Seeding MVP Enhancements
-- Adds workflow fields for page selection, budget allocation, and reporting

-- =====================================================
-- 1. Add new columns to instagram_campaigns
-- =====================================================

-- Seeding type and brief
ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS seeding_type TEXT DEFAULT 'audio';

ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS brief TEXT;

-- Preferred pages from intake (before algorithm runs)
ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS preferred_pages TEXT[] DEFAULT '{}';

-- Page selection approval workflow
ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS page_selection_approved BOOLEAN DEFAULT FALSE;

ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS page_selection_approved_at TIMESTAMPTZ;

ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS page_selection_approved_by UUID REFERENCES auth.users(id);

-- Do-not-use pages blocklist
ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS do_not_use_pages TEXT[] DEFAULT '{}';

-- Posting window
ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS posting_window_start DATE;

ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS posting_window_end DATE;

-- Reporting schedule
ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS final_report_sent_at TIMESTAMPTZ;

ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS followup_report_date DATE;

ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS followup_report_sent_at TIMESTAMPTZ;

-- Additional notes fields
ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS issues_notes TEXT;

-- =====================================================
-- 2. Add new columns to instagram_campaign_creators
-- =====================================================

-- Budget allocation override per page
ALTER TABLE public.instagram_campaign_creators 
ADD COLUMN IF NOT EXISTS budget_allocation DECIMAL(10,2);

-- Sort order for drag-and-drop reordering
ALTER TABLE public.instagram_campaign_creators 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Track if auto-selected by algorithm or manually added
ALTER TABLE public.instagram_campaign_creators 
ADD COLUMN IF NOT EXISTS is_auto_selected BOOLEAN DEFAULT TRUE;

-- Mark page as do-not-use for this campaign
ALTER TABLE public.instagram_campaign_creators 
ADD COLUMN IF NOT EXISTS do_not_use BOOLEAN DEFAULT FALSE;

-- Page workflow status
ALTER TABLE public.instagram_campaign_creators 
ADD COLUMN IF NOT EXISTS page_status TEXT DEFAULT 'proposed';

-- =====================================================
-- 3. Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_page_selection_approved 
ON public.instagram_campaigns(page_selection_approved) 
WHERE page_selection_approved = FALSE;

CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_final_report 
ON public.instagram_campaigns(final_report_sent_at) 
WHERE final_report_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_followup_report 
ON public.instagram_campaigns(followup_report_date) 
WHERE followup_report_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_instagram_campaign_creators_sort_order 
ON public.instagram_campaign_creators(campaign_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_instagram_campaign_creators_page_status 
ON public.instagram_campaign_creators(page_status);

-- =====================================================
-- 4. Add constraint for page_status values
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'instagram_campaign_creators_page_status_check'
  ) THEN
    ALTER TABLE public.instagram_campaign_creators 
    ADD CONSTRAINT instagram_campaign_creators_page_status_check 
    CHECK (page_status IN ('proposed', 'approved', 'paid', 'ready', 'posted', 'complete'));
  END IF;
END $$;

-- =====================================================
-- 5. Add constraint for seeding_type values
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'instagram_campaigns_seeding_type_check'
  ) THEN
    ALTER TABLE public.instagram_campaigns 
    ADD CONSTRAINT instagram_campaigns_seeding_type_check 
    CHECK (seeding_type IN ('audio', 'footage'));
  END IF;
END $$;

-- =====================================================
-- 6. Comments for documentation
-- =====================================================

COMMENT ON COLUMN public.instagram_campaigns.seeding_type IS 'Type of seeding campaign: audio or footage';
COMMENT ON COLUMN public.instagram_campaigns.brief IS 'Campaign brief with plan, posting window, and expectations';
COMMENT ON COLUMN public.instagram_campaigns.preferred_pages IS 'Page handles suggested by client or sales';
COMMENT ON COLUMN public.instagram_campaigns.page_selection_approved IS 'Whether ops has approved the page selection';
COMMENT ON COLUMN public.instagram_campaigns.do_not_use_pages IS 'Blocklisted page handles for this campaign';
COMMENT ON COLUMN public.instagram_campaigns.posting_window_start IS 'Start of posting window for pages';
COMMENT ON COLUMN public.instagram_campaigns.posting_window_end IS 'End of posting window for pages';
COMMENT ON COLUMN public.instagram_campaigns.final_report_sent_at IS 'When the final campaign report was sent';
COMMENT ON COLUMN public.instagram_campaigns.followup_report_date IS 'Scheduled date for follow-up report (2-3 weeks after completion)';
COMMENT ON COLUMN public.instagram_campaigns.followup_report_sent_at IS 'When the follow-up report was sent';
COMMENT ON COLUMN public.instagram_campaigns.admin_notes IS 'Internal admin notes (page/payment/admin details)';
COMMENT ON COLUMN public.instagram_campaigns.issues_notes IS 'Issues and do-not-use page notes';

COMMENT ON COLUMN public.instagram_campaign_creators.budget_allocation IS 'Override budget allocation for this page';
COMMENT ON COLUMN public.instagram_campaign_creators.sort_order IS 'Display order for page list (drag-drop reordering)';
COMMENT ON COLUMN public.instagram_campaign_creators.is_auto_selected IS 'Whether page was auto-selected by algorithm or manually added';
COMMENT ON COLUMN public.instagram_campaign_creators.do_not_use IS 'Whether this page should not be used for this campaign';
COMMENT ON COLUMN public.instagram_campaign_creators.page_status IS 'Workflow status: proposed, approved, paid, ready, posted, complete';

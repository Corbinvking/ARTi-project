-- Add new fields to campaign_submissions table for improved submission flow
-- Copy this content into your database

ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS sfa_url TEXT;

ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS vendor_assignments JSONB DEFAULT '[]';

ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS submission_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_campaign_submissions_client_id 
ON public.campaign_submissions(client_id);

CREATE INDEX IF NOT EXISTS idx_campaign_submissions_status 
ON public.campaign_submissions(status);


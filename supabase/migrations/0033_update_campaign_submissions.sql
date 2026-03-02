-- Add new fields to campaign_submissions table for improved submission flow

-- Add client_id reference (in addition to client_name string)
ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add Spotify for Artists URL
ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS sfa_url TEXT;

-- Add vendor assignments (JSON array of vendor allocation objects)
ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS vendor_assignments JSONB DEFAULT '[]';

-- Add review metadata
ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.campaign_submissions 
ADD COLUMN IF NOT EXISTS submission_notes TEXT;

-- Add index for client_id lookups
CREATE INDEX IF NOT EXISTS idx_campaign_submissions_client_id 
ON public.campaign_submissions(client_id);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_campaign_submissions_status 
ON public.campaign_submissions(status);

COMMENT ON COLUMN public.campaign_submissions.client_id IS 'Reference to clients table if existing client selected';
COMMENT ON COLUMN public.campaign_submissions.sfa_url IS 'Spotify for Artists URL for the track';
COMMENT ON COLUMN public.campaign_submissions.vendor_assignments IS 'Array of vendor allocations: [{"vendor_id": "uuid", "vendor_name": "Name", "allocated_streams": 50000, "allocated_budget": 500.00, "playlist_ids": ["uuid1"]}]';
COMMENT ON COLUMN public.campaign_submissions.reviewed_at IS 'Timestamp when admin reviewed the submission';
COMMENT ON COLUMN public.campaign_submissions.reviewed_by IS 'User ID of admin who reviewed';
COMMENT ON COLUMN public.campaign_submissions.submission_notes IS 'Additional notes from submitter or reviewer';


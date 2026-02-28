-- Add client_notes column to instagram_campaigns for client portal display
-- This column stores client-facing notes that are visible on the public campaign portal

ALTER TABLE public.instagram_campaigns 
ADD COLUMN IF NOT EXISTS client_notes TEXT;

COMMENT ON COLUMN public.instagram_campaigns.client_notes IS 'Client-facing notes visible on public portal';

-- Create index for faster queries when filtering by client_notes
CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_client_notes 
ON public.instagram_campaigns(id) 
WHERE client_notes IS NOT NULL;

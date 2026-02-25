-- Add vendor_id to spotify_campaigns to properly link songs to vendors
ALTER TABLE public.spotify_campaigns 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

-- Create index for vendor_id
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_vendor_id ON public.spotify_campaigns(vendor_id);

-- Add comment
COMMENT ON COLUMN public.spotify_campaigns.vendor_id IS 'Links song placement to the vendor (Club Restricted, Glenn, etc.)';


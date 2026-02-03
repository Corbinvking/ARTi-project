-- Create campaign_receipt_links table (no FK constraints for compatibility)
CREATE TABLE IF NOT EXISTS public.campaign_receipt_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID,
  submission_id UUID,
  supporter_name TEXT NOT NULL DEFAULT '',
  supporter_handle TEXT NOT NULL DEFAULT '',
  reach_amount INTEGER NOT NULL DEFAULT 0,
  proof_url TEXT,
  status TEXT DEFAULT 'pending',
  scheduled_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_receipt_links ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.campaign_receipt_links;
CREATE POLICY "Enable read access for all users" ON public.campaign_receipt_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.campaign_receipt_links;
CREATE POLICY "Enable insert for authenticated users only" ON public.campaign_receipt_links
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.campaign_receipt_links;
CREATE POLICY "Enable update for authenticated users only" ON public.campaign_receipt_links
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.campaign_receipt_links;
CREATE POLICY "Enable delete for authenticated users only" ON public.campaign_receipt_links
  FOR DELETE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaign_receipt_links_campaign_id 
  ON public.campaign_receipt_links(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_receipt_links_submission_id 
  ON public.campaign_receipt_links(submission_id);

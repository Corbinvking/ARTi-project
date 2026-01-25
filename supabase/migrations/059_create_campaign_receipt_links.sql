-- Create campaign_receipt_links table for SoundCloud campaign tracking
-- This table stores receipt/proof links for campaign deliveries

CREATE TABLE IF NOT EXISTS public.campaign_receipt_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaign_groups(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.campaign_submissions(id) ON DELETE CASCADE,
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

-- Create policies for authenticated users
CREATE POLICY "Enable read access for all users" ON public.campaign_receipt_links
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.campaign_receipt_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.campaign_receipt_links
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.campaign_receipt_links
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaign_receipt_links_campaign_id 
  ON public.campaign_receipt_links(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_receipt_links_submission_id 
  ON public.campaign_receipt_links(submission_id);

-- Create updated_at trigger
CREATE TRIGGER update_campaign_receipt_links_updated_at
  BEFORE UPDATE ON public.campaign_receipt_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.campaign_receipt_links IS 'Stores receipt/proof links for SoundCloud campaign deliveries with reach tracking';

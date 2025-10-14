-- Create campaign_groups table to properly represent campaigns
-- A campaign can have multiple songs/tracks, each going to different vendors

CREATE TABLE IF NOT EXISTS public.campaign_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Campaign identification
  name TEXT NOT NULL,                    -- e.g., "Reece Rosé - Back Back"
  artist_name TEXT,                      -- e.g., "Reece Rosé"
  
  -- Campaign goals and metrics
  total_goal INTEGER NOT NULL DEFAULT 0,
  total_budget DECIMAL(10,2) DEFAULT 0,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'Draft',  -- Draft, Active, Pending, Complete, Cancelled, Unreleased
  invoice_status TEXT DEFAULT 'Not Invoiced',  -- Not Invoiced, Sent, Paid, N/A
  
  -- People
  salesperson TEXT,
  
  -- Additional info
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add campaign_group_id to spotify_campaigns to link songs to campaigns
ALTER TABLE public.spotify_campaigns 
ADD COLUMN IF NOT EXISTS campaign_group_id UUID REFERENCES public.campaign_groups(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_groups_client_id ON public.campaign_groups(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_status ON public.campaign_groups(status);
CREATE INDEX IF NOT EXISTS idx_campaign_groups_start_date ON public.campaign_groups(start_date);
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_campaign_group_id ON public.spotify_campaigns(campaign_group_id);

-- Enable RLS
ALTER TABLE public.campaign_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.campaign_groups
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.campaign_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.campaign_groups
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.campaign_groups
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to get campaign with all its songs
CREATE OR REPLACE FUNCTION public.get_campaign_group_with_songs(campaign_group_id_param uuid)
RETURNS TABLE (
  campaign_id uuid,
  campaign_name text,
  artist_name text,
  client_id uuid,
  client_name text,
  total_goal integer,
  total_budget numeric,
  total_remaining integer,
  total_daily integer,
  total_weekly integer,
  progress_percentage integer,
  start_date date,
  end_date date,
  status text,
  invoice_status text,
  salesperson text,
  notes text,
  songs jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cg.id as campaign_id,
    cg.name as campaign_name,
    cg.artist_name,
    cg.client_id,
    c.name as client_name,
    cg.total_goal,
    cg.total_budget,
    COALESCE(SUM(CAST(sc.remaining AS INTEGER)), 0)::integer as total_remaining,
    COALESCE(SUM(CAST(sc.daily AS INTEGER)), 0)::integer as total_daily,
    COALESCE(SUM(CAST(sc.weekly AS INTEGER)), 0)::integer as total_weekly,
    CASE 
      WHEN cg.total_goal > 0 THEN 
        ((cg.total_goal - COALESCE(SUM(CAST(sc.remaining AS INTEGER)), 0)) * 100 / cg.total_goal)::integer
      ELSE 0
    END as progress_percentage,
    cg.start_date,
    cg.end_date,
    cg.status,
    cg.invoice_status,
    cg.salesperson,
    cg.notes,
    jsonb_agg(
      jsonb_build_object(
        'id', sc.id,
        'track_name', sc.campaign,
        'vendor', sc.vendor,
        'goal', sc.goal,
        'remaining', sc.remaining,
        'daily', sc.daily,
        'weekly', sc.weekly,
        'url', sc.url,
        'status', sc.status,
        'curator_status', sc.curator_status,
        'playlists', sc.playlists,
        'notes', sc.notes
      )
    ) as songs
  FROM public.campaign_groups cg
  LEFT JOIN public.clients c ON cg.client_id = c.id
  LEFT JOIN public.spotify_campaigns sc ON sc.campaign_group_id = cg.id
  WHERE cg.id = campaign_group_id_param
  GROUP BY cg.id, cg.name, cg.artist_name, cg.client_id, c.name, cg.total_goal, 
           cg.total_budget, cg.start_date, cg.end_date, cg.status, cg.invoice_status,
           cg.salesperson, cg.notes;
END;
$$;

-- Create function to get all campaigns for a client
CREATE OR REPLACE FUNCTION public.get_client_campaigns(client_id_param uuid)
RETURNS TABLE (
  campaign_id uuid,
  campaign_name text,
  artist_name text,
  total_goal integer,
  total_remaining integer,
  total_daily integer,
  total_weekly integer,
  progress_percentage integer,
  start_date date,
  status text,
  invoice_status text,
  song_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cg.id as campaign_id,
    cg.name as campaign_name,
    cg.artist_name,
    cg.total_goal,
    COALESCE(SUM(CAST(sc.remaining AS INTEGER)), 0)::integer as total_remaining,
    COALESCE(SUM(CAST(sc.daily AS INTEGER)), 0)::integer as total_daily,
    COALESCE(SUM(CAST(sc.weekly AS INTEGER)), 0)::integer as total_weekly,
    CASE 
      WHEN cg.total_goal > 0 THEN 
        ((cg.total_goal - COALESCE(SUM(CAST(sc.remaining AS INTEGER)), 0)) * 100 / cg.total_goal)::integer
      ELSE 0
    END as progress_percentage,
    cg.start_date,
    cg.status,
    cg.invoice_status,
    COUNT(sc.id) as song_count
  FROM public.campaign_groups cg
  LEFT JOIN public.spotify_campaigns sc ON sc.campaign_group_id = cg.id
  WHERE cg.client_id = client_id_param
  GROUP BY cg.id, cg.name, cg.artist_name, cg.total_goal, cg.start_date, cg.status, cg.invoice_status
  ORDER BY cg.start_date DESC;
END;
$$;

-- Add comment
COMMENT ON TABLE public.campaign_groups IS 'Represents a campaign which can contain multiple songs/tracks';
COMMENT ON COLUMN public.campaign_groups.name IS 'Campaign name, typically "Artist - Song Title"';
COMMENT ON COLUMN public.spotify_campaigns.campaign_group_id IS 'Links individual song placements to their parent campaign';


-- Refactor database structure to be client-centric
-- Clients as primary entities with campaigns attached

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_client_name_org_id_key UNIQUE (client_name, org_id)
);

-- Add client_id to campaigns table (existing campaigns will need to be migrated)
ALTER TABLE public.spotify_campaigns ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- Create index for client_id
CREATE INDEX IF NOT EXISTS idx_spotify_campaigns_client_id ON public.spotify_campaigns(client_id);

-- Update RLS policies for clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.clients
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.clients
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.clients
  FOR DELETE USING (auth.role() = 'authenticated');

-- Function to get client with campaigns
CREATE OR REPLACE FUNCTION public.get_client_with_campaigns(client_id_param uuid)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_email text,
  campaign_id uuid,
  campaign_name text,
  goal integer,
  remaining integer,
  daily integer,
  weekly integer,
  url text,
  sale_price numeric,
  start_date date,
  status text,
  vendor text,
  curator_status text,
  playlists text,
  notes text,
  last_modified text,
  sp_vendor_updates text,
  spotify_campaign text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as client_id,
    c.client_name,
    c.client_email,
    sc.id as campaign_id,
    sc.campaign as campaign_name,
    sc.goal,
    sc.remaining,
    sc.daily,
    sc.weekly,
    sc.url,
    sc.sale_price,
    sc.start_date,
    sc.status,
    sc.vendor,
    sc.curator_status,
    sc.playlists,
    sc.notes,
    sc.last_modified,
    sc.sp_vendor_updates,
    sc.spotify_campaign
  FROM public.clients c
  LEFT JOIN public.spotify_campaigns sc ON c.id = sc.client_id
  WHERE c.id = client_id_param
  ORDER BY sc.start_date DESC;
END;
$$;

-- Function to get all clients with campaign counts
CREATE OR REPLACE FUNCTION public.get_clients_with_campaign_counts()
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_email text,
  campaign_count bigint,
  total_goal bigint,
  total_remaining bigint,
  active_campaigns bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as client_id,
    c.client_name,
    c.client_email,
    COUNT(sc.id) as campaign_count,
    COALESCE(SUM(sc.goal), 0) as total_goal,
    COALESCE(SUM(sc.remaining), 0) as total_remaining,
    COUNT(CASE WHEN sc.status = 'Active' THEN 1 END) as active_campaigns
  FROM public.clients c
  LEFT JOIN public.spotify_campaigns sc ON c.id = sc.client_id
  GROUP BY c.id, c.client_name, c.client_email
  ORDER BY campaign_count DESC, c.client_name;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.clients IS 'Client entities with their associated campaigns';
COMMENT ON COLUMN public.clients.client_name IS 'Name of the client/artist';
COMMENT ON COLUMN public.clients.client_email IS 'Primary email contact for the client';
COMMENT ON COLUMN public.spotify_campaigns.client_id IS 'Reference to the client this campaign belongs to';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO service_role;
GRANT EXECUTE ON FUNCTION public.get_client_with_campaigns(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clients_with_campaign_counts() TO authenticated;

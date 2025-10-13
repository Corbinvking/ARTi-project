-- Fix client functions to use correct column names

-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_client_with_campaigns(uuid);
DROP FUNCTION IF EXISTS public.get_clients_with_campaign_counts();

-- Recreate with correct schema matching production database
CREATE OR REPLACE FUNCTION public.get_client_with_campaigns(client_id_param uuid)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_emails text[],
  campaign_id integer,
  campaign_name text,
  goal text,
  remaining text,
  daily text,
  weekly text,
  url text,
  sale_price text,
  start_date text,
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
    c.name as client_name,
    c.emails as client_emails,
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
    sc.spotify_campaign_from_sp_vendor_updates as spotify_campaign
  FROM public.clients c
  LEFT JOIN public.spotify_campaigns sc ON c.id = sc.client_id
  WHERE c.id = client_id_param
  ORDER BY sc.start_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_clients_with_campaign_counts()
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_emails text[],
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
    c.name as client_name,
    c.emails as client_emails,
    COUNT(sc.id) as campaign_count,
    COALESCE(SUM(sc.goal::integer), 0)::bigint as total_goal,
    COALESCE(SUM(sc.remaining::integer), 0)::bigint as total_remaining,
    COUNT(CASE WHEN sc.status = 'Active' THEN 1 END) as active_campaigns
  FROM public.clients c
  LEFT JOIN public.spotify_campaigns sc ON c.id = sc.client_id
  GROUP BY c.id, c.name, c.emails
  ORDER BY campaign_count DESC, c.name;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_client_with_campaigns(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_with_campaigns(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_clients_with_campaign_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clients_with_campaign_counts() TO service_role;


-- Re-enable RLS on spotify_campaigns after cleanup

-- Enable RLS
ALTER TABLE public.spotify_campaigns ENABLE ROW LEVEL SECURITY;

-- Ensure policies are in place
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow public read access to spotify_campaigns" ON public.spotify_campaigns;
  DROP POLICY IF EXISTS "Allow authenticated users full access to spotify_campaigns" ON public.spotify_campaigns;

  -- Recreate policies
  CREATE POLICY "Allow public read access to spotify_campaigns" ON public.spotify_campaigns
    FOR SELECT USING (true);

  CREATE POLICY "Allow authenticated users full access to spotify_campaigns" ON public.spotify_campaigns
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
END $$;


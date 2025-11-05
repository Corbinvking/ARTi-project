-- Instagram Integration Schema
-- Adds Instagram-specific campaign management tables

-- Create instagram_campaigns table (separate from stream_strategist_campaigns)
CREATE TABLE IF NOT EXISTS public.instagram_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  budget DECIMAL(12,2) NOT NULL,
  description TEXT,
  music_genres TEXT[] NOT NULL DEFAULT '{}',
  content_types TEXT[] NOT NULL DEFAULT '{}',
  territory_preferences TEXT[] NOT NULL DEFAULT '{}',
  post_types TEXT[] NOT NULL DEFAULT '{}',
  creator_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  selected_creators JSONB DEFAULT '[]',
  totals JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  public_access_enabled BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create instagram_campaign_creators junction table
CREATE TABLE IF NOT EXISTS public.instagram_campaign_creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.instagram_campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  payment_status TEXT DEFAULT 'unpaid',
  payment_amount DECIMAL(10,2),
  post_status TEXT DEFAULT 'not_posted',
  approval_status TEXT DEFAULT 'pending',
  scheduled_date DATE,
  due_date DATE,
  posted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, creator_id)
);

-- Create instagram_campaign_posts table (separate from general campaign_posts)
CREATE TABLE IF NOT EXISTS public.instagram_campaign_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.instagram_campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  instagram_handle TEXT NOT NULL,
  post_url TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'reel',
  content_description TEXT,
  thumbnail_url TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create instagram_post_analytics table
CREATE TABLE IF NOT EXISTS public.instagram_post_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.instagram_campaign_posts(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create instagram_tags table for Instagram-specific tag management
CREATE TABLE IF NOT EXISTS public.instagram_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('music_genre', 'content_type', 'territory')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, name, type)
);

-- Create algorithm_learning_log for Instagram campaigns
CREATE TABLE IF NOT EXISTS public.instagram_algorithm_learning_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.instagram_campaigns(id) ON DELETE SET NULL,
  decision_type TEXT NOT NULL,
  input_data JSONB,
  decision_data JSONB,
  algorithm_version TEXT,
  confidence_score DECIMAL(3,2),
  performance_impact DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create instagram_ab_tests table
CREATE TABLE IF NOT EXISTS public.instagram_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  algorithm_version_control TEXT NOT NULL,
  algorithm_version_test TEXT NOT NULL,
  control_campaigns UUID[],
  test_campaigns UUID[],
  status TEXT NOT NULL DEFAULT 'planning',
  test_start_date TIMESTAMP WITH TIME ZONE,
  test_end_date TIMESTAMP WITH TIME ZONE,
  sample_size_target INTEGER,
  control_metrics JSONB,
  test_metrics JSONB,
  statistical_power DECIMAL(3,2),
  p_value DECIMAL(5,4),
  effect_size DECIMAL(5,2),
  confidence_interval JSONB,
  winner TEXT,
  conclusion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.instagram_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_campaign_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_campaign_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_algorithm_learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_ab_tests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for instagram_campaigns
CREATE POLICY "Users can view campaigns in their org"
ON public.instagram_campaigns FOR SELECT
USING (org_id = auth.jwt() -> 'app_metadata' ->> 'org_id'::text);

CREATE POLICY "Admin/manager can manage campaigns"
ON public.instagram_campaigns FOR ALL
USING (is_vendor_manager());

CREATE POLICY "Public access to campaigns via token"
ON public.instagram_campaigns FOR SELECT
USING (public_access_enabled = true AND public_token IS NOT NULL);

-- Create RLS policies for instagram_campaign_creators
CREATE POLICY "Users can view campaign creators in their org"
ON public.instagram_campaign_creators FOR SELECT
USING (org_id = auth.jwt() -> 'app_metadata' ->> 'org_id'::text);

CREATE POLICY "Admin/manager can manage campaign creators"
ON public.instagram_campaign_creators FOR ALL
USING (is_vendor_manager());

-- Create RLS policies for instagram_campaign_posts
CREATE POLICY "Users can view posts in their org"
ON public.instagram_campaign_posts FOR SELECT
USING (org_id = auth.jwt() -> 'app_metadata' ->> 'org_id'::text);

CREATE POLICY "Admin/manager can manage posts"
ON public.instagram_campaign_posts FOR ALL
USING (is_vendor_manager());

CREATE POLICY "Public access to posts via campaign token"
ON public.instagram_campaign_posts FOR SELECT
USING (
    EXISTS (
    SELECT 1 FROM public.instagram_campaigns
    WHERE instagram_campaigns.id = instagram_campaign_posts.campaign_id
    AND instagram_campaigns.public_access_enabled = true
    AND instagram_campaigns.public_token IS NOT NULL
  )
);

-- Create RLS policies for instagram_post_analytics
CREATE POLICY "Users can view analytics in their org"
ON public.instagram_post_analytics FOR SELECT
USING (org_id = auth.jwt() -> 'app_metadata' ->> 'org_id'::text);

CREATE POLICY "Admin/manager can manage analytics"
ON public.instagram_post_analytics FOR ALL
USING (is_vendor_manager());

-- Create RLS policies for instagram_tags
CREATE POLICY "Users can view tags in their org"
ON public.instagram_tags FOR SELECT
USING (org_id = auth.jwt() -> 'app_metadata' ->> 'org_id'::text);

CREATE POLICY "Admin/manager can manage tags"
ON public.instagram_tags FOR ALL
USING (is_vendor_manager());

-- Create RLS policies for instagram_algorithm_learning_log
CREATE POLICY "Admin/manager can view learning log"
ON public.instagram_algorithm_learning_log FOR SELECT
USING (is_vendor_manager());

CREATE POLICY "Admin/manager can insert learning log"
ON public.instagram_algorithm_learning_log FOR INSERT
WITH CHECK (is_vendor_manager());

-- Create RLS policies for instagram_ab_tests
CREATE POLICY "Admin/manager can manage ab tests"
ON public.instagram_ab_tests FOR ALL
USING (is_vendor_manager());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_org_id ON public.instagram_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_status ON public.instagram_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_instagram_campaigns_public_token ON public.instagram_campaigns(public_token) WHERE public_access_enabled = true;

CREATE INDEX IF NOT EXISTS idx_instagram_campaign_creators_campaign_id ON public.instagram_campaign_creators(campaign_id);
CREATE INDEX IF NOT EXISTS idx_instagram_campaign_creators_creator_id ON public.instagram_campaign_creators(creator_id);
CREATE INDEX IF NOT EXISTS idx_instagram_campaign_creators_org_id ON public.instagram_campaign_creators(org_id);

CREATE INDEX IF NOT EXISTS idx_instagram_campaign_posts_campaign_id ON public.instagram_campaign_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_instagram_campaign_posts_creator_id ON public.instagram_campaign_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_instagram_campaign_posts_org_id ON public.instagram_campaign_posts(org_id);

CREATE INDEX IF NOT EXISTS idx_instagram_post_analytics_post_id ON public.instagram_post_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_instagram_post_analytics_org_id ON public.instagram_post_analytics(org_id);

CREATE INDEX IF NOT EXISTS idx_instagram_tags_org_id ON public.instagram_tags(org_id);
CREATE INDEX IF NOT EXISTS idx_instagram_tags_type ON public.instagram_tags(type);

CREATE INDEX IF NOT EXISTS idx_instagram_learning_log_campaign_id ON public.instagram_algorithm_learning_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_instagram_learning_log_org_id ON public.instagram_algorithm_learning_log(org_id);

CREATE INDEX IF NOT EXISTS idx_instagram_ab_tests_org_id ON public.instagram_ab_tests(org_id);
CREATE INDEX IF NOT EXISTS idx_instagram_ab_tests_status ON public.instagram_ab_tests(status);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_instagram_campaigns_updated_at
  BEFORE UPDATE ON public.instagram_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instagram_campaign_creators_updated_at
  BEFORE UPDATE ON public.instagram_campaign_creators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instagram_campaign_posts_updated_at
  BEFORE UPDATE ON public.instagram_campaign_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instagram_ab_tests_updated_at
  BEFORE UPDATE ON public.instagram_ab_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Instagram tags
INSERT INTO public.instagram_tags (name, type, org_id) 
SELECT name, type::text, org_id
FROM (
  SELECT 'Pop' as name, 'music_genre' as type
  UNION ALL SELECT 'Rock', 'music_genre'
  UNION ALL SELECT 'Hip Hop', 'music_genre'
  UNION ALL SELECT 'Electronic', 'music_genre'
  UNION ALL SELECT 'R&B', 'music_genre'
  UNION ALL SELECT 'Country', 'music_genre'
  UNION ALL SELECT 'Jazz', 'music_genre'
  UNION ALL SELECT 'Classical', 'music_genre'
  UNION ALL SELECT 'Reggae', 'music_genre'
  UNION ALL SELECT 'Folk', 'music_genre'
  UNION ALL SELECT 'Music Reviews', 'content_type'
  UNION ALL SELECT 'Artist Interviews', 'content_type'
  UNION ALL SELECT 'Live Performances', 'content_type'
  UNION ALL SELECT 'Behind the Scenes', 'content_type'
  UNION ALL SELECT 'Music News', 'content_type'
  UNION ALL SELECT 'Tutorials', 'content_type'
  UNION ALL SELECT 'Reaction Videos', 'content_type'
  UNION ALL SELECT 'Collaborations', 'content_type'
  UNION ALL SELECT 'Cover Songs', 'content_type'
  UNION ALL SELECT 'Music Production', 'content_type'
  UNION ALL SELECT 'United States', 'territory'
  UNION ALL SELECT 'Canada', 'territory'
  UNION ALL SELECT 'United Kingdom', 'territory'
  UNION ALL SELECT 'Australia', 'territory'
  UNION ALL SELECT 'Germany', 'territory'
  UNION ALL SELECT 'France', 'territory'
  UNION ALL SELECT 'Spain', 'territory'
  UNION ALL SELECT 'Italy', 'territory'
  UNION ALL SELECT 'Brazil', 'territory'
  UNION ALL SELECT 'Mexico', 'territory'
) tags
CROSS JOIN public.orgs
ON CONFLICT (org_id, name, type) DO NOTHING;

-- Create helper function to get Instagram campaign summary
CREATE OR REPLACE FUNCTION public.get_instagram_campaign_summary(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'campaign_id', c.id,
    'campaign_name', c.name,
    'brand_name', c.brand_name,
    'status', c.status,
    'total_creators', COUNT(DISTINCT cc.creator_id),
    'total_posts', COUNT(DISTINCT cp.id),
    'total_views', COALESCE(SUM(pa.views), 0),
    'total_likes', COALESCE(SUM(pa.likes), 0),
    'total_comments', COALESCE(SUM(pa.comments), 0),
    'avg_engagement_rate', COALESCE(AVG(pa.engagement_rate), 0),
    'budget', c.budget
  ) INTO v_summary
  FROM public.instagram_campaigns c
  LEFT JOIN public.instagram_campaign_creators cc ON c.id = cc.campaign_id
  LEFT JOIN public.instagram_campaign_posts cp ON c.id = cp.campaign_id
  LEFT JOIN public.instagram_post_analytics pa ON cp.id = pa.post_id
  WHERE c.id = p_campaign_id
  GROUP BY c.id, c.name, c.brand_name, c.status, c.budget;
  
  RETURN v_summary;
END;
$$;

COMMENT ON TABLE public.instagram_campaigns IS 'Instagram influencer campaigns with budget and creator management';
COMMENT ON TABLE public.instagram_campaign_creators IS 'Junction table linking Instagram campaigns with creators, including payment and status tracking';
COMMENT ON TABLE public.instagram_campaign_posts IS 'Instagram posts created for campaigns';
COMMENT ON TABLE public.instagram_post_analytics IS 'Engagement analytics for Instagram campaign posts';
COMMENT ON TABLE public.instagram_tags IS 'Tag management for Instagram campaigns (genres, content types, territories)';
COMMENT ON TABLE public.instagram_algorithm_learning_log IS 'Machine learning decision log for Instagram campaign optimization';
COMMENT ON TABLE public.instagram_ab_tests IS 'A/B testing for Instagram campaign algorithms';


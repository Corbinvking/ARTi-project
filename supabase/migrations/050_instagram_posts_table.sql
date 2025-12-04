-- Migration: Create instagram_posts table for storing scraped Instagram post data
-- This table stores post metrics fetched from the Apify Instagram scraper

-- Create the instagram_posts table
CREATE TABLE IF NOT EXISTS public.instagram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES public.instagram_campaigns(id) ON DELETE CASCADE,
  instagram_post_id TEXT NOT NULL,
  short_code TEXT,
  caption TEXT,
  comments_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE,
  owner_username TEXT,
  owner_id TEXT,
  display_url TEXT,
  video_url TEXT,
  video_view_count INTEGER,
  is_video BOOLEAN DEFAULT false,
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  location_name TEXT,
  post_url TEXT,
  post_type TEXT DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint on campaign_id + instagram_post_id for upsert
  CONSTRAINT unique_campaign_post UNIQUE (campaign_id, instagram_post_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_instagram_posts_campaign_id ON public.instagram_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_timestamp ON public.instagram_posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_owner_username ON public.instagram_posts(owner_username);

-- Enable Row Level Security
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - posts are accessible through campaign access
-- Users can see posts for campaigns they have access to (via org membership)
DROP POLICY IF EXISTS "instagram_posts_org_isolation" ON public.instagram_posts;
CREATE POLICY "instagram_posts_org_isolation" ON public.instagram_posts
  FOR ALL 
  USING (
    campaign_id IN (
      SELECT ic.id FROM instagram_campaigns ic
      WHERE ic.org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_instagram_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_instagram_posts_updated_at ON public.instagram_posts;
CREATE TRIGGER trigger_instagram_posts_updated_at
  BEFORE UPDATE ON public.instagram_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_posts_updated_at();

-- Add comment
COMMENT ON TABLE public.instagram_posts IS 'Stores Instagram post data scraped via Apify for campaign analytics';

-- Create a view for aggregated campaign metrics
CREATE OR REPLACE VIEW public.instagram_campaign_metrics AS
SELECT 
  campaign_id,
  COUNT(*) as total_posts,
  SUM(likes_count) as total_likes,
  SUM(comments_count) as total_comments,
  SUM(COALESCE(video_view_count, likes_count * 10)) as estimated_views,
  ROUND(AVG(likes_count)) as avg_likes_per_post,
  ROUND(AVG(comments_count)) as avg_comments_per_post,
  MIN(timestamp) as first_post_date,
  MAX(timestamp) as last_post_date,
  COUNT(*) FILTER (WHERE is_video = true) as video_posts,
  COUNT(*) FILTER (WHERE is_video = false) as image_posts
FROM public.instagram_posts
GROUP BY campaign_id;

COMMENT ON VIEW public.instagram_campaign_metrics IS 'Aggregated metrics for Instagram campaigns';


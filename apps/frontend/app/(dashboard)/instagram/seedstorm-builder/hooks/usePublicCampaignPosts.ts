import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface PublicCampaignPost {
  id: string;
  campaign_id: string;
  creator_id: string | null;
  instagram_handle: string;
  post_url: string;
  post_type: string;
  content_description: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  status: string;
  created_at: string;
  analytics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement_rate: number;
    recorded_at: string;
  }[];
  latest_analytics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement_rate: number;
    recorded_at: string;
  };
}

export interface EngagementChartData {
  date: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
}

export const usePublicCampaignPosts = (campaignToken?: string) => {
  const [posts, setPosts] = useState<PublicCampaignPost[]>([]);
  const [chartData, setChartData] = useState<EngagementChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignToken) {
      setLoading(false);
      return;
    }

    fetchPublicPosts();
  }, [campaignToken]);

  const fetchPublicPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the campaign by token
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, public_access_enabled')
        .eq('public_token', campaignToken)
        .eq('public_access_enabled', true)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found or access denied');
      }

      // Get campaign posts
      const { data: postsData, error: postsError } = await supabase
        .from('campaign_posts')
        .select(`
          *,
          post_analytics (
            views,
            likes,
            comments,
            shares,
            saves,
            engagement_rate,
            recorded_at
          )
        `)
        .eq('campaign_id', campaign.id)
        .eq('status', 'live')
        .order('posted_at', { ascending: false });

      if (postsError) {
        throw new Error('Failed to fetch posts');
      }

      // Process posts with latest analytics
      const processedPosts: PublicCampaignPost[] = (postsData || []).map(post => {
        const analytics = post.post_analytics || [];
        const latestAnalytics = analytics.length > 0 
          ? analytics.reduce((latest: any, current: any) => 
              new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest
            )
          : null;

        return {
          ...post,
          analytics,
          latest_analytics: latestAnalytics
        };
      });

      setPosts(processedPosts);

      // Generate chart data for the last 30 days
      const chartData = generateChartData(processedPosts);
      setChartData(chartData);

    } catch (err) {
      console.error('Error fetching public posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (posts: PublicCampaignPost[]): EngagementChartData[] => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      // Get analytics for this date
      const dayAnalytics = posts.flatMap(post => 
        (post.analytics || []).filter(analytics => 
          analytics.recorded_at.split('T')[0] === date
        )
      );

      const totalViews = dayAnalytics.reduce((sum, a) => sum + a.views, 0);
      const totalLikes = dayAnalytics.reduce((sum, a) => sum + a.likes, 0);
      const totalComments = dayAnalytics.reduce((sum, a) => sum + a.comments, 0);
      const avgEngagement = dayAnalytics.length > 0 
        ? dayAnalytics.reduce((sum, a) => sum + a.engagement_rate, 0) / dayAnalytics.length
        : 0;

      return {
        date,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        engagementRate: Number(avgEngagement.toFixed(2))
      };
    });
  };

  return {
    posts,
    chartData,
    loading,
    error,
    refetch: fetchPublicPosts
  };
};
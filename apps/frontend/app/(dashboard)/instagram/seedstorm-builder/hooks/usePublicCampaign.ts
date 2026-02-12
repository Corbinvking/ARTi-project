import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../hooks/use-toast';

export interface PublicCampaignData {
  id: string;
  name: string;
  brand_name: string;
  status: string;
  budget: number;
  created_at: string;
  creator_count: number;
  posts_live: number;
  total_posts: number;
  client_notes?: string | null;
  metrics: {
    total_views: number;
    total_comments: number;
    avg_engagement_rate: number;
  };
}

export const usePublicCampaign = (token: string | undefined) => {
  const [campaign, setCampaign] = useState<PublicCampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!token) {
        setError('No campaign token provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch campaign by public token
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('public_token', token)
          .eq('public_access_enabled', true)
          .single();

        if (campaignError || !campaignData) {
          throw new Error('Campaign not found or access denied');
        }

        // Fetch campaign creators data
        const { data: creatorsData, error: creatorsError } = await supabase
          .from('instagram_campaign_creators')
          .select('*')
          .eq('campaign_id', String(campaignData.id));

        if (creatorsError) {
          throw new Error('Failed to fetch campaign creators');
        }

        // Fetch creator details for each campaign creator
        let totalViews = 0;
        let totalEngagementRate = 0;
        const totalCreators = creatorsData?.length || 0;

        if (creatorsData && creatorsData.length > 0) {
          const creatorHandles = creatorsData.map(cc => cc.instagram_handle);
          
          const { data: creatorDetails, error: creatorDetailsError } = await supabase
            .from('creators')
            .select('id, instagram_handle, median_views_per_video, engagement_rate')
            .in('instagram_handle', creatorHandles);

          if (!creatorDetailsError && creatorDetails) {
            // Create a map for quick lookup
            const creatorMap = new Map(creatorDetails.map(c => [c.id, c]));

            // Calculate metrics
            totalViews = creatorsData.reduce((sum, creator) => {
              const creatorDetail = creatorMap.get(creator.creator_id);
              const medianViews = Number(creatorDetail?.median_views_per_video) || 0;
              return sum + (medianViews * creator.posts_count);
            }, 0);

            totalEngagementRate = creatorDetails.reduce((sum, creator) => {
              return sum + (Number(creator.engagement_rate) || 0);
            }, 0);
          }
        }

        const postsLive = creatorsData?.filter(c => c.post_status === 'posted').length || 0;
        const totalPosts = creatorsData?.reduce((sum, creator) => sum + creator.posts_count, 0) || 0;

        // Calculate estimated comments (assuming 1.5% of views become comments)
        const totalComments = Math.round(totalViews * 0.015);

        // Calculate average engagement rate
        const avgEngagementRate = totalCreators > 0 ? totalEngagementRate / totalCreators : 0;

        const processedCampaign: PublicCampaignData = {
          id: campaignData.id,
          name: campaignData.name || campaignData.brand_name || 'Untitled Campaign',
          brand_name: campaignData.brand_name || '',
          status: campaignData.status || 'draft',
          budget: Number(campaignData.budget) || 0,
          created_at: campaignData.created_at,
          creator_count: totalCreators,
          posts_live: postsLive,
          total_posts: totalPosts,
          client_notes: campaignData.client_notes || null,
          metrics: {
            total_views: totalViews,
            total_comments: totalComments,
            avg_engagement_rate: avgEngagementRate || 0,
          },
        };

        setCampaign(processedCampaign);
        setError(null);
      } catch (err) {
        console.error('Error fetching public campaign:', err);
        setError(err instanceof Error ? err.message : 'Failed to load campaign data');
        toast({
          title: "Error",
          description: "Failed to load campaign data. Please check the link and try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [token]);

  return { campaign, loading, error };
};
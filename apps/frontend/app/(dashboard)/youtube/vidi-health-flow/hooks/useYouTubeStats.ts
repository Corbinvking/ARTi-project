import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface VideoStats {
  videoId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  title: string;
  publishedAt: string | null;
  duration: string;
  success: boolean;
  error: string | null;
}

interface BulkUpdateResults {
  total: number;
  updated: number;
  errors: number;
  details: Array<{
    campaignId: string;
    campaignName: string;
    previousViews?: number;
    newViews?: number;
    change?: number;
    error?: string;
  }>;
}

export function useYouTubeStats() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkRefreshing, setIsBulkRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Fetch stats for a single video and optionally update a campaign
   */
  const fetchVideoStats = async (
    videoUrl: string,
    campaignId?: string
  ): Promise<VideoStats | null> => {
    try {
      setIsRefreshing(true);

      const response = await fetch(`${API_URL}/api/youtube-data-api/fetch-video-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl, campaignId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch video stats');
      }

      const data: VideoStats = await response.json();

      if (data.success && campaignId) {
        // Invalidate campaigns query to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });

        toast({
          title: 'Stats Updated',
          description: `Views: ${data.viewCount.toLocaleString()}`,
        });
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching video stats:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch video stats',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Fetch stats for all active campaigns
   */
  const fetchAllCampaigns = async (orgId: string): Promise<BulkUpdateResults | null> => {
    try {
      setIsBulkRefreshing(true);

      const response = await fetch(`${API_URL}/api/youtube-data-api/fetch-all-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch campaign stats');
      }

      const data: BulkUpdateResults = await response.json();

      // Invalidate campaigns query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });

      // Show summary toast
      const successRate = data.total > 0 ? ((data.updated / data.total) * 100).toFixed(0) : 0;
      toast({
        title: 'Bulk Update Complete',
        description: `Updated ${data.updated} of ${data.total} campaigns (${successRate}% success rate)`,
        variant: data.errors > 0 ? 'default' : 'default',
      });

      return data;
    } catch (error: any) {
      console.error('Error fetching all campaigns:', error);
      toast({
        title: 'Bulk Update Failed',
        description: error.message || 'Failed to fetch campaign stats',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsBulkRefreshing(false);
    }
  };

  /**
   * Extract video ID from YouTube URL
   */
  const extractVideoId = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `${API_URL}/api/youtube-data-api/extract-video-id?${new URLSearchParams({ url })}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract video ID');
      }

      const data = await response.json();
      return data.videoId;
    } catch (error: any) {
      console.error('Error extracting video ID:', error);
      return null;
    }
  };

  /**
   * Refresh stats for a specific campaign
   */
  const refreshCampaign = async (campaignId: string, videoUrl: string) => {
    return await fetchVideoStats(videoUrl, campaignId);
  };

  /**
   * Refresh stats for multiple campaigns
   */
  const refreshCampaigns = async (campaigns: Array<{ id: string; youtube_url: string }>) => {
    setIsRefreshing(true);
    
    try {
      const promises = campaigns.map(campaign => 
        fetchVideoStats(campaign.youtube_url, campaign.id)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success)).length;
      
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });
      
      toast({
        title: 'Campaigns Updated',
        description: `Successfully updated ${successful} campaigns, ${failed} failed`,
        variant: failed > 0 ? 'default' : 'default',
      });
      
      return {
        successful,
        failed,
        results
      };
    } catch (error: any) {
      console.error('Error refreshing campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh campaigns',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    // State
    isRefreshing,
    isBulkRefreshing,
    
    // Methods
    fetchVideoStats,
    fetchAllCampaigns,
    extractVideoId,
    refreshCampaign,
    refreshCampaigns,
  };
}


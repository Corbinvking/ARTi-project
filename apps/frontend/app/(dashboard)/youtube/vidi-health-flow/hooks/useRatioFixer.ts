import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// API base URL - will be set via environment variable
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side - check environment variable first, then detect production
    const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envUrl) {
      return envUrl;
    }
    // Auto-detect production
    if (window.location.hostname === 'app.artistinfluence.com') {
      return 'https://api.artistinfluence.com';
    }
    // Development fallback
    return 'http://localhost:3001';
  }
  // Server-side
  return process.env.API_URL || process.env.API_BASE_URL || 'http://localhost:3001';
};

interface StartRatioFixerParams {
  campaignId: string;
  videoUrl: string;
  videoId: string;
  genre: string;
  commentsSheetUrl: string;
  waitTime?: number;
  minimumEngagement?: number;
  commentServerId?: number;
  likeServerId?: number;
  sheetTier?: string;
}

interface RatioFixerStatus {
  views: number;
  likes: number;
  comments: number;
  status: string;
  desired_comments: number;
  desired_likes: number;
  ordered_likes?: number;
  ordered_comments?: number;
}

interface RatioFixerHealth {
  status: 'healthy' | 'unhealthy' | 'unreachable';
  available: boolean;
  ratioFixerUrl?: string;
  error?: string;
}

/**
 * Hook for integrating with the Flask Ratio Fixer application
 * 
 * Provides methods to start, stop, and monitor automated engagement ordering
 */
export function useRatioFixer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Check if the Ratio Fixer service is available
   */
  const { data: healthStatus, isLoading: isCheckingHealth } = useQuery<RatioFixerHealth>({
    queryKey: ['ratio-fixer-health'],
    queryFn: async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/ratio-fixer/health`);
        if (!response.ok) {
          const error = await response.json();
          return {
            status: 'unhealthy' as const,
            available: false,
            error: error.error || 'Service unhealthy'
          };
        }
        return await response.json();
      } catch (error: any) {
        return {
          status: 'unreachable' as const,
          available: false,
          error: error.message || 'Cannot reach service'
        };
      }
    },
    refetchInterval: 60000, // Check every minute
    retry: false
  });

  /**
   * Start the ratio fixer for a campaign
   */
  const startRatioFixerMutation = useMutation({
    mutationFn: async (params: StartRatioFixerParams) => {
      const response = await fetch(`${getApiUrl()}/api/ratio-fixer/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to start ratio fixer');
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
      toast({
        title: 'Ratio Fixer Started',
        description: `Automated engagement ordering is now active for this campaign. The system will monitor and order likes/comments as needed.`,
      });
    },
    onError: (error: any) => {
      console.error('Failed to start ratio fixer:', error);
      toast({
        title: 'Failed to Start Ratio Fixer',
        description: error.message || 'Could not start automated engagement ordering. Please try again.',
        variant: 'destructive',
      });
    },
  });

  /**
   * Stop the ratio fixer for a campaign
   */
  const stopRatioFixerMutation = useMutation({
    mutationFn: async (ratioFixerCampaignId: string) => {
      const response = await fetch(
        `${getApiUrl()}/api/ratio-fixer/stop/${ratioFixerCampaignId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: '{}',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to stop ratio fixer');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
      toast({
        title: 'Ratio Fixer Stopped',
        description: 'Automated engagement ordering has been stopped.',
      });
    },
    onError: (error: any) => {
      console.error('Failed to stop ratio fixer:', error);
      toast({
        title: 'Failed to Stop Ratio Fixer',
        description: error.message || 'Could not stop automated engagement ordering. Please try again.',
        variant: 'destructive',
      });
    },
  });

  /**
   * Get current status of a ratio fixer campaign
   * 
   * @param ratioFixerCampaignId - The Flask campaign ID
   * @param enabled - Whether to enable automatic polling
   */
  const useRatioFixerStatus = (ratioFixerCampaignId: string | null | undefined, enabled = true) => {
    return useQuery<RatioFixerStatus>({
      queryKey: ['ratio-fixer-status', ratioFixerCampaignId],
      queryFn: async () => {
        if (!ratioFixerCampaignId) {
          throw new Error('No ratio fixer campaign ID provided');
        }

        const response = await fetch(
          `${getApiUrl()}/api/ratio-fixer/status/${ratioFixerCampaignId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Ratio fixer campaign not found');
          }
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch status');
        }

        return await response.json();
      },
      enabled: enabled && !!ratioFixerCampaignId,
      refetchInterval: 30000, // Poll every 30 seconds
      retry: 2
    });
  };

  return {
    // Service health
    healthStatus,
    isCheckingHealth,
    isAvailable: healthStatus?.available || false,

    // Start ratio fixer
    startRatioFixer: startRatioFixerMutation.mutateAsync,
    isStarting: startRatioFixerMutation.isPending,

    // Stop ratio fixer
    stopRatioFixer: stopRatioFixerMutation.mutateAsync,
    isStopping: stopRatioFixerMutation.isPending,

    // Status query hook
    useRatioFixerStatus,
  };
}


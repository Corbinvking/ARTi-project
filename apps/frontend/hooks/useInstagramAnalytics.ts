'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// API base URL - uses the backend API server
// In production (artistinfluence.com), use the production API
// Otherwise use local development server
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('artistinfluence') 
    ? 'https://api.artistinfluence.com' 
    : 'http://localhost:3001');

// Types
export interface InstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  ownerUsername: string;
  ownerId: string;
  displayUrl: string;
  videoUrl?: string;
  videoViewCount?: number;
  isVideo: boolean;
  hashtags: string[];
  mentions: string[];
  locationName?: string;
  url: string;
  type: string;
}

export interface InstagramMetrics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  engagementRate: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  livePosts: number;
  // Computed metrics
  sentimentScore: number;
  relevanceScore: number;
  viralityScore: number;
  growthRate: number;
  peakEngagementDay: string | null;
  topHashtags: string[];
  avgPostsPerDay: number;
}

export interface InstagramTimeSeries {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

export interface InstagramAnalyticsData {
  posts: InstagramPost[];
  metrics: InstagramMetrics;
  timeSeries: InstagramTimeSeries[];
  count: number;
}

/**
 * Hook to fetch Instagram analytics for a campaign
 */
export function useInstagramCampaignAnalytics(campaignId: number | string | null) {
  const queryKey = ['instagram-analytics', campaignId];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<InstagramAnalyticsData | null> => {
      if (!campaignId) return null;

      const response = await fetch(
        `${API_BASE_URL}/api/instagram-scraper/campaign/${campaignId}/analytics`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No data yet - return null
          return null;
        }
        throw new Error('Failed to fetch Instagram analytics');
      }

      const result = await response.json();
      return result.success ? result.data : null;
    },
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  return {
    analytics: data,
    isLoading,
    error,
    refetch,
    hasData: !!data && data.count > 0,
  };
}

/**
 * Hook to scrape Instagram posts
 */
export function useInstagramScraper() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const scrapePosts = useMutation({
    mutationFn: async ({
      usernames,
      resultsLimit = 30,
      campaignId,
    }: {
      usernames: string[];
      resultsLimit?: number;
      campaignId?: number;
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/instagram-scraper/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernames, resultsLimit, campaignId }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape Instagram posts');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (variables.campaignId) {
        queryClient.invalidateQueries({
          queryKey: ['instagram-analytics', variables.campaignId],
        });
      }
    },
  });

  const refreshCampaignAnalytics = useCallback(
    async (campaignId: number, usernames?: string[], resultsLimit?: number) => {
      setIsRefreshing(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/instagram-scraper/campaign/${campaignId}/refresh`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ usernames, resultsLimit }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to refresh Instagram analytics');
        }

        const result = await response.json();

        // Invalidate the cache to trigger refetch
        queryClient.invalidateQueries({
          queryKey: ['instagram-analytics', campaignId],
        });

        return result;
      } finally {
        setIsRefreshing(false);
      }
    },
    [queryClient]
  );

  return {
    scrapePosts: scrapePosts.mutate,
    scrapePostsAsync: scrapePosts.mutateAsync,
    isScrapingPosts: scrapePosts.isPending,
    scrapeError: scrapePosts.error,
    refreshCampaignAnalytics,
    isRefreshing,
  };
}

/**
 * Hook to scrape a single Instagram post
 */
export function useScrapeInstagramPost() {
  return useMutation({
    mutationFn: async ({
      postUrl,
      campaignId,
    }: {
      postUrl: string;
      campaignId?: number;
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/instagram-scraper/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postUrl, campaignId }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape Instagram post');
      }

      return response.json();
    },
  });
}

/**
 * Convert raw metrics to display format for dashboard
 */
export function formatMetricsForDashboard(metrics: InstagramMetrics | null, budget?: number) {
  if (!metrics) {
    return {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      engagementRate: 0,
      livePosts: 0,
      avgCostPerView: 0,
      sentimentScore: 0,
      relevanceScore: 0,
      viralityScore: 0,
      growthRate: 0,
      peakEngagementDay: null,
      topHashtags: [],
      avgPostsPerDay: 0,
    };
  }

  return {
    totalViews: metrics.totalViews,
    totalLikes: metrics.totalLikes,
    totalComments: metrics.totalComments,
    totalShares: metrics.totalShares,
    engagementRate: metrics.engagementRate,
    livePosts: metrics.livePosts,
    avgCostPerView: budget && metrics.totalViews > 0 ? budget / metrics.totalViews : 0,
    // REAL computed metrics from API
    sentimentScore: metrics.sentimentScore || 50,
    relevanceScore: metrics.relevanceScore || 50,
    viralityScore: metrics.viralityScore || 0,
    growthRate: metrics.growthRate || 0,
    peakEngagementDay: metrics.peakEngagementDay || null,
    topHashtags: metrics.topHashtags || [],
    avgPostsPerDay: metrics.avgPostsPerDay || 0,
  };
}


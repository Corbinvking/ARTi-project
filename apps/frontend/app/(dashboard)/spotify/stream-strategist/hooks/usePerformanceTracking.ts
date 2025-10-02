"use client"

// Hooks for performance tracking and learning system

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

// Types for performance tracking
interface CampaignAllocationPerformance {
  id?: string;
  campaign_id: string;
  playlist_id: string;
  vendor_id: string;
  allocated_streams: number;
  predicted_streams: number;
  actual_streams: number;
  cost_per_stream?: number;
  actual_cost_per_stream?: number;
  performance_score: number;
  completed_at?: string;
}

interface PlaylistPerformanceHistory {
  id?: string;
  playlist_id: string;
  campaign_id?: string;
  period_start: string;
  period_end: string;
  avg_daily_streams: number;
  peak_streams?: number;
  genre_match_score?: number;
  performance_trend: 'improving' | 'declining' | 'stable';
  reliability_score: number;
}

interface VendorReliabilityScore {
  id?: string;
  vendor_id: string;
  delivery_consistency: number;
  stream_accuracy: number;
  cost_efficiency: number;
  response_time_hours: number;
  quality_score: number;
  total_campaigns: number;
  successful_campaigns: number;
  last_updated?: string;
}

interface AlgorithmLearningLog {
  id?: string;
  campaign_id?: string;
  algorithm_version: string;
  decision_type: string;
  input_data: any;
  decision_data: any;
  performance_impact?: number;
  confidence_score: number;
}

interface PerformanceInsights {
  topPerformingGenres: Array<{
    genre: string;
    avgPerformance: number;
    sampleSize: number;
  }>;
  underperformingVendors: Array<{
    name: string;
    qualityScore: number;
    deliveryConsistency: number;
  }>;
  optimalAllocationSize: number;
  seasonalTrends: any[];
  riskFactors: string[];
  recommendations: string[];
}

// Hook to fetch campaign allocation performance
export function useCampaignAllocationPerformance(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-allocation-performance', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('performance_score', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId
  });
}

// Hook to track allocation performance
export function useTrackAllocationPerformance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (performance: CampaignAllocationPerformance) => {
      const { data, error } = await supabase
        .from('campaign_allocations_performance')
        .upsert(performance)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Performance data updated successfully');
      queryClient.invalidateQueries({ queryKey: ['campaign-allocation-performance'] });
    },
    onError: (error) => {
      toast.error('Failed to update performance data');
      console.error('Performance tracking error:', error);
    }
  });
}

// Hook to fetch playlist performance history
export function usePlaylistPerformanceHistory(playlistId?: string) {
  return useQuery({
    queryKey: ['playlist-performance-history', playlistId],
    queryFn: async () => {
      let query = supabase
        .from('playlist_performance_history')
        .select('*')
        .order('period_end', { ascending: false });
      
      if (playlistId) {
        query = query.eq('playlist_id', playlistId);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      return data;
    }
  });
}

// Hook to update playlist performance
export function useUpdatePlaylistPerformance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (performance: PlaylistPerformanceHistory) => {
      const { data, error } = await supabase
        .from('playlist_performance_history')
        .upsert(performance)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Playlist performance updated');
      queryClient.invalidateQueries({ queryKey: ['playlist-performance-history'] });
    },
    onError: (error) => {
      toast.error('Failed to update playlist performance');
      console.error('Playlist performance error:', error);
    }
  });
}

// Hook to fetch vendor reliability scores
export function useVendorReliabilityScores() {
  return useQuery({
    queryKey: ['vendor-reliability-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_reliability_scores')
        .select('*')
        .order('quality_score', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

// Hook to update vendor reliability
export function useUpdateVendorReliability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reliability: VendorReliabilityScore) => {
      const { data, error } = await supabase
        .from('vendor_reliability_scores')
        .upsert(reliability)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Vendor reliability updated');
      queryClient.invalidateQueries({ queryKey: ['vendor-reliability-scores'] });
    },
    onError: (error) => {
      toast.error('Failed to update vendor reliability');
      console.error('Vendor reliability error:', error);
    }
  });
}

// Hook to fetch genre correlations
export function useGenreCorrelations() {
  return useQuery({
    queryKey: ['genre-correlations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('genre_correlation_matrix')
        .select('*')
        .order('correlation_score', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

// Hook to update genre correlations
export function useUpdateGenreCorrelations() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (correlations: Array<{
      genre_a: string;
      genre_b: string;
      correlation_score: number;
      sample_size: number;
      success_rate: number;
      avg_performance_lift: number;
    }>) => {
      const { data, error } = await supabase
        .from('genre_correlation_matrix')
        .upsert(correlations)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Genre correlations updated');
      queryClient.invalidateQueries({ queryKey: ['genre-correlations'] });
    },
    onError: (error) => {
      toast.error('Failed to update genre correlations');
      console.error('Genre correlation error:', error);
    }
  });
}

// Hook to fetch algorithm learning logs
export function useAlgorithmLearningLogs(limit = 100) {
  return useQuery({
    queryKey: ['algorithm-learning-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('algorithm_learning_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    }
  });
}

// Hook to analyze performance trends
export function usePerformanceTrends(timeRange = '30 days') {
  return useQuery({
    queryKey: ['performance-trends', timeRange],
    queryFn: async () => {
      const { data: allocationData, error: allocError } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .gte('created_at', new Date(Date.now() - (parseInt(timeRange) * 24 * 60 * 60 * 1000)).toISOString());
      
      if (allocError) throw allocError;
      
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlist_performance_history')
        .select('*')
        .gte('created_at', new Date(Date.now() - (parseInt(timeRange) * 24 * 60 * 60 * 1000)).toISOString());
      
      if (playlistError) throw playlistError;
      
      return {
        allocations: allocationData,
        playlists: playlistData
      };
    }
  });
}

// Hook to generate performance insights
export function usePerformanceInsights(): { data: PerformanceInsights | null; isLoading: boolean } {
  const { data: trends } = usePerformanceTrends();
  const { data: vendorReliability } = useVendorReliabilityScores();
  const { data: genreCorrelations } = useGenreCorrelations();
  
  const insightsQuery = useQuery({
    queryKey: ['performance-insights', trends, vendorReliability, genreCorrelations],
    queryFn: async (): Promise<PerformanceInsights> => {
      if (!trends) {
        return {
          topPerformingGenres: [],
          underperformingVendors: [],
          optimalAllocationSize: 0,
          seasonalTrends: [],
          riskFactors: [],
          recommendations: []
        };
      }
      
      const insights: PerformanceInsights = {
        topPerformingGenres: [],
        underperformingVendors: [],
        optimalAllocationSize: 0,
        seasonalTrends: [],
        riskFactors: [],
        recommendations: []
      };
      
      // Identify underperforming vendors
      if (vendorReliability) {
        insights.underperformingVendors = vendorReliability
          .filter(vendor => vendor.quality_score < 0.7 || vendor.delivery_consistency < 0.8)
          .map(vendor => ({
            name: 'Vendor ' + vendor.vendor_id.substring(0, 8),
            qualityScore: vendor.quality_score,
            deliveryConsistency: vendor.delivery_consistency
          }));
      }
      
      // Calculate optimal allocation size
      if (trends.allocations && trends.allocations.length > 0) {
        const performanceBySize = trends.allocations.reduce((acc: Record<number, { total: number; count: number }>, alloc) => {
          const size = Math.floor(alloc.allocated_streams / 1000) * 1000;
          if (!acc[size]) acc[size] = { total: 0, count: 0 };
          acc[size].total += alloc.performance_score;
          acc[size].count += 1;
          return acc;
        }, {});
        
        const bestSize = Object.entries(performanceBySize)
          .map(([size, data]) => ({ size: parseInt(size), avg: data.total / data.count }))
          .sort((a, b) => b.avg - a.avg)[0];
        
        insights.optimalAllocationSize = bestSize?.size || 0;
      }
      
      return insights;
    },
    enabled: !!trends
  });
  
  return {
    data: insightsQuery.data || null,
    isLoading: insightsQuery.isLoading
  };
}

// Hook to trigger learning updates
export function useTriggerLearningUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Update vendor reliability scores
      const { error: vendorError } = await supabase.rpc('update_vendor_reliability_scores');
      if (vendorError) throw vendorError;
      
      // Update playlist reliability scores for all playlists
      const { data: playlists } = await supabase.from('playlists').select('id');
      if (playlists) {
        await Promise.all(playlists.map(playlist => 
          supabase.rpc('update_playlist_reliability_score', { playlist_uuid: playlist.id })
        ));
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Learning system updated successfully');
      queryClient.invalidateQueries({ queryKey: ['vendor-reliability-scores'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-performance-history'] });
      queryClient.invalidateQueries({ queryKey: ['performance-trends'] });
    },
    onError: (error) => {
      toast.error('Failed to update learning system');
      console.error('Learning update error:', error);
    }
  });
}









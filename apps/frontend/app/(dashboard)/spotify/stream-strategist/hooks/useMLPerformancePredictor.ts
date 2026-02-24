"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { mlEngine, type MLPrediction, type MLFeatures } from '../lib/mlEngine';
import type { Playlist, Vendor } from '../types';
import { toast } from 'sonner';
import { fetchAllRows } from '../lib/utils';

export interface PerformancePredictionResult {
  playlistId: string;
  prediction: MLPrediction;
  features: MLFeatures;
  timestamp: Date;
}

export interface CampaignOptimizationResult {
  allocations: Array<{
    playlistId: string;
    vendorId: string;
    allocation: number;
    prediction: MLPrediction;
    score: number;
  }>;
  totalAllocated: number;
  goalCoverage: number;
  averageConfidence: number;
  riskAssessment: {
    low: number;
    medium: number;
    high: number;
  };
  optimizationInsights: string[];
}

export interface ProjectionRecord {
  campaignId: string;
  campaignName: string;
  projectedStreams: number;
  actualStreams: number;
  variancePercent: number;
  status: 'on_track' | 'over' | 'under';
}

export interface ProjectionAnalysisData {
  campaigns: ProjectionRecord[];
  overallAccuracy: number;
  totalProjected: number;
  totalActual: number;
  overallVariance: number;
  excludedCount: number;
}

// --- Campaign Intelligence: Projection vs Actual ---
export function useProjectionAnalysis() {
  return useQuery({
    queryKey: ['projection-analysis'],
    queryFn: async (): Promise<ProjectionAnalysisData> => {
      const [
        performanceData,
        cpList,
        { data: campaignGroups },
        { data: spotifyCampaigns },
      ] = await Promise.all([
        fetchAllRows('campaign_allocations_performance', '*, campaigns(name, status, stream_goal)'),
        fetchAllRows('campaign_playlists', 'campaign_id, vendor_id, streams_12m, streams_28d, is_algorithmic, is_organic'),
        supabase
          .from('campaign_groups' as any)
          .select('id, name, total_goal, status'),
        supabase
          .from('spotify_campaigns' as any)
          .select('id, campaign_group_id, campaign, goal'),
      ]);
      const cgList: any[] = (campaignGroups as any[]) || [];
      const scList: any[] = (spotifyCampaigns as any[]) || [];

      // Build bridge: spotify_campaigns.id (integer) → campaign_group_id (UUID)
      // Step 1: direct campaign_group_id link
      const songToGroupMap = new Map<string, string>();
      scList.forEach(sc => {
        if (sc.campaign_group_id) {
          songToGroupMap.set(String(sc.id), sc.campaign_group_id);
        }
      });

      // Step 2: for songs without campaign_group_id, match by name to campaign_groups
      const cgNameToId = new Map<string, string>();
      cgList.forEach(cg => {
        if (cg.name) cgNameToId.set(cg.name.toLowerCase().trim(), cg.id);
      });
      scList.forEach(sc => {
        if (sc.campaign_group_id) return;
        if (!sc.campaign) return;
        const matchedGroupId = cgNameToId.get(sc.campaign.toLowerCase().trim());
        if (matchedGroupId) {
          songToGroupMap.set(String(sc.id), matchedGroupId);
        }
      });

      // Aggregate campaign_playlists actual streams by campaign_group_id (UUID)
      const cpByGroup = new Map<string, number>();
      const cpBySong = new Map<string, number>();
      cpList.filter(p => !p.is_algorithmic && !p.is_organic).forEach(p => {
        const songId = String(p.campaign_id);
        const streams = p.streams_12m || p.streams_28d || 0;
        cpBySong.set(songId, (cpBySong.get(songId) || 0) + streams);

        const groupId = songToGroupMap.get(songId);
        if (groupId) {
          cpByGroup.set(groupId, (cpByGroup.get(groupId) || 0) + streams);
        }
      });

      const campaignMap = new Map<string, {
        name: string;
        projected: number;
        actual: number;
        goal: number;
      }>();

      // Strategy 1: campaign_groups + campaign_playlists (primary, has real stream data)
      cgList.forEach(cg => {
        const cpActual = cpByGroup.get(cg.id) || 0;
        if (cg.total_goal > 0 || cpActual > 0) {
          campaignMap.set(cg.id, {
            name: cg.name || 'Unknown',
            projected: cg.total_goal || 0,
            actual: cpActual,
            goal: cg.total_goal || 0,
          });
        }
      });

      // Strategy 2: spotify_campaigns without campaign_group (standalone songs with playlist data)
      scList.forEach(sc => {
        const songId = String(sc.id);
        if (songToGroupMap.has(songId)) return;
        const songActual = cpBySong.get(songId) || 0;
        const songGoal = parseInt(sc.goal) || 0;
        if (songGoal > 0 || songActual > 0) {
          const key = `song-${songId}`;
          campaignMap.set(key, {
            name: sc.campaign || `Song #${sc.id}`,
            projected: songGoal,
            actual: songActual,
            goal: songGoal,
          });
        }
      });

      // Strategy 3: campaign_allocations_performance (for stream_strategist_campaigns)
      (performanceData || []).forEach(record => {
        if (!record.campaigns) return;
        const cid = record.campaign_id;
        if (campaignMap.has(cid)) {
          const existing = campaignMap.get(cid)!;
          if (existing.actual === 0) {
            existing.actual += record.actual_streams || 0;
          }
          return;
        }
        const existing = campaignMap.get(cid) || {
          name: record.campaigns.name || 'Unknown',
          projected: 0,
          actual: 0,
          goal: record.campaigns.stream_goal || 0,
        };
        existing.projected += record.allocated_streams || record.predicted_streams || 0;
        existing.actual += record.actual_streams || 0;
        campaignMap.set(cid, existing);
      });

      const campaigns: ProjectionRecord[] = [];
      let totalProjected = 0;
      let totalActual = 0;
      let withinThreshold = 0;
      let excludedCount = 0;

      campaignMap.forEach((data, campaignId) => {
        if (data.projected === 0 && data.actual === 0) return;

        // Only include campaigns with actual delivery data
        if (data.actual === 0) {
          excludedCount++;
          return;
        }

        const variance = data.projected > 0
          ? ((data.actual - data.projected) / data.projected) * 100
          : 0;

        const status: 'on_track' | 'over' | 'under' =
          Math.abs(variance) <= 15 ? 'on_track' :
          variance > 0 ? 'over' : 'under';

        campaigns.push({
          campaignId,
          campaignName: data.name,
          projectedStreams: Math.round(data.projected),
          actualStreams: Math.round(data.actual),
          variancePercent: Math.round(variance * 10) / 10,
          status,
        });

        totalProjected += data.projected;
        totalActual += data.actual;
        if (Math.abs(variance) <= 20) withinThreshold++;
      });

      campaigns.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));

      const overallVariance = totalProjected > 0
        ? ((totalActual - totalProjected) / totalProjected) * 100
        : 0;

      return {
        campaigns,
        overallAccuracy: campaigns.length > 0
          ? (withinThreshold / campaigns.length) * 100
          : 0,
        totalProjected: Math.round(totalProjected),
        totalActual: Math.round(totalActual),
        overallVariance: Math.round(overallVariance * 10) / 10,
        excludedCount,
      };
    },
    staleTime: 10 * 60 * 1000,
  });
}

// --- Campaign Builder hooks (unchanged, used by other components) ---

export function useMLPerformancePrediction(
  playlist: Playlist | null,
  campaign: {
    genres: string[];
    budget: number;
    duration: number;
    goal: number;
  } | null
) {
  return useQuery({
    queryKey: ['ml-performance-prediction', playlist?.id, campaign],
    queryFn: async (): Promise<PerformancePredictionResult | null> => {
      if (!playlist || !campaign) return null;

      const { data: vendor } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', playlist.vendor_id)
        .single();

      const { data: historicalData } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const features = mlEngine.extractFeatures(
        playlist,
        campaign,
        vendor || undefined,
        historicalData || []
      );

      const prediction = mlEngine.predictPerformance(features);

      return {
        playlistId: playlist.id,
        prediction,
        features,
        timestamp: new Date()
      };
    },
    enabled: !!playlist && !!campaign,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMLBatchPerformancePrediction(
  playlists: Playlist[],
  campaign: {
    genres: string[];
    budget: number;
    duration: number;
    goal: number;
  } | null
) {
  return useQuery({
    queryKey: ['ml-batch-performance-prediction', playlists.map(p => p.id), campaign],
    queryFn: async (): Promise<PerformancePredictionResult[]> => {
      if (!playlists.length || !campaign) return [];

      const vendorIds = [...new Set(playlists.map(p => p.vendor_id))];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);

      const vendorMap = new Map((vendors || []).map(v => [v.id, v]));

      const playlistIds = playlists.map(p => p.id);
      const { data: historicalData } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .in('playlist_id', playlistIds)
        .order('created_at', { ascending: false });

      const historicalByPlaylist = new Map<string, any[]>();
      (historicalData || []).forEach(record => {
        if (!historicalByPlaylist.has(record.playlist_id)) {
          historicalByPlaylist.set(record.playlist_id, []);
        }
        historicalByPlaylist.get(record.playlist_id)!.push(record);
      });

      const predictions: PerformancePredictionResult[] = [];
      
      for (const playlist of playlists) {
        const vendor = vendorMap.get(playlist.vendor_id);
        const playlistHistory = historicalByPlaylist.get(playlist.id) || [];

        const features = mlEngine.extractFeatures(
          playlist,
          campaign,
          vendor,
          playlistHistory
        );

        const prediction = mlEngine.predictPerformance(features);

        predictions.push({
          playlistId: playlist.id,
          prediction,
          features,
          timestamp: new Date()
        });
      }

      return predictions;
    },
    enabled: playlists.length > 0 && !!campaign,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMLCampaignOptimization(
  playlists: Playlist[],
  campaign: {
    genres: string[];
    budget: number;
    duration: number;
    goal: number;
  } | null
) {
  return useQuery({
    queryKey: ['ml-campaign-optimization', playlists.map(p => p.id), campaign],
    queryFn: async (): Promise<CampaignOptimizationResult | null> => {
      if (!playlists.length || !campaign) return null;

      const vendorIds = [...new Set(playlists.map(p => p.vendor_id))];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);

      const { data: historicalData } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      const allocations = mlEngine.optimizeAllocation(
        playlists,
        campaign,
        vendors || [],
        historicalData || []
      );

      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocation, 0);
      const goalCoverage = totalAllocated / campaign.goal;

      const averageConfidence = allocations.reduce(
        (sum, a) => sum + a.prediction.confidence, 0
      ) / Math.max(allocations.length, 1);

      const riskCounts = { low: 0, medium: 0, high: 0 };
      allocations.forEach(a => {
        if (a.prediction.riskScore < 0.3) riskCounts.low++;
        else if (a.prediction.riskScore < 0.7) riskCounts.medium++;
        else riskCounts.high++;
      });

      const optimizationInsights: string[] = [];
      
      if (goalCoverage < 0.8) {
        optimizationInsights.push('Campaign may not reach target goal with current playlist selection');
      }
      if (averageConfidence < 0.7) {
        optimizationInsights.push('Low prediction confidence - consider adding more reliable playlists');
      }
      if (riskCounts.high > allocations.length * 0.3) {
        optimizationInsights.push('High risk allocations detected - review vendor reliability');
      }
      const topPerformers = allocations
        .filter(a => a.prediction.performanceCategory === 'excellent')
        .length;
      if (topPerformers > 0) {
        optimizationInsights.push(`${topPerformers} playlists predicted to exceed expectations`);
      }

      return {
        allocations,
        totalAllocated,
        goalCoverage,
        averageConfidence,
        riskAssessment: riskCounts,
        optimizationInsights
      };
    },
    enabled: playlists.length > 0 && !!campaign,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStorePredictionResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (result: {
      campaignId: string;
      playlistId: string;
      vendorId: string;
      prediction: MLPrediction;
      features: MLFeatures;
      actualOutcome?: {
        actualStreams: number;
        performanceScore: number;
      };
    }) => {
      const { data, error } = await supabase
        .from('algorithm_learning_log')
        .insert({
          campaign_id: result.campaignId,
          algorithm_version: '3.0-ml',
          decision_type: 'ml_performance_prediction',
          input_data: {
            playlistId: result.playlistId,
            vendorId: result.vendorId,
            predictedStreams: result.prediction.predictedStreams,
            confidence: result.prediction.confidence
          },
          decision_data: {
            predictedStreams: result.prediction.predictedStreams,
            confidence: result.prediction.confidence,
            riskScore: result.prediction.riskScore,
            contributingFactors: result.prediction.contributingFactors
          },
          performance_impact: result.actualOutcome?.performanceScore,
          confidence_score: result.prediction.confidence
        })
        .select();

      if (error) throw error;

      if (result.actualOutcome) {
        const { error: perfError } = await supabase
          .from('campaign_allocations_performance')
          .upsert({
            campaign_id: result.campaignId,
            playlist_id: result.playlistId,
            vendor_id: result.vendorId,
            allocated_streams: result.prediction.predictedStreams,
            predicted_streams: result.prediction.predictedStreams,
            actual_streams: result.actualOutcome.actualStreams,
            performance_score: result.actualOutcome.performanceScore
          });

        if (perfError) throw perfError;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Prediction stored for learning');
      queryClient.invalidateQueries({ queryKey: ['algorithm-learning-logs'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-allocation-performance'] });
    },
    onError: (error) => {
      toast.error('Failed to store prediction');
      console.error('Prediction storage error:', error);
    }
  });
}

// Keep backward-compatible export name
export const useMLModelAnalysis = useProjectionAnalysis;

"use client"

// ML-Driven Performance Prediction Hook

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { mlEngine, type MLPrediction, type MLFeatures } from '../lib/mlEngine';
import type { Playlist, Vendor } from '../types';
import { toast } from 'sonner';

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

// Hook to predict performance for a single playlist
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

      // Fetch vendor data
      const { data: vendor } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', playlist.vendor_id)
        .single();

      // Fetch historical performance data
      const { data: historicalData } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Extract features and make prediction
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to predict performance for multiple playlists
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

      // Fetch vendors data
      const vendorIds = [...new Set(playlists.map(p => p.vendor_id))];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);

      const vendorMap = new Map((vendors || []).map(v => [v.id, v]));

      // Fetch historical performance data for all playlists
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

      // Generate predictions for all playlists
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to optimize campaign allocation using ML
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

      // Fetch vendors data
      const vendorIds = [...new Set(playlists.map(p => p.vendor_id))];
      const { data: vendors } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);

      // Fetch historical performance data
      const { data: historicalData } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Run ML optimization
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

      // Risk assessment
      const riskCounts = { low: 0, medium: 0, high: 0 };
      allocations.forEach(a => {
        if (a.prediction.riskScore < 0.3) riskCounts.low++;
        else if (a.prediction.riskScore < 0.7) riskCounts.medium++;
        else riskCounts.high++;
      });

      // Generate optimization insights
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to store ML prediction results for learning
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
      // Store in algorithm learning log
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

      // If we have actual outcome, also update campaign allocations performance
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
      toast.success('ML prediction stored for learning');
      queryClient.invalidateQueries({ queryKey: ['algorithm-learning-logs'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-allocation-performance'] });
    },
    onError: (error) => {
      toast.error('Failed to store ML prediction');
      console.error('ML prediction storage error:', error);
    }
  });
}

// Hook to analyze ML model performance
export function useMLModelAnalysis() {
  return useQuery({
    queryKey: ['ml-model-analysis'],
    queryFn: async () => {
      // Fetch recent ML predictions and actual outcomes
      const { data: learningLogs, error: logsError } = await supabase
        .from('algorithm_learning_log')
        .select('*')
        .eq('algorithm_version', '3.0-ml')
        .eq('decision_type', 'ml_performance_prediction')
        .not('performance_impact', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      if (!learningLogs || learningLogs.length === 0) {
        return {
          accuracy: 0,
          mae: 0,
          rmse: 0,
          predictionCount: 0,
          confidenceCalibration: [],
          performanceBias: 0,
          insights: ['Not enough data for model analysis']
        };
      }

      // Calculate prediction accuracy metrics
      let totalSquaredError = 0;
      let totalAbsoluteError = 0;
      let correctPredictions = 0;
      
      const confidenceBuckets = new Map<string, { correct: number; total: number }>();

      learningLogs.forEach(log => {
        const predicted = typeof log.decision_data === 'object' && log.decision_data && 'predictedStreams' in log.decision_data 
          ? (log.decision_data as any).predictedStreams || 0 : 0;
        const actual = log.performance_impact || 0;
        const confidence = log.confidence_score || 0;

        const error = predicted - actual;
        totalSquaredError += error * error;
        totalAbsoluteError += Math.abs(error);

        // Check if prediction was "correct" (within 20% of actual)
        if (Math.abs(error) / Math.max(actual, 1) < 0.2) {
          correctPredictions++;
        }

        // Group by confidence buckets
        const confidenceBucket = Math.floor(confidence * 10) / 10;
        const bucketKey = confidenceBucket.toFixed(1);
        if (!confidenceBuckets.has(bucketKey)) {
          confidenceBuckets.set(bucketKey, { correct: 0, total: 0 });
        }
        const bucket = confidenceBuckets.get(bucketKey)!;
        bucket.total++;
        if (Math.abs(error) / Math.max(actual, 1) < 0.2) {
          bucket.correct++;
        }
      });

      const count = learningLogs.length;
      const accuracy = correctPredictions / count;
      const mae = totalAbsoluteError / count;
      const rmse = Math.sqrt(totalSquaredError / count);

      // Calculate confidence calibration
      const confidenceCalibration = Array.from(confidenceBuckets.entries()).map(
        ([confidence, bucket]) => ({
          confidence: parseFloat(confidence),
          accuracy: bucket.correct / bucket.total,
          sampleSize: bucket.total
        })
      );

      // Generate insights
      const insights: string[] = [];
      if (accuracy > 0.8) {
        insights.push('Model is performing well with high accuracy');
      } else if (accuracy > 0.6) {
        insights.push('Model performance is acceptable but could be improved');
      } else {
        insights.push('Model needs improvement - low prediction accuracy');
      }

      if (mae < 1000) {
        insights.push('Prediction errors are within acceptable range');
      } else {
        insights.push('High prediction errors detected - model may need retraining');
      }

      return {
        accuracy,
        mae,
        rmse,
        predictionCount: count,
        confidenceCalibration,
        performanceBias: totalAbsoluteError / count,
        insights
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}









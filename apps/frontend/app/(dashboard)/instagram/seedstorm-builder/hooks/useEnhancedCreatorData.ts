import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Creator } from '../lib/types';

interface CreatorMLFeatures {
  creator_id: string;
  avg_engagement_rate: number;
  engagement_volatility: number;
  peak_engagement_rate: number;
  engagement_trend_slope: number;
  follower_growth_rate: number;
  views_growth_rate: number;
  consistency_score: number;
  post_frequency: number;
  content_type_distribution: Record<string, number>;
  hashtag_effectiveness: Record<string, number>;
  optimal_posting_times: number[];
  campaign_success_rate: number;
  avg_performance_vs_prediction: number;
  genre_affinity_scores: Record<string, number>;
  seasonal_performance_multiplier: number;
  market_trend_correlation: number;
}

interface PostPerformance {
  id: string;
  campaign_id: string | null;
  creator_id: string | null;
  post_url: string;
  post_type: string;
  posted_at: string | null;
  views_total: number;
  engagement_rate_final: number;
  predicted_views: number;
  performance_vs_prediction: number;
  hashtags: string[] | null;
  music_used: string | null;
}

interface EnhancedCreatorData {
  creator: Creator;
  mlFeatures?: CreatorMLFeatures;
  performanceHistory: PostPerformance[];
  reliability_score: number;
  genre_affinity_scores: Record<string, number>;
  optimal_content_types: string[];
  seasonal_multiplier: number;
}

export function useEnhancedCreatorData(creators: Creator[]) {
  const [enhancedData, setEnhancedData] = useState<Record<string, EnhancedCreatorData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnhancedData = async () => {
      if (creators.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const creatorIds = creators.map(c => c.id);

        // Fetch ML features for all creators
        const { data: mlFeatures, error: mlError } = await supabase
          .from('creator_ml_features')
          .select('*')
          .in('creator_id', creatorIds)
          .order('period_end', { ascending: false });

        if (mlError) {
          console.error('Error fetching ML features:', mlError);
        }

        // Fetch performance history for all creators
        const { data: performances, error: perfError } = await supabase
          .from('post_performance_tracking')
          .select('*')
          .in('creator_id', creatorIds)
          .order('posted_at', { ascending: false })
          .limit(1000); // Get recent performances

        if (perfError) {
          console.error('Error fetching performance data:', perfError);
        }

        // Process and combine data for each creator
        const enhanced: Record<string, EnhancedCreatorData> = {};

        creators.forEach(creator => {
          // Get latest ML features for this creator
          const rawFeatures = mlFeatures?.find(f => f.creator_id === creator.id);
          
          // Convert and type-cast ML features from Supabase Json types
          const latestFeatures: CreatorMLFeatures | undefined = rawFeatures ? {
            creator_id: rawFeatures.creator_id,
            avg_engagement_rate: rawFeatures.avg_engagement_rate,
            engagement_volatility: rawFeatures.engagement_volatility,
            peak_engagement_rate: rawFeatures.peak_engagement_rate,
            engagement_trend_slope: rawFeatures.engagement_trend_slope,
            follower_growth_rate: rawFeatures.follower_growth_rate,
            views_growth_rate: rawFeatures.views_growth_rate,
            consistency_score: rawFeatures.consistency_score,
            post_frequency: rawFeatures.post_frequency,
            content_type_distribution: (rawFeatures.content_type_distribution as any) || {},
            hashtag_effectiveness: (rawFeatures.hashtag_effectiveness as any) || {},
            optimal_posting_times: rawFeatures.optimal_posting_times || [],
            campaign_success_rate: rawFeatures.campaign_success_rate,
            avg_performance_vs_prediction: rawFeatures.avg_performance_vs_prediction,
            genre_affinity_scores: (rawFeatures.genre_affinity_scores as any) || {},
            seasonal_performance_multiplier: rawFeatures.seasonal_performance_multiplier,
            market_trend_correlation: rawFeatures.market_trend_correlation
          } : undefined;
          
          // Get performance history for this creator
          const creatorPerformances = performances?.filter(p => p.creator_id === creator.id) || [];

          // Calculate reliability score from performance history
          const reliabilityScore = calculateReliabilityScore(creatorPerformances);

          // Extract genre affinity scores
          const genreAffinityScores = (latestFeatures?.genre_affinity_scores as Record<string, number>) || {};

          // Determine optimal content types from ML features
          const optimalContentTypes = determineOptimalContentTypes(latestFeatures);

          // Get seasonal multiplier (current month)
          const currentMonth = new Date().getMonth();
          const seasonalMultiplier = latestFeatures?.seasonal_performance_multiplier || 1.0;

          enhanced[creator.id] = {
            creator,
            mlFeatures: latestFeatures,
            performanceHistory: creatorPerformances,
            reliability_score: reliabilityScore,
            genre_affinity_scores: genreAffinityScores,
            optimal_content_types: optimalContentTypes,
            seasonal_multiplier: seasonalMultiplier
          };
        });

        setEnhancedData(enhanced);
      } catch (error) {
        console.error('Error fetching enhanced creator data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnhancedData();
  }, [creators]);

  return { enhancedData, loading };
}

// Calculate reliability score based on performance consistency
function calculateReliabilityScore(performances: PostPerformance[]): number {
  if (performances.length === 0) return 0.5; // Default for new creators

  // Calculate performance vs prediction consistency
  const performanceRatios = performances
    .filter(p => p.performance_vs_prediction > 0)
    .map(p => p.performance_vs_prediction);

  if (performanceRatios.length === 0) return 0.5;

  // Calculate coefficient of variation (lower = more reliable)
  const mean = performanceRatios.reduce((sum, ratio) => sum + ratio, 0) / performanceRatios.length;
  const variance = performanceRatios.reduce((sum, ratio) => sum + Math.pow(ratio - mean, 2), 0) / performanceRatios.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  // Convert to reliability score (0-1, where 1 is most reliable)
  const reliabilityScore = Math.max(0, 1 - coefficientOfVariation);
  
  // Factor in number of data points (more data = higher confidence)
  const dataConfidence = Math.min(1, performances.length / 10);
  
  return reliabilityScore * dataConfidence + (1 - dataConfidence) * 0.5;
}

// Determine optimal content types from ML features
function determineOptimalContentTypes(features?: CreatorMLFeatures): string[] {
  if (!features?.content_type_distribution) return [];

  // Sort content types by performance
  const sortedTypes = Object.entries(features.content_type_distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3) // Top 3 performing content types
    .map(([type]) => type);

  return sortedTypes;
}

// Get genre compatibility score using ML-derived affinity scores
export function getMLGenreCompatibilityScore(
  genreAffinityScores: Record<string, number>,
  campaignGenres: string[]
): number {
  if (Object.keys(genreAffinityScores).length === 0) return 0;

  let maxScore = 0;
  
  campaignGenres.forEach(genre => {
    const affinityScore = genreAffinityScores[genre] || 0;
    maxScore = Math.max(maxScore, affinityScore * 100); // Convert to 0-100 scale
  });

  return maxScore;
}

// Predict performance using ML features
export function predictPerformanceWithML(
  features?: CreatorMLFeatures,
  campaignGenres: string[] = [],
  postType: string = 'reel'
): number {
  if (!features) return 1.0; // Default multiplier

  let performanceMultiplier = 1.0;

  // Factor in genre affinity
  const genreScore = getMLGenreCompatibilityScore(features.genre_affinity_scores, campaignGenres);
  if (genreScore > 0) {
    performanceMultiplier *= (1 + (genreScore / 100 - 0.5) * 0.3); // ±30% based on genre affinity
  }

  // Factor in content type optimization
  const contentTypeMultiplier = features.content_type_distribution[postType] || 1.0;
  performanceMultiplier *= contentTypeMultiplier;

  // Factor in seasonal performance
  performanceMultiplier *= features.seasonal_performance_multiplier;

  // Factor in consistency score (more consistent = more predictable)
  const consistencyBonus = features.consistency_score > 0.8 ? 1.1 : 
                          features.consistency_score > 0.6 ? 1.0 : 0.9;
  performanceMultiplier *= consistencyBonus;

  // Factor in recent trend
  if (features.engagement_trend_slope > 0.1) {
    performanceMultiplier *= 1.15; // Growing creators get boost
  } else if (features.engagement_trend_slope < -0.1) {
    performanceMultiplier *= 0.9; // Declining creators get penalty
  }

  return Math.max(0.3, Math.min(2.0, performanceMultiplier)); // Keep within reasonable bounds
}
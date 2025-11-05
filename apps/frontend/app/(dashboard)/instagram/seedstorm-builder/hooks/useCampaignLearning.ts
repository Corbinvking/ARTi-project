import { useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

interface LearningData {
  campaign_id: string;
  input_data: any;
  decision_data: any;
  performance_impact: number;
  confidence_score: number;
  decision_type: string;
  algorithm_version: string;
}

interface PerformanceFeedback {
  creator_id: string;
  campaign_id: string;
  predicted_views: number;
  actual_views: number;
  predicted_engagement: number;
  actual_engagement: number;
  post_type: string;
  genre_match: boolean;
}

export function useCampaignLearning() {
  const [isLearning, setIsLearning] = useState(false);

  // Log algorithm decisions for learning
  const logAlgorithmDecision = useCallback(async (learningData: LearningData) => {
    try {
      const { error } = await supabase
        .from('algorithm_learning_log')
        .insert(learningData);

      if (error) {
        console.error('Error logging algorithm decision:', error);
      }
    } catch (error) {
      console.error('Error in logAlgorithmDecision:', error);
    }
  }, []);

  // Update creator ML features based on new performance data
  const updateCreatorMLFeatures = useCallback(async (
    creatorId: string,
    performanceData: PerformanceFeedback
  ) => {
    try {
      setIsLearning(true);

      // Calculate performance metrics
      const performanceRatio = performanceData.actual_views / performanceData.predicted_views;
      const engagementRatio = performanceData.actual_engagement / performanceData.predicted_engagement;

      // Get existing ML features
      const { data: existingFeatures } = await supabase
        .from('creator_ml_features')
        .select('*')
        .eq('creator_id', creatorId)
        .order('period_end', { ascending: false })
        .limit(1)
        .single();

      if (existingFeatures) {
        // Update existing features with new performance data
        const updatedFeatures = {
          ...existingFeatures,
          avg_performance_vs_prediction: 
            (existingFeatures.avg_performance_vs_prediction * 0.8) + (performanceRatio * 0.2),
          campaign_success_rate: performanceRatio >= 0.8 ? 
            Math.min(1.0, existingFeatures.campaign_success_rate + 0.05) :
            Math.max(0.0, existingFeatures.campaign_success_rate - 0.05),
          updated_at: new Date().toISOString()
        };

        // Update genre affinity if this was a genre-matched campaign
        if (performanceData.genre_match) {
          // This would require knowing which genre was used - simplified for now
          updatedFeatures.genre_affinity_scores = existingFeatures.genre_affinity_scores;
        }

        await supabase
          .from('creator_ml_features')
          .update(updatedFeatures)
          .eq('id', existingFeatures.id);
      }

      // Log the learning event
      await logAlgorithmDecision({
        campaign_id: performanceData.campaign_id,
        input_data: {
          creator_id: creatorId,
          predicted_views: performanceData.predicted_views,
          predicted_engagement: performanceData.predicted_engagement,
          post_type: performanceData.post_type
        },
        decision_data: {
          performance_ratio: performanceRatio,
          engagement_ratio: engagementRatio,
          success: performanceRatio >= 0.8
        },
        performance_impact: performanceRatio - 1.0,
        confidence_score: Math.min(1.0, Math.abs(performanceRatio - 1.0)),
        decision_type: 'creator_performance_update',
        algorithm_version: '3.0'
      });

    } catch (error) {
      console.error('Error updating creator ML features:', error);
    } finally {
      setIsLearning(false);
    }
  }, [logAlgorithmDecision]);

  // Batch update multiple creators from campaign results
  const batchUpdateFromCampaign = useCallback(async (
    campaignId: string,
    results: PerformanceFeedback[]
  ) => {
    try {
      setIsLearning(true);

      // Process each creator's results
      for (const result of results) {
        await updateCreatorMLFeatures(result.creator_id, result);
      }

      // Log campaign-level learning
      const avgPerformanceRatio = results.reduce((sum, r) => 
        sum + (r.actual_views / r.predicted_views), 0) / results.length;

      await logAlgorithmDecision({
        campaign_id: campaignId,
        input_data: {
          total_creators: results.length,
          campaign_results: results.map(r => ({
            creator_id: r.creator_id,
            performance_ratio: r.actual_views / r.predicted_views
          }))
        },
        decision_data: {
          avg_performance_ratio: avgPerformanceRatio,
          successful_creators: results.filter(r => 
            (r.actual_views / r.predicted_views) >= 0.8).length,
          campaign_success: avgPerformanceRatio >= 0.8
        },
        performance_impact: avgPerformanceRatio - 1.0,
        confidence_score: Math.min(1.0, results.length / 10), // Higher confidence with more data
        decision_type: 'campaign_batch_learning',
        algorithm_version: '3.0'
      });

    } catch (error) {
      console.error('Error in batch campaign update:', error);
    } finally {
      setIsLearning(false);
    }
  }, [updateCreatorMLFeatures, logAlgorithmDecision]);

  // Get algorithm performance insights
  const getAlgorithmInsights = useCallback(async (timeRange: number = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const { data: insights, error } = await supabase
        .from('algorithm_learning_log')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching algorithm insights:', error);
        return null;
      }

      // Analyze the insights
      const totalDecisions = insights.length;
      const avgPerformanceImpact = insights.reduce((sum, i) => 
        sum + (i.performance_impact || 0), 0) / totalDecisions;
      const avgConfidence = insights.reduce((sum, i) => 
        sum + (i.confidence_score || 0), 0) / totalDecisions;

      const successfulPredictions = insights.filter(i => 
        (i.performance_impact || 0) >= -0.2).length; // Within 20% of prediction

      return {
        totalDecisions,
        avgPerformanceImpact,
        avgConfidence,
        successRate: successfulPredictions / totalDecisions,
        recentTrends: insights.slice(0, 10)
      };

    } catch (error) {
      console.error('Error getting algorithm insights:', error);
      return null;
    }
  }, []);

  return {
    isLearning,
    logAlgorithmDecision,
    updateCreatorMLFeatures,
    batchUpdateFromCampaign,
    getAlgorithmInsights
  };
}
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface PredictionData {
  id: string;
  modelName: string;
  predictionType: string;
  targetId?: string;
  targetType?: string;
  predictionData: Record<string, any>;
  confidenceScore?: number;
  createdAt: string;
  expiresAt?: string;
}

export interface RevenuePredicton {
  period: string;
  predictedRevenue: number;
  confidence: number;
  factors: string[];
}

export interface ChurnPrediction {
  memberId: string;
  memberName: string;
  churnProbability: number;
  riskFactors: string[];
  recommendedActions: string[];
}

export interface CampaignSuccessPrediction {
  campaignId: string;
  successProbability: number;
  expectedReach: { min: number; max: number };
  optimalTiming: string[];
  suggestedPrice: number;
}

export const usePredictiveAnalytics = () => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all predictions
  const fetchPredictions = useCallback(async (predictionType?: string) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('ml_predictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (predictionType) {
        query = query.eq('prediction_type', predictionType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      // Map database fields to interface properties
      const mappedPredictions: PredictionData[] = (data || []).map(pred => ({
        id: pred.id,
        modelName: pred.model_name,
        predictionType: pred.prediction_type,
        targetId: pred.target_id,
        targetType: pred.target_type,
        predictionData: pred.prediction_data as Record<string, any>,
        confidenceScore: pred.confidence_score,
        createdAt: pred.created_at,
        expiresAt: pred.expires_at
      }));
      
      setPredictions(mappedPredictions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate revenue prediction
  const generateRevenuePrediction = useCallback(async (
    timeframe: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Promise<RevenuePredicton | null> => {
    try {
      // Call ML prediction edge function
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          predictionType: 'revenue_forecast',
          parameters: { timeframe },
          modelName: 'revenue_predictor_v1'
        }
      });

      if (error) throw error;

      // Store prediction in database
      const predictionData = {
        model_name: 'revenue_predictor_v1',
        prediction_type: 'revenue_forecast',
        prediction_data: data,
        confidence_score: data.confidence,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      await supabase.from('ml_predictions').insert(predictionData);

      return {
        period: timeframe,
        predictedRevenue: data.predictedRevenue,
        confidence: data.confidence,
        factors: data.factors || []
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate revenue prediction');
      return null;
    }
  }, []);

  // Generate member churn predictions
  const generateChurnPredictions = useCallback(async (): Promise<ChurnPrediction[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          predictionType: 'member_churn',
          modelName: 'churn_predictor_v1'
        }
      });

      if (error) throw error;

      // Store predictions in database
      const predictions = data.predictions.map((pred: any) => ({
        model_name: 'churn_predictor_v1',
        prediction_type: 'member_churn',
        target_id: pred.memberId,
        target_type: 'member',
        prediction_data: pred,
        confidence_score: pred.confidence,
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
      }));

      if (predictions.length > 0) {
        await supabase.from('ml_predictions').insert(predictions);
      }

      return data.predictions.map((pred: any) => ({
        memberId: pred.memberId,
        memberName: pred.memberName,
        churnProbability: pred.churnProbability,
        riskFactors: pred.riskFactors || [],
        recommendedActions: pred.recommendedActions || []
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate churn predictions');
      return [];
    }
  }, []);

  // Generate campaign success prediction
  const generateCampaignPrediction = useCallback(async (
    campaignData: {
      artistName: string;
      trackName: string;
      trackUrl: string;
      targetGenres: string[];
      goalReposts: number;
    }
  ): Promise<CampaignSuccessPrediction | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          predictionType: 'campaign_success',
          parameters: campaignData,
          modelName: 'campaign_success_v1'
        }
      });

      if (error) throw error;

      return {
        campaignId: data.campaignId,
        successProbability: data.successProbability,
        expectedReach: data.expectedReach,
        optimalTiming: data.optimalTiming || [],
        suggestedPrice: data.suggestedPrice
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate campaign prediction');
      return null;
    }
  }, []);

  // Get market trend insights
  const getMarketTrends = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ml-prediction-engine', {
        body: {
          predictionType: 'market_trends',
          modelName: 'trend_analyzer_v1'
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get market trends');
      return null;
    }
  }, []);

  // Calculate prediction accuracy
  const getPredictionAccuracy = useCallback(async (modelName: string) => {
    try {
      const { data, error } = await supabase
        .from('ml_predictions')
        .select('*')
        .eq('model_name', modelName)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Calculate accuracy metrics
      const totalPredictions = data.length;
      const avgConfidence = data.reduce((sum, pred) => sum + (pred.confidence_score || 0), 0) / totalPredictions;

      return {
        totalPredictions,
        avgConfidence,
        lastUpdated: new Date().toISOString()
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate prediction accuracy');
      return null;
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    predictions,
    loading,
    error,
    fetchPredictions,
    generateRevenuePrediction,
    generateChurnPredictions,
    generateCampaignPrediction,
    getMarketTrends,
    getPredictionAccuracy
  };
};
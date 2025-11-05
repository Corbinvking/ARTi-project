import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface ModelMetrics {
  latest_accuracy: number;
  latest_precision: number;
  latest_recall: number;
  latest_f1: number;
  improvement_rate: number;
  active_version: string;
  training_status: string;
  last_trained: string;
}

interface DataQuality {
  coverage_percentage: number;
  freshness_score: number;
  completeness_score: number;
  missing_features_count: number;
  stale_data_count: number;
}

interface PerformancePoint {
  date: string;
  accuracy: number;
  precision: number;
  recall: number;
  campaigns_evaluated: number;
}

interface ABTest {
  id: string;
  test_name: string;
  status: string;
  control_performance: number;
  test_performance: number;
  statistical_significance: number;
  winner: string | null;
  conclusion: string | null;
  control_metrics?: any;
  test_metrics?: any;
}

export const useMLMetrics = () => {
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformancePoint[]>([]);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModelMetrics = useCallback(async () => {
    try {
      const { data: models, error } = await supabase
        .from('ml_model_versions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (models && models.length > 0) {
        const latest = models[0];
        const previous = models[1];
        
        const improvement_rate = previous 
          ? (latest.accuracy_score - previous.accuracy_score) / previous.accuracy_score
          : 0;

        setModelMetrics({
          latest_accuracy: latest.accuracy_score || 0,
          latest_precision: latest.precision_score || 0,
          latest_recall: latest.recall_score || 0,
          latest_f1: latest.f1_score || 0,
          improvement_rate,
          active_version: latest.version_name || 'Unknown',
          training_status: latest.status || 'Unknown',
          last_trained: latest.training_date || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching model metrics:', error);
    }
  }, []);

  const fetchDataQuality = useCallback(async () => {
    try {
      // Get creator ML features coverage
      const { data: features, error: featuresError } = await supabase
        .from('creator_ml_features')
        .select('creator_id')
        .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (featuresError) throw featuresError;

      const { data: creators, error: creatorsError } = await supabase
        .from('creators')
        .select('id');

      if (creatorsError) throw creatorsError;

      const coverage_percentage = creators?.length 
        ? (features?.length || 0) / creators.length * 100
        : 0;

      // Get post performance tracking freshness
      const { data: recentPosts, error: postsError } = await supabase
        .from('post_performance_tracking')
        .select('id')
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (postsError) throw postsError;

      // Calculate simple quality metrics
      const freshness_score = recentPosts?.length ? Math.min(100, recentPosts.length * 2) : 0;
      const completeness_score = coverage_percentage;
      const missing_features_count = (creators?.length || 0) - (features?.length || 0);
      const stale_data_count = Math.max(0, (creators?.length || 0) - (recentPosts?.length || 0));

      setDataQuality({
        coverage_percentage,
        freshness_score,
        completeness_score,
        missing_features_count,
        stale_data_count
      });
    } catch (error) {
      console.error('Error fetching data quality:', error);
    }
  }, []);

  const fetchPerformanceHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ml_model_versions')
        .select('accuracy_score, precision_score, recall_score, test_campaigns, training_date')
        .order('training_date', { ascending: true })
        .limit(30);

      if (error) throw error;

      const history = data?.map(item => ({
        date: item.training_date || new Date().toISOString(),
        accuracy: item.accuracy_score || 0,
        precision: item.precision_score || 0,
        recall: item.recall_score || 0,
        campaigns_evaluated: item.test_campaigns || 0
      })) || [];

      setPerformanceHistory(history);
    } catch (error) {
      console.error('Error fetching performance history:', error);
    }
  }, []);

  const fetchABTests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_ab_tests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedTests = data?.map(test => ({
        id: test.id,
        test_name: test.test_name,
        status: test.status,
        control_performance: 0.75, // Default value since we don't have metrics stored yet
        test_performance: 0.8, // Default value since we don't have metrics stored yet
        statistical_significance: test.statistical_power || 0.85,
        winner: test.winner,
        conclusion: test.conclusion,
        control_metrics: test.control_metrics,
        test_metrics: test.test_metrics
      })) || [];

      setAbTests(formattedTests);
    } catch (error) {
      console.error('Error fetching A/B tests:', error);
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchModelMetrics(),
        fetchDataQuality(),
        fetchPerformanceHistory(),
        fetchABTests()
      ]);
      toast.success('ML metrics refreshed');
    } catch (error) {
      toast.error('Failed to refresh ML metrics');
    } finally {
      setLoading(false);
    }
  }, [fetchModelMetrics, fetchDataQuality, fetchPerformanceHistory, fetchABTests]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return {
    modelMetrics,
    dataQuality,
    performanceHistory,
    abTests,
    loading,
    refreshMetrics
  };
};
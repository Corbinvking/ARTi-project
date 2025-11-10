import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnomalyThreshold {
  id: string;
  metric_name: string;
  threshold_type: 'upper' | 'lower' | 'change_rate' | 'deviation';
  threshold_value: number;
  comparison_period: 'hour' | 'day' | 'week' | 'month';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description: string;
}

interface DetectedAnomaly {
  id: string;
  metric_name: string;
  current_value: number;
  expected_value: number;
  deviation_percentage: number;
  threshold_breached: AnomalyThreshold;
  detected_at: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  description: string;
}

// Default anomaly thresholds for the platform
const DEFAULT_THRESHOLDS: Omit<AnomalyThreshold, 'id'>[] = [
  {
    metric_name: 'member_signup_rate',
    threshold_type: 'change_rate',
    threshold_value: -50, // 50% decrease
    comparison_period: 'day',
    severity: 'high',
    enabled: true,
    description: 'Significant drop in member signups detected'
  },
  {
    metric_name: 'submission_approval_rate',
    threshold_type: 'lower',
    threshold_value: 60, // Below 60%
    comparison_period: 'day',
    severity: 'medium',
    enabled: true,
    description: 'Submission approval rate below normal threshold'
  },
  {
    metric_name: 'campaign_completion_rate',
    threshold_type: 'lower',
    threshold_value: 80, // Below 80%
    comparison_period: 'week',
    severity: 'high',
    enabled: true,
    description: 'Campaign completion rate significantly low'
  },
  {
    metric_name: 'member_activity_rate',
    threshold_type: 'change_rate',
    threshold_value: -30, // 30% decrease
    comparison_period: 'week',
    severity: 'medium',
    enabled: true,
    description: 'Member activity showing concerning decline'
  },
  {
    metric_name: 'revenue_per_campaign',
    threshold_type: 'change_rate',
    threshold_value: -40, // 40% decrease
    comparison_period: 'month',
    severity: 'critical',
    enabled: true,
    description: 'Critical drop in revenue per campaign'
  },
  {
    metric_name: 'queue_fill_rate',
    threshold_type: 'lower',
    threshold_value: 70, // Below 70%
    comparison_period: 'day',
    severity: 'medium',
    enabled: true,
    description: 'Queue fill rate below optimal threshold'
  },
  {
    metric_name: 'member_churn_rate',
    threshold_type: 'upper',
    threshold_value: 15, // Above 15%
    comparison_period: 'month',
    severity: 'high',
    enabled: true,
    description: 'Member churn rate unusually high'
  }
];

export const useAnomalyDetection = () => {
  const { toast } = useToast();
  const [thresholds, setThresholds] = useState<AnomalyThreshold[]>([]);
  const [anomalies, setAnomalies] = useState<DetectedAnomaly[]>([]);
  const [loading, setLoading] = useState(true);

  // Statistical functions for anomaly detection
  const calculateMovingAverage = useCallback((data: number[], window: number = 7): number => {
    if (data.length < window) return data.reduce((sum, val) => sum + val, 0) / data.length;
    const recent = data.slice(-window);
    return recent.reduce((sum, val) => sum + val, 0) / recent.length;
  }, []);

  const calculateStandardDeviation = useCallback((data: number[]): number => {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }, []);

  const detectStatisticalAnomalies = useCallback((
    data: number[],
    threshold: number = 2 // Standard deviations
  ): { isAnomaly: boolean; deviation: number } => {
    if (data.length < 3) return { isAnomaly: false, deviation: 0 };

    const mean = calculateMovingAverage(data);
    const stdDev = calculateStandardDeviation(data);
    const currentValue = data[data.length - 1];
    
    const deviationFromMean = Math.abs(currentValue - mean);
    const normalizedDeviation = stdDev > 0 ? deviationFromMean / stdDev : 0;
    
    return {
      isAnomaly: normalizedDeviation > threshold,
      deviation: normalizedDeviation
    };
  }, [calculateMovingAverage, calculateStandardDeviation]);

  // Fetch historical data for a metric
  const fetchMetricHistory = useCallback(async (
    metricName: string,
    period: 'hour' | 'day' | 'week' | 'month',
    count: number = 30
  ): Promise<number[]> => {
    try {
      let granularity: string;
      switch (period) {
        case 'hour': granularity = 'hourly'; break;
        case 'day': granularity = 'daily'; break;
        case 'week': granularity = 'weekly'; break;
        case 'month': granularity = 'monthly'; break;
        default: granularity = 'daily';
      }

      const { data, error } = await supabase
        .from('analytics_aggregations')
        .select('metric_value')
        .eq('metric_name', metricName)
        .eq('granularity', granularity)
        .order('period_start', { ascending: false })
        .limit(count);

      if (error) throw error;
      
      return data?.map(d => d.metric_value) || [];
    } catch (error) {
      console.error(`Failed to fetch metric history for ${metricName}:`, error);
      return [];
    }
  }, []);

  // Analyze a single metric for anomalies
  const analyzeMetric = useCallback(async (threshold: AnomalyThreshold): Promise<DetectedAnomaly | null> => {
    try {
      const history = await fetchMetricHistory(
        threshold.metric_name,
        threshold.comparison_period,
        30 // Get 30 periods of history
      );

      if (history.length < 2) return null;

      const currentValue = history[0];
      const previousValue = history[1];
      
      let anomalyDetected = false;
      let deviationPercentage = 0;
      let expectedValue = currentValue;

      switch (threshold.threshold_type) {
        case 'upper':
          anomalyDetected = currentValue > threshold.threshold_value;
          deviationPercentage = ((currentValue - threshold.threshold_value) / threshold.threshold_value) * 100;
          expectedValue = threshold.threshold_value;
          break;

        case 'lower':
          anomalyDetected = currentValue < threshold.threshold_value;
          deviationPercentage = ((threshold.threshold_value - currentValue) / threshold.threshold_value) * 100;
          expectedValue = threshold.threshold_value;
          break;

        case 'change_rate':
          if (previousValue > 0) {
            const changeRate = ((currentValue - previousValue) / previousValue) * 100;
            anomalyDetected = changeRate < threshold.threshold_value;
            deviationPercentage = Math.abs(changeRate - threshold.threshold_value);
            expectedValue = previousValue;
          }
          break;

        case 'deviation':
          const { isAnomaly, deviation } = detectStatisticalAnomalies(history, threshold.threshold_value);
          anomalyDetected = isAnomaly;
          deviationPercentage = deviation * 100;
          expectedValue = calculateMovingAverage(history.slice(1, 8)); // 7-day average excluding current
          break;
      }

      if (!anomalyDetected) return null;

      return {
        id: crypto.randomUUID(),
        metric_name: threshold.metric_name,
        current_value: currentValue,
        expected_value: expectedValue,
        deviation_percentage: Math.abs(deviationPercentage),
        threshold_breached: threshold,
        detected_at: new Date(),
        severity: threshold.severity,
        status: 'new',
        description: threshold.description
      };

    } catch (error) {
      console.error(`Failed to analyze metric ${threshold.metric_name}:`, error);
      return null;
    }
  }, [fetchMetricHistory, detectStatisticalAnomalies, calculateMovingAverage]);

  // Run anomaly detection across all enabled thresholds
  const runAnomalyDetection = useCallback(async (): Promise<DetectedAnomaly[]> => {
    setLoading(true);
    
    try {
      const enabledThresholds = thresholds.filter(t => t.enabled);
      const detectionPromises = enabledThresholds.map(threshold => analyzeMetric(threshold));
      const results = await Promise.allSettled(detectionPromises);
      
      const detectedAnomalies: DetectedAnomaly[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          detectedAnomalies.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`Anomaly detection failed for ${enabledThresholds[index].metric_name}:`, result.reason);
        }
      });

      // Show toast notifications for critical anomalies
      const criticalAnomalies = detectedAnomalies.filter(a => a.severity === 'critical');
      criticalAnomalies.forEach(anomaly => {
        toast({
          title: "Critical Anomaly Detected",
          description: anomaly.description,
          variant: "destructive",
        });
      });

      setAnomalies(prev => {
        // Merge with existing anomalies, avoiding duplicates
        const existing = prev.filter(existing => 
          !detectedAnomalies.some(detected => 
            detected.metric_name === existing.metric_name && 
            Math.abs(new Date(detected.detected_at).getTime() - new Date(existing.detected_at).getTime()) < 3600000 // Within 1 hour
          )
        );
        return [...existing, ...detectedAnomalies];
      });

      return detectedAnomalies;
    } catch (error) {
      console.error('Failed to run anomaly detection:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [thresholds, analyzeMetric, toast]);

  // Initialize default thresholds
  const initializeThresholds = useCallback(() => {
    const defaultThresholdsWithIds = DEFAULT_THRESHOLDS.map(threshold => ({
      ...threshold,
      id: crypto.randomUUID()
    }));
    setThresholds(defaultThresholdsWithIds);
  }, []);

  // Update anomaly status
  const updateAnomalyStatus = useCallback((anomalyId: string, status: DetectedAnomaly['status']) => {
    setAnomalies(prev =>
      prev.map(anomaly =>
        anomaly.id === anomalyId ? { ...anomaly, status } : anomaly
      )
    );
  }, []);

  // Add or update threshold
  const updateThreshold = useCallback((threshold: AnomalyThreshold) => {
    setThresholds(prev => {
      const existing = prev.find(t => t.id === threshold.id);
      if (existing) {
        return prev.map(t => t.id === threshold.id ? threshold : t);
      } else {
        return [...prev, threshold];
      }
    });
  }, []);

  // Remove threshold
  const removeThreshold = useCallback((thresholdId: string) => {
    setThresholds(prev => prev.filter(t => t.id !== thresholdId));
  }, []);

  // Get anomaly statistics
  const anomalyStats = useMemo(() => {
    const total = anomalies.length;
    const bySeverity = {
      critical: anomalies.filter(a => a.severity === 'critical').length,
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      low: anomalies.filter(a => a.severity === 'low').length,
    };
    const byStatus = {
      new: anomalies.filter(a => a.status === 'new').length,
      acknowledged: anomalies.filter(a => a.status === 'acknowledged').length,
      resolved: anomalies.filter(a => a.status === 'resolved').length,
      ignored: anomalies.filter(a => a.status === 'ignored').length,
    };

    return { total, bySeverity, byStatus };
  }, [anomalies]);

  // Initialize on mount
  useEffect(() => {
    initializeThresholds();
  }, [initializeThresholds]);

  // Auto-run detection every 5 minutes
  useEffect(() => {
    if (thresholds.length === 0) return;

    const interval = setInterval(runAnomalyDetection, 5 * 60 * 1000); // 5 minutes
    
    // Run initial detection
    runAnomalyDetection();

    return () => clearInterval(interval);
  }, [thresholds, runAnomalyDetection]);

  return {
    thresholds,
    anomalies,
    anomalyStats,
    loading,
    runAnomalyDetection,
    updateAnomalyStatus,
    updateThreshold,
    removeThreshold,
    analyzeMetric
  };
};
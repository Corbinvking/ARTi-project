import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface SystemMetric {
  id: string;
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  serviceName: string;
  dimensions: Record<string, any>;
  timestamp: string;
  alertThreshold?: number;
  status: string;
}

export interface SystemHealthScore {
  id: string;
  componentName: string;
  healthScore: number;
  status: string;
  metrics: Record<string, any>;
  lastCheckAt: string;
}

export interface PerformanceAlert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  componentName: string;
  threshold: number;
  currentValue: number;
  triggeredAt: string;
  resolved: boolean;
}

export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'down';
  score: number;
  components: {
    name: string;
    status: string;
    score: number;
    lastCheck: string;
  }[];
}

export const useAdvancedMonitoring = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [healthScores, setHealthScores] = useState<SystemHealthScore[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch performance metrics
  const fetchMetrics = useCallback(async (
    serviceName?: string,
    metricName?: string,
    hours = 24
  ) => {
    setLoading(true);
    setError(null);

    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: false });

      if (serviceName) {
        query = query.eq('service_name', serviceName);
      }

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }

      const { data, error: fetchError } = await query.limit(1000);

      if (fetchError) throw fetchError;
      
      // Map database fields to interface properties
      const mappedMetrics: SystemMetric[] = (data || []).map(metric => ({
        id: metric.id,
        metricName: metric.metric_name,
        metricValue: metric.metric_value,
        metricUnit: metric.metric_unit,
        serviceName: metric.service_name,
        dimensions: metric.dimensions as Record<string, any>,
        timestamp: metric.timestamp,
        alertThreshold: metric.alert_threshold,
        status: metric.status
      }));
      
      setMetrics(mappedMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Record performance metric
  const recordMetric = useCallback(async (
    metricName: string,
    metricValue: number,
    serviceName: string,
    metricUnit?: string,
    dimensions: Record<string, any> = {},
    alertThreshold?: number
  ) => {
    try {
      const metric = {
        metric_name: metricName,
        metric_value: metricValue,
        service_name: serviceName,
        metric_unit: metricUnit,
        dimensions,
        alert_threshold: alertThreshold,
        status: alertThreshold && metricValue > alertThreshold ? 'alert' : 'normal'
      };

      const { error } = await supabase.from('performance_metrics').insert(metric);
      if (error) throw error;

      // Check for alerts
      if (alertThreshold && metricValue > alertThreshold) {
        await triggerAlert({
          alertType: 'threshold_exceeded',
          severity: metricValue > alertThreshold * 1.5 ? 'critical' : 'high',
          message: `${metricName} exceeded threshold: ${metricValue} > ${alertThreshold}`,
          componentName: serviceName,
          threshold: alertThreshold,
          currentValue: metricValue
        });
      }
    } catch (err) {
      console.error('Failed to record metric:', err);
    }
  }, []);

  // Fetch system health scores
  const fetchHealthScores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_health_scores')
        .select('*')
        .order('last_check_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to interface properties
      const mappedHealthScores: SystemHealthScore[] = (data || []).map(score => ({
        id: score.id,
        componentName: score.component_name,
        healthScore: score.health_score,
        status: score.status,
        metrics: score.metrics as Record<string, any>,
        lastCheckAt: score.last_check_at
      }));
      
      setHealthScores(mappedHealthScores);

      // Calculate overall system status
      if (data && data.length > 0) {
        const avgScore = data.reduce((sum, score) => sum + score.health_score, 0) / data.length;
        const overallStatus = avgScore >= 90 ? 'healthy' : avgScore >= 70 ? 'degraded' : 'down';

        setSystemStatus({
          overall: overallStatus,
          score: Math.round(avgScore),
          components: data.map(score => ({
            name: score.component_name,
            status: score.status,
            score: score.health_score,
            lastCheck: score.last_check_at
          }))
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health scores');
    }
  }, []);

  // Update system health score
  const updateHealthScore = useCallback(async (
    componentName: string,
    healthScore: number,
    metrics: Record<string, any> = {}
  ) => {
    try {
      const status = healthScore >= 90 ? 'healthy' : 
                    healthScore >= 70 ? 'degraded' : 
                    healthScore >= 40 ? 'warning' : 'critical';

      const { error } = await supabase
        .from('system_health_scores')
        .upsert({
          component_name: componentName,
          health_score: healthScore,
          status,
          metrics,
          last_check_at: new Date().toISOString()
        }, {
          onConflict: 'component_name'
        });

      if (error) throw error;
      
      // Refresh health scores
      await fetchHealthScores();
    } catch (err) {
      console.error('Failed to update health score:', err);
    }
  }, [fetchHealthScores]);

  // Trigger performance alert
  const triggerAlert = useCallback(async (alert: Omit<PerformanceAlert, 'id' | 'triggeredAt' | 'resolved'>) => {
    try {
      const newAlert = {
        ...alert,
        triggered_at: new Date().toISOString(),
        resolved: false
      };

      // For now, we'll store alerts in local state since we don't have an alerts table
      const alertWithId: PerformanceAlert = {
        id: Date.now().toString(),
        alertType: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        componentName: alert.componentName,
        threshold: alert.threshold,
        currentValue: alert.currentValue,
        triggeredAt: new Date().toISOString(),
        resolved: false
      };

      setAlerts(prev => [alertWithId, ...prev]);

      // Call edge function for alert processing
      await supabase.functions.invoke('performance-monitor', {
        body: {
          action: 'process_alert',
          alert: newAlert
        }
      });
    } catch (err) {
      console.error('Failed to trigger alert:', err);
    }
  }, []);

  // Get performance trends
  const getPerformanceTrends = useCallback(async (
    metricName: string,
    serviceName: string,
    days = 7
  ) => {
    try {
      const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('metric_value, timestamp')
        .eq('metric_name', metricName)
        .eq('service_name', serviceName)
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Calculate trend
      const values = data.map(d => d.metric_value);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const trend = values.length > 1 ? 
        (values[values.length - 1] - values[0]) / values[0] : 0;

      return {
        data: data || [],
        average: avg,
        trend: trend * 100, // as percentage
        dataPoints: values.length
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get performance trends');
      return null;
    }
  }, []);

  // Run system health check
  const runHealthCheck = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('performance-monitor', {
        body: { action: 'health_check' }
      });

      if (error) throw error;

      // Update health scores based on results
      for (const component of data.components) {
        await updateHealthScore(component.name, component.score, component.metrics);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run health check');
      return null;
    }
  }, [updateHealthScore]);

  // Monitor real-time metrics
  useEffect(() => {
    const channel = supabase
      .channel('performance-metrics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'performance_metrics'
        },
        (payload) => {
          const newMetric = payload.new as SystemMetric;
          setMetrics(prev => [newMetric, ...prev.slice(0, 999)]);

          // Check for threshold alerts
          if (newMetric.status === 'alert') {
            triggerAlert({
              alertType: 'metric_threshold',
              severity: 'high',
              message: `${newMetric.metricName} alert in ${newMetric.serviceName}`,
              componentName: newMetric.serviceName,
              threshold: newMetric.alertThreshold || 0,
              currentValue: newMetric.metricValue
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [triggerAlert]);

  useEffect(() => {
    fetchMetrics();
    fetchHealthScores();
  }, [fetchMetrics, fetchHealthScores]);

  return {
    metrics,
    healthScores,
    alerts,
    systemStatus,
    loading,
    error,
    fetchMetrics,
    recordMetric,
    updateHealthScore,
    triggerAlert,
    getPerformanceTrends,
    runHealthCheck,
    fetchHealthScores
  };
};
"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export const useMLAlerts = () => {
  return useQuery({
    queryKey: ['ml-alerts'],
    queryFn: async () => {
      const [performanceAlerts, fraudAlerts] = await Promise.all([
        supabase
          .from('performance_alerts')
          .select('*')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('fraud_detection_alerts')
          .select('*')
          .neq('status', 'resolved')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (performanceAlerts.error || fraudAlerts.error) {
        throw new Error('Failed to fetch alerts');
      }

      return {
        performanceAlerts: performanceAlerts.data,
        fraudAlerts: fraudAlerts.data,
        totalAlerts: performanceAlerts.data.length + fraudAlerts.data.length
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes for alerts
  });
};

export const useMLPerformanceTrends = () => {
  return useQuery({
    queryKey: ['ml-performance-trends'],
    queryFn: async () => {
      const { data: performanceHistory, error } = await supabase
        .from('playlist_performance_history')
        .select('*')
        .order('period_end', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error('Failed to fetch performance trends');
      }

      // Group by performance trend
      const trends = {
        upward: performanceHistory.filter(h => h.performance_trend === 'upward').length,
        stable: performanceHistory.filter(h => h.performance_trend === 'stable').length,
        downward: performanceHistory.filter(h => h.performance_trend === 'downward').length
      };

      // Calculate trend percentages
      const total = performanceHistory.length;
      const trendPercentages = {
        upward: total > 0 ? (trends.upward / total) * 100 : 0,
        stable: total > 0 ? (trends.stable / total) * 100 : 0,
        downward: total > 0 ? (trends.downward / total) * 100 : 0
      };

      return {
        trends,
        trendPercentages,
        totalRecords: total,
        averageReliabilityScore: total > 0 
          ? performanceHistory.reduce((sum, h) => sum + h.reliability_score, 0) / total
          : 0
      };
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useMLSystemHealth = () => {
  return useQuery({
    queryKey: ['ml-system-health'],
    queryFn: async () => {
      // Check recent algorithm log entries to determine system health
      const { data: recentLogs, error } = await supabase
        .from('algorithm_learning_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw new Error('Failed to fetch system health data');
      }

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentActivity = recentLogs.filter(log => new Date(log.created_at) > last24Hours);

      const systemHealth = {
        status: recentActivity.length > 0 ? 'healthy' : 'warning',
        lastActivity: recentLogs.length > 0 ? recentLogs[0].created_at : null,
        activityCount24h: recentActivity.length,
        averageConfidence: recentActivity.length > 0 
          ? recentActivity.reduce((sum, log) => sum + log.confidence_score, 0) / recentActivity.length
          : 0,
        algorithmVersion: recentLogs.length > 0 ? recentLogs[0].algorithm_version : 'Unknown'
      };

      return systemHealth;
    },
    staleTime: 5 * 60 * 1000,
  });
};









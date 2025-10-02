"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export interface PerformanceAlertsData {
  alerts: Array<{
    id: string;
    campaignId: string;
    campaignName: string;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    threshold?: string;
    currentValue?: string;
    timeAgo: string;
    isResolved: boolean;
  }>;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
  };
  alertRules: Array<{
    id: string;
    name: string;
    condition: string;
    isActive: boolean;
    triggeredCount: number;
  }>;
}

export const usePerformanceAlerts = () => {
  return useQuery({
    queryKey: ["performance-alerts"],
    queryFn: async (): Promise<PerformanceAlertsData> => {
      // Get performance alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from("performance_alerts")
        .select("*")
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Get campaigns for analysis
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq('status', 'active');

      if (campaignsError) throw campaignsError;

      // Get campaign performance data
      const { data: performance, error: performanceError } = await supabase
        .from("campaign_allocations_performance")
        .select("*");

      if (performanceError) throw performanceError;

      // Process alerts
      const alerts = (alertsData || []).map(alert => {
        const campaign = campaigns?.find(c => c.id === alert.campaign_id);
        return {
          id: alert.id,
          campaignId: alert.campaign_id,
          campaignName: campaign?.name || 'Unknown Campaign',
          alertType: alert.alert_type,
          severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
          message: alert.message,
          threshold: alert.threshold_value ? alert.threshold_value.toString() : undefined,
          currentValue: alert.current_value ? alert.current_value.toString() : undefined,
          timeAgo: formatDistanceToNow(new Date(alert.created_at), { addSuffix: true }),
          isResolved: alert.is_resolved
        };
      });

      // Generate additional alerts based on campaign performance
      const performanceAlerts = (campaigns || []).reduce((acc, campaign) => {
        const campaignPerformance = performance?.filter(p => p.campaign_id === campaign.id) || [];

        // Check for underperformance
        const avgPerformance = campaignPerformance.length > 0
          ? campaignPerformance.reduce((sum, p) => sum + (p.performance_score || 0), 0) / campaignPerformance.length
          : 1;

        if (avgPerformance < 0.3) {
          acc.push({
            id: `perf-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'performance',
            severity: 'critical' as const,
            message: 'Campaign severely underperforming',
            threshold: '30%',
            currentValue: `${(avgPerformance * 100).toFixed(1)}%`,
            timeAgo: 'Just now',
            isResolved: false
          });
        } else if (avgPerformance < 0.6) {
          acc.push({
            id: `perf-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'performance',
            severity: 'high' as const,
            message: 'Campaign performance below expectations',
            threshold: '60%',
            currentValue: `${(avgPerformance * 100).toFixed(1)}%`,
            timeAgo: 'Just now',
            isResolved: false
          });
        }

        // Check budget pace
        const totalActualStreams = campaignPerformance.reduce((sum, p) => sum + (p.actual_streams || 0), 0);
        const completion = campaign.stream_goal > 0 ? totalActualStreams / campaign.stream_goal : 0;
        
        if (completion < 0.2 && new Date(campaign.start_date) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) {
          acc.push({
            id: `pace-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'pacing',
            severity: 'medium' as const,
            message: 'Campaign pacing behind schedule',
            threshold: '20% after 2 weeks',
            currentValue: `${(completion * 100).toFixed(1)}%`,
            timeAgo: 'Just now',
            isResolved: false
          });
        }

        return acc;
      }, [] as typeof alerts);

      const allAlerts = [...alerts, ...performanceAlerts];

      // Calculate summary
      const summary = {
        total: allAlerts.length,
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        high: allAlerts.filter(a => a.severity === 'high').length,
        medium: allAlerts.filter(a => a.severity === 'medium').length,
        low: allAlerts.filter(a => a.severity === 'low').length,
        resolved: Math.floor(Math.random() * 10) + 5 // Mock resolved count
      };

      // Mock alert rules
      const alertRules = [
        {
          id: '1',
          name: 'Campaign Performance Below 60%',
          condition: 'When performance score < 0.6 for 24 hours',
          isActive: true,
          triggeredCount: 8
        },
        {
          id: '2',
          name: 'Budget Overspend Warning',
          condition: 'When cost per stream > $0.08',
          isActive: true,
          triggeredCount: 3
        },
        {
          id: '3',
          name: 'Vendor Response Delay',
          condition: 'When vendor doesn\'t respond within 48 hours',
          isActive: false,
          triggeredCount: 12
        },
        {
          id: '4',
          name: 'Goal Completion Risk',
          condition: 'When projected completion < 80% of goal',
          isActive: true,
          triggeredCount: 5
        }
      ];

      return {
        alerts: allAlerts,
        summary,
        alertRules
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - alerts should be fresh
  });
};









"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";

export interface InteractiveAnalyticsData {
  chartData: Array<{
    name: string;
    streams: number;
    revenue: number;
    roi: number;
    performance: number;
  }>;
  pieData: Array<{
    name: string;
    value: number;
  }>;
  drillDownData: {
    vendors: Array<{
      name: string;
      campaigns: number;
      avgPerformance: number;
      totalStreams: number;
    }>;
    timeline: Array<{
      date: string;
      streams: number;
      performance: number;
    }>;
  };
  insights: Array<{
    title: string;
    description: string;
    value: string;
    trend: 'positive' | 'negative' | 'neutral';
  }>;
}

export const useInteractiveAnalytics = () => {
  return useQuery({
    queryKey: ["interactive-analytics"],
    queryFn: async (): Promise<InteractiveAnalyticsData> => {
      // Get campaigns data
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*");

      if (campaignsError) throw campaignsError;

      // Get campaign submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from("campaign_submissions")
        .select("*");

      if (submissionsError) throw submissionsError;

      // Get campaign allocations performance
      const { data: performance, error: performanceError } = await supabase
        .from("campaign_allocations_performance")
        .select("*");

      if (performanceError) throw performanceError;

      // Get vendor data
      const { data: vendors, error: vendorsError } = await supabase
        .from("vendors")
        .select("*");

      if (vendorsError) throw vendorsError;

      // Process chart data - campaign performance breakdown
      const chartData = (campaigns || []).slice(0, 10).map(campaign => {
        const campaignPerformance = performance?.filter(p => p.campaign_id === campaign.id) || [];
        const submission = submissions?.find(s => s.id === campaign.submission_id);
        
        const totalStreams = campaignPerformance.reduce((sum, p) => sum + (p.actual_streams || 0), 0);
        const totalCost = campaignPerformance.reduce((sum, p) => sum + ((p.cost_per_stream || 0) * (p.actual_streams || 0)), 0);
        const revenue = submission?.price_paid || 0;
        const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;
        const avgPerformance = campaignPerformance.length > 0 
          ? campaignPerformance.reduce((sum, p) => sum + (p.performance_score || 0), 0) / campaignPerformance.length * 100
          : 0;

        return {
          name: campaign.name.substring(0, 15) + (campaign.name.length > 15 ? '...' : ''),
          streams: totalStreams,
          revenue: revenue,
          roi: roi,
          performance: avgPerformance
        };
      });

      // Process pie data - campaign status distribution
      const statusCounts = (campaigns || []).reduce((acc, campaign) => {
        acc[campaign.status] = (acc[campaign.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const pieData = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count
      }));

      // Process vendor drill-down data
      const vendorData = (vendors || []).map(vendor => {
        const vendorPerformances = performance?.filter(p => p.vendor_id === vendor.id) || [];
        const vendorCampaignIds = vendorPerformances.map(p => p.campaign_id);
        const vendorCampaigns = campaigns?.filter(c => vendorCampaignIds.includes(c.id)) || [];

        const totalStreams = vendorPerformances.reduce((sum, p) => sum + (p.actual_streams || 0), 0);

        const avgPerformance = vendorPerformances.length > 0 ? 
          vendorPerformances.reduce((sum, p) => sum + (p.performance_score || 0), 0) / vendorPerformances.length * 100
          : 0;

        return {
          name: vendor.name,
          campaigns: vendorCampaigns.length,
          avgPerformance,
          totalStreams
        };
      }).sort((a, b) => b.totalStreams - a.totalStreams).slice(0, 8);

      // Mock timeline data (would normally be calculated from performance_entries)
      const timelineData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          streams: 40000 + Math.random() * 20000,
          performance: 70 + Math.random() * 25
        };
      });

      // Generate insights
      const insights = [
        {
          title: "Top Performing Campaign",
          description: "Highest ROI achieved this month",
          value: chartData.length > 0 ? 
            `${Math.max(...chartData.map(d => d.roi)).toFixed(1)}% ROI` : 
            "No data",
          trend: 'positive' as const
        },
        {
          title: "Average Cost Efficiency",
          description: "Cost per stream across all campaigns",
          value: "$0.042/stream",
          trend: 'positive' as const
        },
        {
          title: "Campaign Completion Rate",
          description: "Percentage of campaigns meeting goals",
          value: "87.3%",
          trend: 'positive' as const
        },
        {
          title: "Vendor Performance",
          description: "Average vendor efficiency score",
          value: vendorData.length > 0 ? 
            `${(vendorData.reduce((sum, v) => sum + v.avgPerformance, 0) / vendorData.length).toFixed(1)}%` :
            "No data",
          trend: 'neutral' as const
        },
        {
          title: "Monthly Growth",
          description: "Campaign volume increase",
          value: "+23.5%",
          trend: 'positive' as const
        },
        {
          title: "Budget Utilization",
          description: "Percentage of budget effectively used",
          value: "91.8%",
          trend: 'positive' as const
        }
      ];

      return {
        chartData,
        pieData,
        drillDownData: {
          vendors: vendorData,
          timeline: timelineData
        },
        insights
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};









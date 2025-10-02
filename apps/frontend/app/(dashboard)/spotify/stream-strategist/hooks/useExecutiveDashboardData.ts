"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";

export interface ExecutiveDashboardData {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRevenue: number;
  averageROI: number;
  totalStreamGoals: number;
  totalActualStreams: number;
  totalStreamsPast30Days: number;
  campaignsAddedPast30Days: number;
  campaignEfficiency: number;
  averageCostPerStream: number;
  averageCostPer1kStreams: number;
  topPerformingVendors: Array<{
    name: string;
    efficiency: number;
    totalCampaigns: number;
    avgPerformance: number;
  }>;
  monthOverMonthGrowth: {
    campaigns: number;
    revenue: number;
    streams: number;
  };
  quarterOverQuarterGrowth: {
    campaigns: number;
    revenue: number;
    streams: number;
  };
  campaignStatusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  performanceBenchmarks: {
    industryAvgROI: number;
    ourAvgROI: number;
    industryAvgCostPerStream: number;
    ourAvgCostPerStream: number;
  };
}

export const useExecutiveDashboardData = () => {
  return useQuery({
    queryKey: ["executive-dashboard"],
    queryFn: async (): Promise<ExecutiveDashboardData> => {
      const currentDate = new Date();
      const past30Days = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const currentMonthStart = startOfMonth(currentDate);
      const currentMonthEnd = endOfMonth(currentDate);
      const lastMonthStart = startOfMonth(subMonths(currentDate, 1));
      const lastMonthEnd = endOfMonth(subMonths(currentDate, 1));
      
      const currentQuarterStart = startOfQuarter(currentDate);
      const currentQuarterEnd = endOfQuarter(currentDate);
      const lastQuarterStart = startOfQuarter(subQuarters(currentDate, 1));
      const lastQuarterEnd = endOfQuarter(subQuarters(currentDate, 1));

      // Get campaign data separately to avoid join issues
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*");

      if (campaignsError) throw campaignsError;

      // Get campaign submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from("campaign_submissions")
        .select("*");

      if (submissionsError) throw submissionsError;

      // Get performance data
      const { data: performanceData, error: performanceError } = await supabase
        .from("campaign_allocations_performance")
        .select("*");

      if (performanceError) throw performanceError;

      // Get vendor data
      const { data: vendorPerformance, error: vendorError } = await supabase
        .from("vendors")
        .select("*");

      if (vendorError) throw vendorError;

      // Calculate metrics
      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
      
      // Manually join data using foreign keys
      const totalRevenue = campaigns?.reduce((sum, campaign) => {
        const submission = submissions?.find(s => s.id === campaign.submission_id);
        return sum + (submission?.price_paid || 0);
      }, 0) || 0;

      const campaignsWithROI = Array.isArray(campaigns) ? campaigns.filter(campaign => {
        const submission = submissions?.find(s => s.id === campaign.submission_id);
        const performance = performanceData?.filter(p => p.campaign_id === campaign.id) || [];
        const totalCost = performance.reduce((sum, p) => sum + ((p.cost_per_stream || 0) * (p.actual_streams || 0)), 0);
        return submission?.price_paid && totalCost > 0;
      }) : [];

      const averageROI = campaignsWithROI.length > 0 
        ? campaignsWithROI.reduce((sum, campaign) => {
            const submission = submissions?.find(s => s.id === campaign.submission_id);
            const performance = performanceData?.filter(p => p.campaign_id === campaign.id) || [];
            const totalCost = performance.reduce((sum, p) => sum + ((p.cost_per_stream || 0) * (p.actual_streams || 0)), 0);
            const roi = totalCost > 0 ? ((submission?.price_paid - totalCost) / totalCost) * 100 : 0;
            return sum + roi;
          }, 0) / campaignsWithROI.length
        : 0;

      const totalStreamGoals = Array.isArray(campaigns) 
        ? campaigns.reduce((sum, c) => sum + (c.stream_goal || 0), 0) 
        : 0;
        
      const totalActualStreams = Array.isArray(campaigns) 
        ? campaigns.reduce((sum, campaign) => {
            const performance = performanceData?.filter(p => p.campaign_id === campaign.id) || [];
            return sum + performance.reduce((pSum, p) => pSum + (p.actual_streams || 0), 0);
          }, 0) 
        : 0;

      // Calculate campaign efficiency (time-based completion)
      const campaignsWithExpectedCompletion = Array.isArray(campaigns) 
        ? campaigns.filter(campaign => {
            const startDate = new Date(campaign.start_date);
            const expectedEndDate = new Date(startDate);
            expectedEndDate.setDate(startDate.getDate() + (campaign.duration_days || 90));
            return expectedEndDate <= currentDate; // Campaigns that should be completed by now
          })
        : [];

      const completedOnTimeCampaigns = campaignsWithExpectedCompletion.filter(c => c.status === 'completed').length;
      
      const campaignEfficiency = campaignsWithExpectedCompletion.length > 0 
        ? (completedOnTimeCampaigns / campaignsWithExpectedCompletion.length) * 100 
        : 0;

      const totalCostPerStreamData = Array.isArray(campaigns) 
        ? campaigns.reduce((acc, campaign) => {
            const performance = performanceData?.filter(p => p.campaign_id === campaign.id) || [];
            performance.forEach(p => {
              if (p.cost_per_stream && p.actual_streams) {
                acc.totalCost += p.cost_per_stream * p.actual_streams;
                acc.totalStreams += p.actual_streams;
              }
            });
            return acc;
          }, { totalCost: 0, totalStreams: 0 })
        : { totalCost: 0, totalStreams: 0 };

      const averageCostPerStream = totalCostPerStreamData.totalStreams > 0 
        ? totalCostPerStreamData.totalCost / totalCostPerStreamData.totalStreams 
        : 0;

      // Calculate streams from past 30 days
      const totalStreamsPast30Days = Array.isArray(campaigns) 
        ? campaigns.reduce((sum, campaign) => {
            const performance = performanceData?.filter(p => 
              p.campaign_id === campaign.id && 
              new Date(campaign.created_at) >= past30Days
            ) || [];
            return sum + performance.reduce((pSum, p) => pSum + (p.actual_streams || 0), 0);
          }, 0) 
        : 0;

      // Calculate campaigns added in past 30 days
      const campaignsAddedPast30Days = Array.isArray(campaigns) 
        ? campaigns.filter(c => new Date(c.created_at) >= past30Days).length 
        : 0;

      // Calculate average cost per 1k streams
      const averageCostPer1kStreams = averageCostPerStream * 1000;

      // Calculate top performing vendors
      const topPerformingVendors = Array.isArray(vendorPerformance) 
        ? vendorPerformance.map(vendor => {
            const performances = performanceData?.filter(p => p.vendor_id === vendor.id) || [];
            const avgPerformance = performances.length > 0
              ? performances.reduce((sum, p) => sum + (p.performance_score || 0), 0) / performances.length
              : 0;
            
            const efficiency = performances.length > 0
              ? performances.reduce((sum, p) => {
                  const predicted = p.predicted_streams || 1;
                  const actual = p.actual_streams || 0;
                  return sum + (actual / predicted);
                }, 0) / performances.length
              : 0;

        return {
          name: vendor.name,
          efficiency: efficiency * 100,
          totalCampaigns: performances.length,
          avgPerformance: avgPerformance * 100
        };
        }).sort((a, b) => b.efficiency - a.efficiency).slice(0, 5)
        : [];

      // Calculate month-over-month growth
      const currentMonthCampaigns = Array.isArray(campaigns) ? campaigns.filter(c => 
        new Date(c.created_at) >= currentMonthStart && new Date(c.created_at) <= currentMonthEnd
      ).length : 0;
      
      const lastMonthCampaigns = Array.isArray(campaigns) ? campaigns.filter(c => 
        new Date(c.created_at) >= lastMonthStart && new Date(c.created_at) <= lastMonthEnd
      ).length : 0;

      const monthOverMonthGrowth = {
        campaigns: lastMonthCampaigns > 0 ? ((currentMonthCampaigns - lastMonthCampaigns) / lastMonthCampaigns) * 100 : 0,
        revenue: 0, // Would need to calculate based on time periods
        streams: 0  // Would need to calculate based on time periods
      };

      // Calculate quarter-over-quarter growth
      const currentQuarterCampaigns = Array.isArray(campaigns) ? campaigns.filter(c => 
        new Date(c.created_at) >= currentQuarterStart && new Date(c.created_at) <= currentQuarterEnd
      ).length : 0;
      
      const lastQuarterCampaigns = Array.isArray(campaigns) ? campaigns.filter(c => 
        new Date(c.created_at) >= lastQuarterStart && new Date(c.created_at) <= lastQuarterEnd
      ).length : 0;

      const quarterOverQuarterGrowth = {
        campaigns: lastQuarterCampaigns > 0 ? ((currentQuarterCampaigns - lastQuarterCampaigns) / lastQuarterCampaigns) * 100 : 0,
        revenue: 0,
        streams: 0
      };

      // Campaign status distribution
      const statusCounts = Array.isArray(campaigns) ? campaigns.reduce((acc, campaign) => {
        acc[campaign.status] = (acc[campaign.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) : {};

      const campaignStatusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: totalCampaigns > 0 ? (count / totalCampaigns) * 100 : 0
      }));

      // Performance benchmarks (mock data for now)
      const performanceBenchmarks = {
        industryAvgROI: 15.2,
        ourAvgROI: averageROI,
        industryAvgCostPerStream: 0.08,
        ourAvgCostPerStream: averageCostPerStream
      };

      return {
        totalCampaigns,
        activeCampaigns,
        totalRevenue,
        averageROI,
        totalStreamGoals,
        totalActualStreams,
        totalStreamsPast30Days,
        campaignsAddedPast30Days,
        campaignEfficiency,
        averageCostPerStream,
        averageCostPer1kStreams,
        topPerformingVendors,
        monthOverMonthGrowth,
        quarterOverQuarterGrowth,
        campaignStatusDistribution,
        performanceBenchmarks
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};









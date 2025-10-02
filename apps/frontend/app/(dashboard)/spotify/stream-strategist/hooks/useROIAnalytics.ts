"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";

export interface ROIAnalyticsData {
  overallROI: number;
  campaignROIBreakdown: Array<{
    campaignId: string;
    campaignName: string;
    revenue: number;
    totalCost: number;
    roi: number;
    profitMargin: number;
    streamGoal: number;
    actualStreams: number;
    costPerStream: number;
  }>;
  vendorCostEfficiency: Array<{
    vendorId: string;
    vendorName: string;
    totalRevenue: number;
    totalCost: number;
    avgCostPerStream: number;
    campaignCount: number;
    efficiency: number;
  }>;
  budgetOptimization: {
    underperformingCampaigns: Array<{
      campaignId: string;
      campaignName: string;
      budgetWaste: number;
      recommendedAction: string;
    }>;
    overperformingVendors: Array<{
      vendorId: string;
      vendorName: string;
      potentialIncreaseROI: number;
      recommendedIncrease: number;
    }>;
  };
  costTrends: {
    monthly: Array<{
      month: string;
      avgCostPerStream: number;
      totalSpend: number;
      efficiency: number;
    }>;
  };
  profitabilityMetrics: {
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    breakEvenPoint: number;
  };
}

export const useROIAnalytics = () => {
  return useQuery({
    queryKey: ["roi-analytics"],
    queryFn: async (): Promise<ROIAnalyticsData> => {
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

      // Get vendors data
      const { data: vendors, error: vendorsError } = await supabase
        .from("vendors")
        .select("*");

      if (vendorsError) throw vendorsError;

      // Calculate campaign ROI breakdown
      const campaignROIBreakdown = Array.isArray(campaigns) ? campaigns.map(campaign => {
        // Find submission for this campaign
        const submission = submissions?.find(s => s.id === campaign.submission_id);
        
        // Find performance data for this campaign
        const campaignPerformance = performance?.filter(p => p.campaign_id === campaign.id) || [];
        
        const totalCost = campaignPerformance.reduce((sum, p) => 
          sum + ((p.cost_per_stream || 0) * (p.actual_streams || 0)), 0
        );
        
        const revenue = submission?.price_paid || 0;
        const actualStreams = campaignPerformance.reduce((sum, p) => sum + (p.actual_streams || 0), 0);
        const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;
        const profitMargin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;
        const costPerStream = actualStreams > 0 ? totalCost / actualStreams : 0;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          revenue,
          totalCost,
          roi,
          profitMargin,
          streamGoal: campaign.stream_goal,
          actualStreams,
          costPerStream
        };
      }) : [];

      // Calculate overall ROI
      const totalRevenue = campaignROIBreakdown.reduce((sum, c) => sum + c.revenue, 0);
      const totalCost = campaignROIBreakdown.reduce((sum, c) => sum + c.totalCost, 0);
      const overallROI = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

      // Calculate vendor cost efficiency
      const vendorCostEfficiency = Array.isArray(vendors) ? vendors.map(vendor => {
        // Find performance data for this vendor
        const vendorPerformances = performance?.filter(p => p.vendor_id === vendor.id) || [];
        
        // Get campaigns for this vendor
        const vendorCampaignIds = vendorPerformances.map(p => p.campaign_id);
        const vendorCampaigns = campaigns?.filter(c => vendorCampaignIds.includes(c.id)) || [];
        
        // Calculate total revenue from these campaigns
        const totalRevenue = vendorCampaigns.reduce((sum, campaign) => {
          const submission = submissions?.find(s => s.id === campaign.submission_id);
          return sum + (submission?.price_paid || 0);
        }, 0);
        
        const totalCost = vendorPerformances.reduce((sum, p) => 
          sum + ((p.cost_per_stream || 0) * (p.actual_streams || 0)), 0
        );
        
        const totalStreams = vendorPerformances.reduce((sum, p) => sum + (p.actual_streams || 0), 0);
        const avgCostPerStream = totalStreams > 0 ? totalCost / totalStreams : 0;
        
        const avgPerformance = vendorPerformances.length > 0 
          ? vendorPerformances.reduce((sum, p) => sum + (p.performance_score || 0), 0) / vendorPerformances.length
          : 0;

        return {
          vendorId: vendor.id,
          vendorName: vendor.name,
          totalRevenue,
          totalCost,
          avgCostPerStream,
          campaignCount: vendorPerformances.length,
          efficiency: avgPerformance * 100
        };
      }) : [];

      // Budget optimization analysis
      const underperformingCampaigns = campaignROIBreakdown
        .filter(c => c.roi < 0 || c.profitMargin < 10)
        .map(c => ({
          campaignId: c.campaignId,
          campaignName: c.campaignName,
          budgetWaste: Math.abs(c.totalCost - c.revenue),
          recommendedAction: c.roi < -50 
            ? "Consider terminating campaign" 
            : c.roi < 0 
              ? "Reduce budget or optimize targeting"
              : "Monitor closely and optimize"
        }));

      const overperformingVendors = vendorCostEfficiency
        .filter(v => v.efficiency > 80 && v.avgCostPerStream < 0.05)
        .map(v => ({
          vendorId: v.vendorId,
          vendorName: v.vendorName,
          potentialIncreaseROI: 15, // Estimated additional ROI
          recommendedIncrease: Math.round(v.totalRevenue * 0.2) // 20% budget increase
        }));

      // Cost trends (mock data for monthly trends)
      const costTrends = {
        monthly: [
          { month: "Jan", avgCostPerStream: 0.045, totalSpend: 12000, efficiency: 85 },
          { month: "Feb", avgCostPerStream: 0.042, totalSpend: 15000, efficiency: 88 },
          { month: "Mar", avgCostPerStream: 0.038, totalSpend: 18000, efficiency: 92 },
          { month: "Apr", avgCostPerStream: 0.041, totalSpend: 16000, efficiency: 89 },
          { month: "May", avgCostPerStream: 0.037, totalSpend: 20000, efficiency: 94 },
          { month: "Jun", avgCostPerStream: 0.035, totalSpend: 22000, efficiency: 96 }
        ]
      };

      // Profitability metrics
      const grossProfit = totalRevenue - totalCost;
      const profitabilityMetrics = {
        grossProfit,
        netProfit: grossProfit * 0.85, // Assuming 15% operational costs
        profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        breakEvenPoint: totalCost // Simplified break-even calculation
      };

      return {
        overallROI,
        campaignROIBreakdown,
        vendorCostEfficiency,
        budgetOptimization: {
          underperformingCampaigns,
          overperformingVendors
        },
        costTrends,
        profitabilityMetrics
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};









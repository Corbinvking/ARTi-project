"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { addDays, format } from "date-fns";

export interface PredictiveAnalyticsData {
  performanceForecast: Array<{
    date: string;
    predictedStreams: number;
    confidence: number;
    actualStreams?: number;
  }>;
  completionPredictions: {
    avgDays: number;
    fastestCompletion: number;
    slowestCompletion: number;
  };
  goalAchievementProbability: number;
  riskAssessment: {
    low: number;
    medium: number;
    high: number;
  };
  recommendations: {
    budgetOptimization: Array<{
      campaignId: string;
      campaignName: string;
      action: 'increase' | 'decrease' | 'maintain';
      amount: number;
      reason: string;
    }>;
    vendorOptimization: Array<{
      vendorId: string;
      name: string;
      predictedPerformance: number;
      recommendation: string;
    }>;
  };
  modelConfidence: number;
}

export const usePredictiveAnalytics = () => {
  return useQuery({
    queryKey: ["predictive-analytics"],
    queryFn: async (): Promise<PredictiveAnalyticsData> => {
      // Get campaigns data
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*");

      if (campaignsError) throw campaignsError;

      // Get campaign allocations performance
      const { data: performance, error: performanceError } = await supabase
        .from("campaign_allocations_performance")
        .select("*");

      if (performanceError) throw performanceError;

      // Get vendor data for optimization recommendations
      const { data: vendors, error: vendorsError } = await supabase
        .from("vendors")
        .select("*");

      if (vendorsError) throw vendorsError;

      // Generate performance forecast (next 30 days)
      const performanceForecast = Array.from({ length: 30 }, (_, i) => {
        const date = addDays(new Date(), i + 1);
        const baseStreams = 50000 + Math.random() * 20000;
        const trendFactor = 1 + (i * 0.02); // Growth trend
        const seasonality = 1 + Math.sin(i / 7) * 0.1; // Weekly pattern
        
        return {
          date: format(date, 'MMM dd'),
          predictedStreams: Math.round(baseStreams * trendFactor * seasonality),
          confidence: 85 + Math.random() * 10, // 85-95% confidence
        };
      });

      // Calculate completion predictions
      const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];
      const completionTimes = activeCampaigns.map(campaign => {
        const campaignPerformance = performance?.filter(p => p.campaign_id === campaign.id) || [];
        const currentStreams = campaignPerformance.reduce((sum, p) => sum + (p.actual_streams || 0), 0);
        const dailyRate = currentStreams / Math.max(1, 
          Math.ceil((new Date().getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))
        );
        const remainingStreams = Math.max(0, campaign.stream_goal - currentStreams);
        return dailyRate > 0 ? remainingStreams / dailyRate : 90; // Default to 90 days
      });

      const completionPredictions = {
        avgDays: completionTimes.length > 0 
          ? Math.round(completionTimes.reduce((sum, days) => sum + days, 0) / completionTimes.length)
          : 45,
        fastestCompletion: completionTimes.length > 0 ? Math.round(Math.min(...completionTimes)) : 30,
        slowestCompletion: completionTimes.length > 0 ? Math.round(Math.max(...completionTimes)) : 90
      };

      // Calculate goal achievement probability
      const campaignsWithProgress = activeCampaigns.map(campaign => {
        const campaignPerformance = performance?.filter(p => p.campaign_id === campaign.id) || [];
        const currentStreams = campaignPerformance.reduce((sum, p) => sum + (p.actual_streams || 0), 0);
        return currentStreams / Math.max(1, campaign.stream_goal);
      });

      const avgProgress = campaignsWithProgress.length > 0
        ? campaignsWithProgress.reduce((sum, progress) => sum + progress, 0) / campaignsWithProgress.length
        : 0.5;

      const goalAchievementProbability = Math.min(95, Math.max(10, avgProgress * 100 + 20));

      // Risk assessment
      const riskLevels = activeCampaigns.map(campaign => {
        const campaignPerformance = performance?.filter(p => p.campaign_id === campaign.id) || [];
        const avgPerformance = campaignPerformance.length > 0
          ? campaignPerformance.reduce((sum, p) => sum + (p.performance_score || 0), 0) / campaignPerformance.length
          : 0.5;
        
        if (avgPerformance < 0.3) return 'high';
        if (avgPerformance < 0.6) return 'medium';
        return 'low';
      });

      const riskAssessment = {
        low: riskLevels.filter(r => r === 'low').length,
        medium: riskLevels.filter(r => r === 'medium').length,
        high: riskLevels.filter(r => r === 'high').length,
      };

      // Budget optimization recommendations
      const budgetOptimization = activeCampaigns.slice(0, 5).map(campaign => {
        const campaignPerformance = performance?.filter(p => p.campaign_id === campaign.id) || [];
        const avgPerformance = campaignPerformance.length > 0
          ? campaignPerformance.reduce((sum, p) => sum + (p.performance_score || 0), 0) / campaignPerformance.length
          : 0.5;

        if (avgPerformance > 0.8) {
          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            action: 'increase' as const,
            amount: 15,
            reason: 'High performance indicates opportunity for budget scaling'
          };
        } else if (avgPerformance < 0.4) {
          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            action: 'decrease' as const,
            amount: 20,
            reason: 'Poor performance suggests budget reallocation needed'
          };
        } else {
          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            action: 'maintain' as const,
            amount: 0,
            reason: 'Performance is stable, maintain current budget'
          };
        }
      });

      // Vendor optimization recommendations
      const vendorOptimization = (vendors || []).slice(0, 5).map(vendor => {
        const vendorPerformances = performance?.filter(p => p.vendor_id === vendor.id) || [];
        const avgPerformance = vendorPerformances.length > 0
          ? vendorPerformances.reduce((sum, p) => sum + (p.performance_score || 0), 0) / vendorPerformances.length
          : 0.5;

        const predictedPerformance = Math.min(100, avgPerformance * 120); // Predict 20% improvement potential

        return {
          vendorId: vendor.id,
          name: vendor.name,
          predictedPerformance: predictedPerformance * 100,
          recommendation: predictedPerformance > 0.8 
            ? 'Increase allocation to this high-performing vendor'
            : predictedPerformance > 0.6
              ? 'Monitor performance and optimize gradually'
              : 'Consider reducing allocation or providing additional support'
        };
      });

      return {
        performanceForecast,
        completionPredictions,
        goalAchievementProbability,
        riskAssessment,
        recommendations: {
          budgetOptimization,
          vendorOptimization
        },
        modelConfidence: 87.5 // Mock confidence score
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};









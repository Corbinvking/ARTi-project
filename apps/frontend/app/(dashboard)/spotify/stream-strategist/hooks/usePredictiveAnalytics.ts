"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { addDays, format } from "date-fns";

export interface CampaignForecast {
  campaign_id: number;
  campaign_name: string;
  artist_name: string;
  current_streams_28d: number;
  daily_rate: number;
  stream_goal: number;
  progress_percent: number;
  days_to_goal: number;
  forecast: Array<{
    date: string;
    predictedStreams: number;
    confidence: number;
  }>;
}

export interface PredictiveAnalyticsData {
  campaigns: CampaignForecast[];
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
      // Get spotify campaigns with actual stream data
      const { data: spotifyCampaigns, error: spotifyError } = await supabase
        .from("spotify_campaigns")
        .select("id, campaign, track_name, artist_name, streams_28d, streams_7d, streams_24h, stream_goal, status")
        .not("streams_28d", "is", null)
        .order("streams_28d", { ascending: false });

      if (spotifyError) {
        console.error("Error fetching spotify_campaigns:", spotifyError);
      }

      // Get campaigns data for legacy support (optional - don't fail if missing)
      let campaigns: any[] = [];
      try {
        const { data, error } = await supabase.from("campaigns").select("*");
        if (!error && data) campaigns = data;
      } catch (e) {
        console.warn("campaigns table not available:", e);
      }

      // Get campaign allocations performance (optional)
      let performance: any[] = [];
      try {
        const { data, error } = await supabase.from("campaign_allocations_performance").select("*");
        if (!error && data) performance = data;
      } catch (e) {
        console.warn("campaign_allocations_performance not available:", e);
      }

      // Get vendor data for optimization recommendations
      const { data: vendors, error: vendorsError } = await supabase
        .from("vendors")
        .select("*");
      
      if (vendorsError) {
        console.warn("Error fetching vendors:", vendorsError);
      }

      // Generate per-campaign forecasts based on actual data
      const campaignForecasts: CampaignForecast[] = (spotifyCampaigns || [])
        .filter(sc => sc.streams_28d > 0)
        .map(sc => {
          const streams28d = sc.streams_28d || 0;
          const streams7d = sc.streams_7d || 0;
          const dailyRate = streams7d > 0 ? streams7d / 7 : streams28d / 28;
          const streamGoal = sc.stream_goal || streams28d * 2; // Default goal if not set
          const progressPercent = streamGoal > 0 ? (streams28d / streamGoal) * 100 : 0;
          const remainingStreams = Math.max(0, streamGoal - streams28d);
          const daysToGoal = dailyRate > 0 ? Math.ceil(remainingStreams / dailyRate) : 999;

          // Generate 30-day forecast for this campaign
          const forecast = Array.from({ length: 30 }, (_, i) => {
            const date = addDays(new Date(), i + 1);
            // Predict with some variance based on recent performance
            const weeklyGrowth = streams7d > 0 ? (streams7d / (streams28d / 4)) : 1;
            const predictedDaily = dailyRate * Math.pow(weeklyGrowth, i / 7);
            const cumulativeStreams = streams28d + (predictedDaily * (i + 1));
            
            return {
              date: format(date, 'MMM dd'),
              predictedStreams: Math.round(cumulativeStreams),
              confidence: Math.max(50, 95 - (i * 1.5)), // Confidence decreases over time
            };
          });

          return {
            campaign_id: sc.id,
            campaign_name: sc.track_name || sc.campaign || 'Unknown',
            artist_name: sc.artist_name || 'Unknown',
            current_streams_28d: streams28d,
            daily_rate: Math.round(dailyRate),
            stream_goal: streamGoal,
            progress_percent: Math.round(progressPercent),
            days_to_goal: daysToGoal,
            forecast,
          };
        });

      // Generate aggregate performance forecast (next 30 days)
      const totalDailyRate = campaignForecasts.length > 0 
        ? campaignForecasts.reduce((sum, c) => sum + c.daily_rate, 0)
        : 5000; // Default daily rate if no data
      const performanceForecast = Array.from({ length: 30 }, (_, i) => {
        const date = addDays(new Date(), i + 1);
        const baseStreams = Math.max(1000, totalDailyRate) * (i + 1);
        const trendFactor = 1 + (i * 0.01); // Slight growth trend
        const seasonality = 1 + Math.sin(i / 7) * 0.05; // Weekly pattern
        
        return {
          date: format(date, 'MMM dd'),
          predictedStreams: Math.round(baseStreams * trendFactor * seasonality),
          confidence: Math.max(50, 90 - (i * 1)), // 90% to 60%
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
        campaigns: campaignForecasts,
        performanceForecast,
        completionPredictions,
        goalAchievementProbability,
        riskAssessment,
        recommendations: {
          budgetOptimization,
          vendorOptimization
        },
        modelConfidence: campaignForecasts.length > 0 ? 85 : 50 // Higher confidence with real data
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};









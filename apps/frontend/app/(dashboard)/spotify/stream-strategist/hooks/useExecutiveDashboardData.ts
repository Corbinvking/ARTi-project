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

      // Get campaign_groups data (main campaigns table)
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaign_groups")
        .select("*");

      if (campaignsError) throw campaignsError;

      // Get spotify_campaigns (individual songs)
      const { data: spotifyCampaigns, error: songsError } = await supabase
        .from("spotify_campaigns")
        .select("*");

      if (songsError) throw songsError;

      // Get playlist data (actual stream data)
      const { data: playlistData, error: playlistError } = await supabase
        .from("campaign_playlists")
        .select("*");

      if (playlistError) throw playlistError;

      // Get vendor data
      const { data: vendors, error: vendorError } = await supabase
        .from("vendors")
        .select("*");

      if (vendorError) throw vendorError;

      // Calculate metrics
      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'Active').length || 0;
      
      // Calculate total revenue (sum of all campaign budgets)
      const totalRevenue = campaigns?.reduce((sum, campaign) => {
        return sum + (parseFloat(campaign.total_budget) || 0);
      }, 0) || 0;

      // Calculate ROI (simplified: revenue vs budget)
      const averageROI = totalRevenue > 0 ? ((totalRevenue - totalRevenue * 0.7) / (totalRevenue * 0.7)) * 100 : 0;

      // Calculate total stream goals
      const totalStreamGoals = Array.isArray(campaigns) 
        ? campaigns.reduce((sum, c) => sum + (parseFloat(c.total_goal) || 0), 0) 
        : 0;
        
      // Calculate actual streams from campaign_playlists
      const totalActualStreams = Array.isArray(playlistData) 
        ? playlistData.reduce((sum, playlist) => sum + (playlist.streams_28d || 0), 0) 
        : 0;

      // Calculate campaign efficiency (goal achievement rate - how close are we to hitting goals?)
      const campaignEfficiency = totalStreamGoals > 0 
        ? Math.min((totalActualStreams / totalStreamGoals) * 100, 100)
        : 0;

      // Calculate average cost per stream
      const averageCostPerStream = totalActualStreams > 0 
        ? totalRevenue / totalActualStreams 
        : 0;

      // Calculate streams from past 30 days (use total streams - streams_28d is already "past 28 days")
      // This represents current active streaming performance across all campaigns
      const totalStreamsPast30Days = totalActualStreams;

      // Calculate campaigns added in past 30 days
      const campaignsAddedPast30Days = Array.isArray(campaigns) 
        ? campaigns.filter(c => new Date(c.created_at) >= past30Days).length 
        : 0;

      // Calculate average cost per 1k streams (based on budget vs goals for realistic pricing)
      // This shows the budgeted cost to achieve 1K streams, not actual cost
      const averageCostPer1kStreams = totalStreamGoals > 0
        ? (totalRevenue / (totalStreamGoals / 1000))
        : 0;

      // Calculate top performing vendors from playlist data
      const topPerformingVendors = Array.isArray(vendors) 
        ? vendors.map(vendor => {
            // Get all playlists for this vendor
            const vendorPlaylists = playlistData?.filter(p => p.vendor_id === vendor.id) || [];
            const totalStreams = vendorPlaylists.reduce((sum, p) => sum + (p.streams_28d || 0), 0);
            const totalCampaigns = new Set(vendorPlaylists.map(p => p.campaign_id)).size;
            
            // Calculate efficiency (streams per campaign)
            const efficiency = totalCampaigns > 0 ? totalStreams / totalCampaigns : 0;
            
            // Calculate performance (average streams per playlist)
            const avgPerformance = vendorPlaylists.length > 0 
              ? totalStreams / vendorPlaylists.length 
              : 0;

            return {
              name: vendor.name,
              efficiency: Math.min(efficiency / 1000, 100), // Cap at 100% for display
              totalCampaigns: totalCampaigns,
              avgPerformance: Math.min(avgPerformance / 100, 100) // Normalize for display
            };
        })
        .filter(v => v.totalCampaigns > 0) // Only vendors with campaigns
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 5)
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
        const status = campaign.status || 'Draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) : {};

      const campaignStatusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.toLowerCase(), // Normalize for display
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









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
    totalCampaigns: number;
    totalPlaylists: number;
    totalStreams12m: number;
    avgStreamsPerPlaylist: number;
    costPer1k: number;
    efficiency: number; // Legacy: avgStreamsPerPlaylist / 1000
    avgPerformance: number; // Legacy: totalStreams12m / 1000
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

      // Calculate actual vendor costs paid (based on streams delivered * cost per 1k)
      let totalVendorCostsPaid = 0;
      if (Array.isArray(playlistData) && Array.isArray(vendors)) {
        const vendorCostMap = new Map<string, number>();
        vendors.forEach(v => {
          if (v.cost_per_1k_streams && v.cost_per_1k_streams > 0) {
            vendorCostMap.set(v.id, v.cost_per_1k_streams);
          }
        });
        
        playlistData
          .filter(p => p.vendor_id && !p.is_algorithmic && !p.is_organic)
          .forEach(playlist => {
            const costPer1k = playlist.cost_per_1k_override || vendorCostMap.get(playlist.vendor_id) || 0;
            const streams = playlist.streams_12m || 0;
            totalVendorCostsPaid += (streams / 1000) * costPer1k;
          });
      }
      
      // Calculate Profit Margin: (Revenue - Vendor Costs) / Revenue * 100
      // This shows how much margin we're making after paying vendors
      const averageROI = totalRevenue > 0 
        ? ((totalRevenue - totalVendorCostsPaid) / totalRevenue) * 100 
        : 0;

      // Calculate total stream goals
      const totalStreamGoals = Array.isArray(campaigns) 
        ? campaigns.reduce((sum, c) => sum + (parseFloat(c.total_goal) || 0), 0) 
        : 0;
        
      // Calculate actual streams from campaign_playlists (ALL streams for overall metric)
      const totalActualStreams = Array.isArray(playlistData) 
        ? playlistData.reduce((sum, playlist) => sum + (playlist.streams_12m || 0), 0) 
        : 0;
      
      // Calculate streams ONLY from our vendor playlists (for cost calculations)
      const totalVendorPlaylistStreams = Array.isArray(playlistData) 
        ? playlistData
            .filter(p => p.vendor_id && !p.is_algorithmic && !p.is_organic)
            .reduce((sum, playlist) => sum + (playlist.streams_12m || 0), 0) 
        : 0;

      // Calculate campaign efficiency (goal achievement rate - how close are we to hitting goals?)
      const campaignEfficiency = totalStreamGoals > 0 
        ? Math.min((totalActualStreams / totalStreamGoals) * 100, 100)
        : 0;

      // Calculate streams from past 30 days - ONLY from vendor-placed playlists
      // Exclude algorithmic (is_algorithmic=true) and organic (is_organic=true) playlists
      const totalStreamsPast30Days = totalVendorPlaylistStreams;

      // Calculate average cost per stream based on vendor playlist streams
      const averageCostPerStream = totalVendorPlaylistStreams > 0 
        ? totalRevenue / totalVendorPlaylistStreams 
        : 0;

      // Calculate campaigns added in past 30 days
      const campaignsAddedPast30Days = Array.isArray(campaigns) 
        ? campaigns.filter(c => new Date(c.created_at) >= past30Days).length 
        : 0;

      // Calculate average cost per 1k streams - based on actual vendor rates we've paid
      // Get unique vendors with their cost_per_1k_streams from playlists we've used
      const vendorCosts: number[] = [];
      if (Array.isArray(playlistData) && Array.isArray(vendors)) {
        // Build a map of vendor costs
        const vendorCostMap = new Map<string, number>();
        vendors.forEach(v => {
          if (v.cost_per_1k_streams && v.cost_per_1k_streams > 0) {
            vendorCostMap.set(v.id, v.cost_per_1k_streams);
          }
        });
        
        // Collect costs from vendor playlists (using override if set, otherwise vendor default)
        playlistData
          .filter(p => p.vendor_id && !p.is_algorithmic && !p.is_organic)
          .forEach(playlist => {
            const cost = playlist.cost_per_1k_override || vendorCostMap.get(playlist.vendor_id) || 0;
            if (cost > 0) {
              vendorCosts.push(cost);
            }
          });
      }
      
      // Calculate weighted average (or simple average if no weighting data)
      const averageCostPer1kStreams = vendorCosts.length > 0
        ? vendorCosts.reduce((sum, cost) => sum + cost, 0) / vendorCosts.length
        : 0;

      // Calculate top performing vendors from playlist data
      // Metrics explained:
      // - totalStreams12m: Total streams from this vendor's playlists in past 12 months
      // - avgStreamsPerPlaylist: Average streams per playlist (quality indicator)
      // - costPer1kActual: Actual cost per 1K streams based on their rate
      const topPerformingVendors = Array.isArray(vendors) 
        ? vendors.map(vendor => {
            // Get all playlists for this vendor (excluding algorithmic/organic)
            const vendorPlaylists = playlistData?.filter(p => 
              p.vendor_id === vendor.id && !p.is_algorithmic && !p.is_organic
            ) || [];
            
            // Total streams from this vendor's playlists (12 months)
            const totalStreams12m = vendorPlaylists.reduce((sum, p) => sum + (p.streams_12m || 0), 0);
            
            // Number of unique campaigns this vendor has playlists in
            const totalCampaigns = new Set(vendorPlaylists.map(p => p.campaign_id)).size;
            
            // Number of playlists this vendor has
            const totalPlaylists = vendorPlaylists.length;
            
            // Average streams per playlist (12m) - higher = better performing playlists
            const avgStreamsPerPlaylist = totalPlaylists > 0 
              ? Math.round(totalStreams12m / totalPlaylists)
              : 0;
            
            // Cost per 1K streams for this vendor
            const vendorCostPer1k = vendor.cost_per_1k_streams || 0;
            
            // Actual cost efficiency: how much we pay per 1K streams
            // Lower is better (we get more streams for less money)
            const costEfficiency = vendorCostPer1k > 0 ? vendorCostPer1k : 0;

            return {
              name: vendor.name,
              totalCampaigns,
              totalPlaylists,
              totalStreams12m,
              avgStreamsPerPlaylist,
              costPer1k: costEfficiency,
              // For display: efficiency = avg streams per playlist (thousands)
              efficiency: avgStreamsPerPlaylist / 1000,
              // For display: performance = total streams (thousands)  
              avgPerformance: totalStreams12m / 1000
            };
        })
        .filter(v => v.totalCampaigns > 0) // Only vendors with campaigns
        .sort((a, b) => b.totalStreams12m - a.totalStreams12m) // Sort by total streams delivered
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

      // Campaign status distribution - normalize status names (case-insensitive grouping)
      const statusCounts = Array.isArray(campaigns) ? campaigns.reduce((acc, campaign) => {
        // Normalize status to title case for consistent grouping
        const rawStatus = campaign.status || 'Draft';
        const normalizedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
        acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) : {};

      // Ensure all main statuses are represented (even if 0)
      const allStatuses = ['Active', 'Pending', 'Paused', 'Completed', 'Draft'];
      allStatuses.forEach(status => {
        if (!statusCounts[status]) {
          statusCounts[status] = 0;
        }
      });

      const campaignStatusDistribution = Object.entries(statusCounts)
        .filter(([_, count]) => count > 0) // Only show statuses with campaigns
        .map(([status, count]) => ({
          status,
          count,
          percentage: totalCampaigns > 0 ? (count / totalCampaigns) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

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









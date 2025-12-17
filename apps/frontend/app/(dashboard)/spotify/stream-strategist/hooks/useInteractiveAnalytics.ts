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
      console.log('📊 [InteractiveAnalytics] Starting to fetch data...');
      
      // Get campaigns data from campaign_groups (real data)
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaign_groups")
        .select("*")
        .in('status', ['Active', 'Complete', 'Completed']);

      if (campaignsError) throw campaignsError;
      console.log('📊 [InteractiveAnalytics] Campaigns:', campaigns?.length);

      // Get scraped playlist data (real streams)
      const { data: campaignPlaylists, error: playlistsError } = await supabase
        .from("campaign_playlists")
        .select("*");

      if (playlistsError) throw playlistsError;
      console.log('📊 [InteractiveAnalytics] Campaign Playlists:', campaignPlaylists?.length);

      // Get spotify_campaigns for cost data
      const { data: spotifyCampaigns, error: spotifyError } = await supabase
        .from("spotify_campaigns")
        .select("id, campaign_group_id, sale_price");

      if (spotifyError) throw spotifyError;
      console.log('📊 [InteractiveAnalytics] Spotify Campaigns:', spotifyCampaigns?.length);

      // Get vendor data
      const { data: vendors, error: vendorsError } = await supabase
        .from("vendors")
        .select("*");

      if (vendorsError) throw vendorsError;
      console.log('📊 [InteractiveAnalytics] Vendors:', vendors?.length);

      // Process chart data - campaign performance breakdown using real scraped data
      const chartData = (campaigns || []).slice(0, 10).map(campaign => {
        // Get real scraped streams for this campaign
        const campaignPlaylistData = campaignPlaylists?.filter(p => p.campaign_id === campaign.id) || [];
        const totalStreams = campaignPlaylistData.reduce((sum, p) => sum + (p.current_streams || 0), 0);
        
        // Get cost from spotify_campaigns
        const spotifyCampaign = spotifyCampaigns?.find(sc => sc.campaign_group_id === campaign.id);
        const costStr = spotifyCampaign?.sale_price || '$0';
        const totalCost = parseFloat(costStr.replace(/[$,]/g, '')) || 0;
        
        // Calculate revenue (estimated based on stream value)
        const revenuePerStream = 0.003; // Average revenue per stream
        const revenue = totalStreams * revenuePerStream;
        
        // Calculate ROI
        const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;
        
        // Calculate performance (streams vs target)
        const streamGoal = (campaign as any).stream_goal || 10000;
        const avgPerformance = streamGoal > 0 ? (totalStreams / streamGoal) * 100 : 0;

        return {
          name: campaign.name.substring(0, 15) + (campaign.name.length > 15 ? '...' : ''),
          streams: totalStreams,
          revenue: revenue,
          roi: roi,
          performance: Math.min(avgPerformance, 150) // Cap at 150%
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

      // Process vendor drill-down data with real scraped streams
      const vendorData = (vendors || []).map(vendor => {
        const vendorPlaylists = campaignPlaylists?.filter(p => p.vendor_id === vendor.id) || [];
        const vendorCampaignIds = [...new Set(vendorPlaylists.map(p => p.campaign_id))];
        const vendorCampaigns = campaigns?.filter(c => vendorCampaignIds.includes(c.id)) || [];

        const totalStreams = vendorPlaylists.reduce((sum, p) => sum + (p.current_streams || 0), 0);
        
        // Calculate average performance based on actual vs allocated
        const avgPerformance = vendorPlaylists.length > 0 ? 
          vendorPlaylists.reduce((sum, p) => {
            const goal = (p.allocated_streams || 1000);
            const actual = (p.current_streams || 0);
            return sum + (actual / goal) * 100;
          }, 0) / vendorPlaylists.length
          : 0;

        return {
          name: vendor.name,
          campaigns: vendorCampaigns.length,
          avgPerformance: Math.min(avgPerformance, 150), // Cap at 150%
          totalStreams
        };
      }).filter(v => v.totalStreams > 0).sort((a, b) => b.totalStreams - a.totalStreams).slice(0, 8);

      // Calculate real timeline data from scraped playlist data grouped by date
      const timelineMap = new Map<string, { streams: number; count: number }>();
      
      campaignPlaylists?.forEach(playlist => {
        if (playlist.last_scraped_at) {
          const date = new Date(playlist.last_scraped_at);
          const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          const existing = timelineMap.get(dateKey) || { streams: 0, count: 0 };
          timelineMap.set(dateKey, {
            streams: existing.streams + (playlist.current_streams || 0),
            count: existing.count + 1
          });
        }
      });

      // Convert to array and sort by date (last 30 entries)
      const timelineData = Array.from(timelineMap.entries())
        .map(([date, data]) => ({
          date,
          streams: data.streams,
          performance: data.count > 0 ? (data.streams / data.count) / 100 : 50 // Normalize
        }))
        .slice(-30);

      // Calculate algorithmic playlist metrics
      const algoPlaylists = campaignPlaylists?.filter(p => p.is_algorithmic === true) || [];
      
      // Group by campaign to count unique songs
      const campaignAlgoStreams = new Map<string, number>();
      algoPlaylists.forEach(playlist => {
        const existing = campaignAlgoStreams.get(playlist.campaign_id) || 0;
        campaignAlgoStreams.set(playlist.campaign_id, existing + (playlist.current_streams || 0));
      });

      const songsWithAlgo1k = Array.from(campaignAlgoStreams.values()).filter(streams => streams >= 1000).length;
      const songsWithAlgo5k = Array.from(campaignAlgoStreams.values()).filter(streams => streams >= 5000).length;
      const songsWithAlgo20k = Array.from(campaignAlgoStreams.values()).filter(streams => streams >= 20000).length;

      // Calculate total streams and costs
      const totalStreams = campaignPlaylists?.reduce((sum, p) => sum + (p.current_streams || 0), 0) || 0;
      const totalCost = spotifyCampaigns?.reduce((sum, sc) => {
        const costStr = sc.sale_price || '$0';
        return sum + (parseFloat(costStr.replace(/[$,]/g, '')) || 0);
      }, 0) || 0;
      
      const avgCostPerStream = totalStreams > 0 ? totalCost / totalStreams : 0;
      
      // Calculate campaign completion rate
      const campaignsWithGoals = campaigns?.filter((c: any) => c.stream_goal) || [];
      const completedCampaigns = chartData.filter(c => c.performance >= 100).length;
      const completionRate = campaignsWithGoals.length > 0 ? 
        (completedCampaigns / Math.min(campaignsWithGoals.length, chartData.length)) * 100 : 0;

      // Generate insights with real data
      const insights = [
        {
          title: "Songs with 1K+ Algo Streams",
          description: "Tracks getting at least 1,000 algorithmic streams",
          value: `${songsWithAlgo1k} songs`,
          trend: songsWithAlgo1k > 0 ? 'positive' as const : 'neutral' as const
        },
        {
          title: "Songs with 5K+ Algo Streams",
          description: "Tracks getting 5,000+ algorithmic streams",
          value: `${songsWithAlgo5k} songs`,
          trend: songsWithAlgo5k > 0 ? 'positive' as const : 'neutral' as const
        },
        {
          title: "Songs with 20K+ Algo Streams",
          description: "Tracks getting 20,000+ algorithmic streams",
          value: `${songsWithAlgo20k} songs`,
          trend: songsWithAlgo20k > 0 ? 'positive' as const : 'neutral' as const
        },
        {
          title: "Average Cost Efficiency",
          description: "Cost per stream across all campaigns",
          value: avgCostPerStream > 0 ? `$${avgCostPerStream.toFixed(3)}/stream` : "No data",
          trend: avgCostPerStream < 0.05 ? 'positive' as const : 'neutral' as const
        },
        {
          title: "Campaign Completion Rate",
          description: "Percentage of campaigns meeting goals",
          value: `${completionRate.toFixed(1)}%`,
          trend: completionRate >= 80 ? 'positive' as const : 'neutral' as const
        },
        {
          title: "Vendor Performance",
          description: "Average vendor efficiency score",
          value: vendorData.length > 0 ? 
            `${(vendorData.reduce((sum, v) => sum + v.avgPerformance, 0) / vendorData.length).toFixed(1)}%` :
            "No data",
          trend: 'neutral' as const
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









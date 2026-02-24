"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { fetchAllRows } from "../lib/utils";

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
  campaignPacingEfficiency: number;
  averageCostPerStream: number;
  averageCostPer1kStreams: number;
  revenue30d: number;
  vendorCost30d: number;
  grossMarginPct: number;
  vendorLiability: {
    approvedUnpaid: number;
    awaitingVerification: number;
  };
  flaggedCampaigns: number;
  topPerformingVendors: Array<{
    id: string;
    name: string;
    totalCampaigns: number;
    activeCampaignCount: number;
    totalPlaylists: number;
    totalStreams12m: number;
    avgStreamsPerPlaylist: number;
    costPer1k: number;
    approvalRate: number;
    payoutStatus: "paid" | "partial" | "unpaid" | "none";
    efficiency: number;
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

      const [
        campaignGroupsResult,
        spotifyCampaignsResult,
        playlistData,
        vendorsResult,
        allocationsResult,
        vendorRequestsResult,
      ] = await Promise.all([
        supabase.from("campaign_groups" as any).select("*"),
        supabase.from("spotify_campaigns" as any).select("*"),
        fetchAllRows("campaign_playlists", "*"),
        supabase.from("vendors").select("*"),
        supabase.from("campaign_allocations_performance").select("*"),
        supabase.from("campaign_vendor_requests").select("*"),
      ]);

      const campaignGroups: any[] = campaignGroupsResult.data || [];
      const songs: any[] = spotifyCampaignsResult.data || [];
      const vendors: any[] = vendorsResult.data || [];
      const allocations: any[] = allocationsResult.data || [];
      const vendorRequests: any[] = vendorRequestsResult.data || [];

      const campaigns = songs.length > 0 ? songs : campaignGroups;

      if (campaignGroupsResult.error) throw campaignGroupsResult.error;

      const normalizeStatus = (s: string | null) => (s || "").toLowerCase().trim();
      const activeStatuses = ["active", "in_progress", "running"];

      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => activeStatuses.includes(normalizeStatus(c.status))).length;

      // Build vendor cost map
      const vendorCostMap = new Map<string, number>();
      vendors.forEach(v => {
        if (v.cost_per_1k_streams && v.cost_per_1k_streams > 0) {
          vendorCostMap.set(v.id, v.cost_per_1k_streams);
        }
      });

      const vendorPlaylists = Array.isArray(playlistData)
        ? playlistData.filter(p => p.vendor_id && !p.is_algorithmic && !p.is_organic)
        : [];

      // Total vendor costs
      let totalVendorCostsPaid = 0;
      vendorPlaylists.forEach(playlist => {
        const costPer1k = playlist.cost_per_1k_override || vendorCostMap.get(playlist.vendor_id) || 0;
        const streams = playlist.streams_12m || 0;
        totalVendorCostsPaid += (streams / 1000) * costPer1k;
      });

      // Revenue = sum of campaign budgets
      // campaign_groups has total_budget, spotify_campaigns has budget
      const totalRevenue = campaigns.reduce((sum, c) => {
        return sum + (parseFloat(c.total_budget || c.budget) || 0);
      }, 0);
      const averageROI = totalRevenue > 0
        ? ((totalRevenue - totalVendorCostsPaid) / totalRevenue) * 100
        : 0;

      // 30-day financials
      const campaigns30d = campaigns.filter(c => new Date(c.created_at) >= past30Days);
      const revenue30d = campaigns30d.reduce((sum, c) => sum + (parseFloat(c.total_budget || c.budget) || 0), 0);

      const playlists30d = vendorPlaylists.filter(p => {
        const added = p.added_at || p.created_at;
        return added && new Date(added) >= past30Days;
      });
      let vendorCost30d = 0;
      playlists30d.forEach(p => {
        const costPer1k = p.cost_per_1k_override || vendorCostMap.get(p.vendor_id) || 0;
        const streams = p.streams_12m || 0;
        vendorCost30d += (streams / 1000) * costPer1k;
      });
      if (vendorCost30d === 0 && totalVendorCostsPaid > 0) {
        vendorCost30d = totalVendorCostsPaid;
      }
      const effectiveRevenue = revenue30d > 0 ? revenue30d : totalRevenue;
      const effectiveCost = vendorCost30d > 0 ? vendorCost30d : totalVendorCostsPaid;
      const grossMarginPct = effectiveRevenue > 0
        ? ((effectiveRevenue - effectiveCost) / effectiveRevenue) * 100
        : 0;

      // Vendor Liability - use vendor cost_per_1k_streams when cost_per_stream is missing
      const unpaidAllocations = allocations.filter(a => {
        const status = (a.payment_status || "").toLowerCase();
        return status !== "paid" && a.actual_streams && a.actual_streams > 0;
      });

      const getAllocCost = (a: any) => {
        if (a.cost_per_stream && a.cost_per_stream > 0) {
          return a.cost_per_stream * (a.actual_streams || 0);
        }
        const vendorRate = vendorCostMap.get(a.vendor_id) || 0;
        return ((a.actual_streams || 0) / 1000) * vendorRate;
      };

      const approvedUnpaid = unpaidAllocations
        .filter(a => {
          const status = (a.payment_status || "").toLowerCase();
          return status === "approved" || status === "unpaid" || status === "";
        })
        .reduce((sum, a) => sum + getAllocCost(a), 0);
      const awaitingVerification = unpaidAllocations
        .filter(a => {
          const status = (a.payment_status || "").toLowerCase();
          return status === "pending" || status === "verification" || status === "awaiting_verification";
        })
        .reduce((sum, a) => sum + getAllocCost(a), 0);

      // Stream goals & actuals
      // spotify_campaigns uses `goal` (text), campaign_groups uses `total_goal`
      const totalStreamGoals = campaigns.reduce((sum, c) => {
        return sum + (parseFloat(c.goal || c.total_goal || c.stream_goal) || 0);
      }, 0);
      const totalActualStreams = Array.isArray(playlistData)
        ? playlistData.reduce((sum, p) => sum + (p.streams_12m || 0), 0)
        : 0;
      const totalVendorPlaylistStreams = vendorPlaylists.reduce((sum, p) => sum + (p.streams_12m || 0), 0);

      const campaignEfficiency = totalStreamGoals > 0
        ? Math.min((totalActualStreams / totalStreamGoals) * 100, 100)
        : 0;

      // Campaign Pacing Efficiency: % of active campaigns on pace
      const activeCampaignList = campaigns.filter(c => activeStatuses.includes(normalizeStatus(c.status)));
      const activeSongIds = new Set(activeCampaignList.map(c => c.id));

      // Bridge spotify_campaigns → campaign_groups for duration data
      const cgById = new Map<string, any>();
      const cgByName = new Map<string, any>();
      campaignGroups.forEach((cg: any) => {
        cgById.set(cg.id, cg);
        if (cg.name) cgByName.set(cg.name.toLowerCase().trim(), cg);
      });

      let onPaceCount = 0;
      let flaggedCount = 0;
      let assessableCampaigns = 0;
      for (const campaign of activeCampaignList) {
        const goal = parseFloat(campaign.goal || campaign.total_goal || campaign.stream_goal) || 0;

        const playlistStreams = playlistData
          .filter((p: any) => p.campaign_id === campaign.id)
          .reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0);

        if (!goal) continue;

        assessableCampaigns++;

        if (playlistStreams >= goal) {
          onPaceCount++;
          continue;
        }

        // Resolve start/end dates: try campaign directly, then bridge to campaign_group
        let startDate = campaign.start_date;
        let endDate = campaign.end_date;
        if (!startDate || !endDate) {
          const cg = (campaign.campaign_group_id && cgById.get(campaign.campaign_group_id))
            || (campaign.campaign && cgByName.get(campaign.campaign.toLowerCase().trim()));
          if (cg) {
            startDate = startDate || cg.start_date;
            endDate = endDate || cg.end_date;
          }
        }

        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const totalDuration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
          const elapsedDays = Math.max(1, Math.floor((currentDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
          const expectedStreams = (goal / totalDuration) * Math.min(elapsedDays, totalDuration);

          if (expectedStreams > 0 && playlistStreams / expectedStreams >= 0.8) {
            onPaceCount++;
          } else {
            flaggedCount++;
          }
        } else {
          if (playlistStreams > 0 && playlistStreams / goal >= 0.8) {
            onPaceCount++;
          } else {
            flaggedCount++;
          }
        }
      }

      const campaignPacingEfficiency = assessableCampaigns > 0
        ? (onPaceCount / assessableCampaigns) * 100
        : 0;

      const totalStreamsPast30Days = totalVendorPlaylistStreams;
      const averageCostPerStream = totalVendorPlaylistStreams > 0
        ? totalRevenue / totalVendorPlaylistStreams
        : 0;
      const campaignsAddedPast30Days = campaigns.filter(c => new Date(c.created_at) >= past30Days).length;

      // Average cost per 1K streams
      const vendorCostsList: number[] = [];
      vendorPlaylists.forEach(playlist => {
        const cost = playlist.cost_per_1k_override || vendorCostMap.get(playlist.vendor_id) || 0;
        if (cost > 0) vendorCostsList.push(cost);
      });
      const averageCostPer1kStreams = vendorCostsList.length > 0
        ? vendorCostsList.reduce((sum, c) => sum + c, 0) / vendorCostsList.length
        : 0;

      // Top performing vendors with extended data
      // Cross-reference using spotify_campaigns IDs (which campaign_playlists.campaign_id references)
      const topPerformingVendors = vendors.map(vendor => {
        const vPlaylists = vendorPlaylists.filter(p => p.vendor_id === vendor.id);
        const totalStreams12m = vPlaylists.reduce((sum, p) => sum + (p.streams_12m || 0), 0);
        const allCampaignIds = new Set(vPlaylists.map(p => p.campaign_id));
        const vendorTotalCampaigns = allCampaignIds.size;
        const totalPlaylistCount = vPlaylists.length;
        const avgStreamsPerPlaylist = totalPlaylistCount > 0
          ? Math.round(totalStreams12m / totalPlaylistCount)
          : 0;
        const vendorCostPer1k = vendor.cost_per_1k_streams || 0;

        // Active campaign count: match playlist campaign_ids against active spotify_campaigns
        const activeCampaignCount = [...allCampaignIds].filter(cid => activeSongIds.has(cid)).length;

        // Approval rate from vendor requests
        const vendorReqs = vendorRequests.filter(r => r.vendor_id === vendor.id);
        const acceptedReqs = vendorReqs.filter(r =>
          ["accepted", "approved", "completed"].includes((r.status || "").toLowerCase())
        ).length;
        const approvalRate = vendorReqs.length > 0
          ? (acceptedReqs / vendorReqs.length) * 100
          : 100;

        // Payout status — check both allocations and playlist vendor_paid field
        const vendorAllocations = allocations.filter(a => a.vendor_id === vendor.id);
        const paidAllocCount = vendorAllocations.filter(a => (a.payment_status || "").toLowerCase() === "paid").length;

        // Also check vendor_paid on playlists
        const paidPlaylists = vPlaylists.filter(p => p.vendor_paid === true).length;
        const unpaidPlaylists = vPlaylists.filter(p => p.vendor_paid === false || p.vendor_paid === null).length;

        let payoutStatus: "paid" | "partial" | "unpaid" | "none" = "none";
        if (vendorAllocations.length > 0) {
          if (paidAllocCount === vendorAllocations.length) payoutStatus = "paid";
          else if (paidAllocCount > 0) payoutStatus = "partial";
          else payoutStatus = "unpaid";
        } else if (vPlaylists.length > 0) {
          if (paidPlaylists === vPlaylists.length) payoutStatus = "paid";
          else if (paidPlaylists > 0) payoutStatus = "partial";
          else payoutStatus = "unpaid";
        }

        return {
          id: vendor.id,
          name: vendor.name,
          totalCampaigns: vendorTotalCampaigns,
          activeCampaignCount,
          totalPlaylists: totalPlaylistCount,
          totalStreams12m,
          avgStreamsPerPlaylist,
          costPer1k: vendorCostPer1k,
          approvalRate,
          payoutStatus,
          efficiency: avgStreamsPerPlaylist / 1000,
          avgPerformance: totalStreams12m / 1000,
        };
      })
        .filter(v => v.totalCampaigns > 0)
        .sort((a, b) => b.totalStreams12m - a.totalStreams12m)
        .slice(0, 10);

      // Campaign status distribution - ops-focused
      const statusMap: Record<string, number> = {
        "Active": 0,
        "Pending Approval": 0,
        "Awaiting Playlist Adds": 0,
        "Completed": 0,
        "Flagged": 0,
      };

      // Awaiting Playlist Adds: active campaigns with no vendor playlists yet
      const campaignIdsWithPlaylists = new Set(playlistData.map((p: any) => p.campaign_id));
      const awaitingPlaylistIds = new Set(
        activeCampaignList.filter(c => !campaignIdsWithPlaylists.has(c.id)).map(c => c.id)
      );

      campaigns.forEach(campaign => {
        const raw = normalizeStatus(campaign.status);
        if (activeStatuses.includes(raw)) {
          if (awaitingPlaylistIds.has(campaign.id)) {
            statusMap["Awaiting Playlist Adds"]++;
          } else {
            statusMap["Active"]++;
          }
        } else if (["pending", "draft"].includes(raw)) {
          statusMap["Pending Approval"]++;
        } else if (["complete", "completed", "done", "finished"].includes(raw)) {
          statusMap["Completed"]++;
        } else if (["paused", "flagged", "cancelled", "canceled"].includes(raw)) {
          statusMap["Flagged"]++;
        }
      });

      if (flaggedCount > 0) {
        statusMap["Flagged"] += flaggedCount;
      }

      const totalForDistribution = campaigns.length;
      const campaignStatusDistribution = Object.entries(statusMap)
        .map(([status, count]) => ({
          status,
          count,
          percentage: totalForDistribution > 0 ? (count / totalForDistribution) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const performanceBenchmarks = {
        industryAvgROI: 15.2,
        ourAvgROI: averageROI,
        industryAvgCostPerStream: 0.08,
        ourAvgCostPerStream: averageCostPerStream,
      };

      const monthOverMonthGrowth = { campaigns: 0, revenue: 0, streams: 0 };
      const quarterOverQuarterGrowth = { campaigns: 0, revenue: 0, streams: 0 };

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
        campaignPacingEfficiency,
        averageCostPerStream,
        averageCostPer1kStreams,
        revenue30d: effectiveRevenue,
        vendorCost30d: effectiveCost,
        grossMarginPct,
        vendorLiability: {
          approvedUnpaid,
          awaitingVerification,
        },
        flaggedCampaigns: flaggedCount,
        topPerformingVendors,
        monthOverMonthGrowth,
        quarterOverQuarterGrowth,
        campaignStatusDistribution,
        performanceBenchmarks,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

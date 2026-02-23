"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";

export interface OpsStatusData {
  campaignsRunningToday: number;
  campaignsNeedingAction: number;
  vendorsAwaitingApproval: number;
  vendorPayoutsPending: number;
  campaignsBelowPacing: number;
  vendorsUnpaid14d: number;
  campaignsNoPlaylistAdds72h: number;
}

export const useOpsStatus = () => {
  return useQuery({
    queryKey: ["ops-status"],
    queryFn: async (): Promise<OpsStatusData> => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

      const [
        campaignGroupsRes,
        spotifyCampaignsRes,
        vendorRequestsRes,
        allocationsRes,
        playlistsRes,
        vendorsRes,
      ] = await Promise.all([
        supabase.from("campaign_groups" as any).select("*"),
        supabase.from("spotify_campaigns" as any).select("*"),
        supabase.from("campaign_vendor_requests").select("*"),
        supabase.from("campaign_allocations_performance").select("*"),
        supabase.from("campaign_playlists" as any).select("*"),
        supabase.from("vendors").select("*"),
      ]);

      const campaignGroups: any[] = campaignGroupsRes.data || [];
      const songs: any[] = spotifyCampaignsRes.data || [];
      const vendorRequests: any[] = vendorRequestsRes.data || [];
      const allocations: any[] = allocationsRes.data || [];
      const playlists: any[] = playlistsRes.data || [];
      const vendors: any[] = vendorsRes.data || [];

      // Use spotify_campaigns as primary (like QuickActions)
      const campaigns = songs.length > 0 ? songs : campaignGroups;

      const normalizeStatus = (s: string | null) => (s || "").toLowerCase().trim();
      const activeStatuses = ["active", "in_progress", "running"];

      // Campaigns Running Today: any campaign with an active status.
      // If start_date exists, it must be <= today (hasn't started yet means not running).
      // If start_date is missing, we still count it — it's marked active in the system.
      const activeCampaigns = campaigns.filter(c => {
        if (!activeStatuses.includes(normalizeStatus(c.status))) return false;
        if (c.start_date && c.start_date > today) return false;
        return true;
      });
      const campaignsRunningToday = activeCampaigns.length;

      // Pacing check
      let campaignsBelowPacing = 0;
      for (const campaign of activeCampaigns) {
        const goal = parseFloat(campaign.stream_goal || campaign.total_goal) || 0;
        const duration = campaign.duration_days || 0;
        if (!campaign.start_date || !duration || !goal) continue;

        const startDate = new Date(campaign.start_date);
        const elapsedMs = now.getTime() - startDate.getTime();
        const elapsedDays = Math.max(1, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));
        const expectedStreams = (goal / duration) * Math.min(elapsedDays, duration);

        const campaignAllocations = allocations.filter(a => a.campaign_id === campaign.id);
        const actualStreams = campaignAllocations.reduce((sum, a) => sum + (a.actual_streams || 0), 0);

        const playlistStreams = playlists
          .filter((p: any) => p.campaign_id === campaign.id)
          .reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0);

        const bestStreams = Math.max(actualStreams, playlistStreams);
        if (expectedStreams > 0 && bestStreams / expectedStreams < 0.8) {
          campaignsBelowPacing++;
        }
      }

      // Campaigns with no playlist adds in last 72h
      const campaignIdsWithRecentAdds = new Set(
        playlists
          .filter((p: any) => {
            const addedDate = p.added_at || p.created_at;
            return addedDate && addedDate >= seventyTwoHoursAgo;
          })
          .map((p: any) => p.campaign_id)
      );
      const campaignsNoPlaylistAdds72h = activeCampaigns.filter(
        c => !campaignIdsWithRecentAdds.has(c.id)
      ).length;

      const campaignsNeedingAction = campaignsBelowPacing + campaignsNoPlaylistAdds72h;

      // Vendors Awaiting Approval
      const vendorsAwaitingApproval = vendorRequests.filter(
        r => normalizeStatus(r.status) === "pending"
      ).length;

      // Build vendor cost map for payout calculation
      const vendorCostMap = new Map<string, number>();
      vendors.forEach(v => {
        if (v.cost_per_1k_streams && v.cost_per_1k_streams > 0) {
          vendorCostMap.set(v.id, v.cost_per_1k_streams);
        }
      });

      // Vendor Payouts Pending ($): unpaid allocations, use vendor rate if cost_per_stream is missing
      const unpaidAllocations = allocations.filter(a => {
        const status = normalizeStatus(a.payment_status);
        return status !== "paid" && a.actual_streams && a.actual_streams > 0;
      });
      const vendorPayoutsPending = unpaidAllocations.reduce((sum, a) => {
        if (a.cost_per_stream && a.cost_per_stream > 0) {
          return sum + a.cost_per_stream * (a.actual_streams || 0);
        }
        const vendorRate = vendorCostMap.get(a.vendor_id) || 0;
        return sum + ((a.actual_streams || 0) / 1000) * vendorRate;
      }, 0);

      // Vendors unpaid > 14 days
      const vendorsUnpaid14d = new Set(
        allocations
          .filter(a => {
            const status = normalizeStatus(a.payment_status);
            if (status === "paid") return false;
            const completedAt = a.completed_at;
            return completedAt && completedAt < fourteenDaysAgo;
          })
          .map(a => a.vendor_id)
      ).size;

      return {
        campaignsRunningToday,
        campaignsNeedingAction,
        vendorsAwaitingApproval,
        vendorPayoutsPending,
        campaignsBelowPacing,
        vendorsUnpaid14d,
        campaignsNoPlaylistAdds72h,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
};

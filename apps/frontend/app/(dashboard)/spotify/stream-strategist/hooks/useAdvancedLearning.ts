"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export interface AlgorithmicLiftData {
  liftRate: number;
  liftStreams: number;
  baselineStreams: number;
  windowDays: number;
  campaignsAnalyzed: number;
  trend: 'up' | 'down' | 'flat';
}

export interface TopPlaylist {
  playlistId: string;
  playlistName: string;
  vendorName: string;
  avgStreamsDelivered: number;
  algorithmicLiftCorrelation: number;
  campaignSuccessRate: number;
  campaignCount: number;
}

export interface VendorReliabilitySummary {
  vendorId: string;
  name: string;
  campaignsOnPacePercent: number;
  avgDeliveryVariance: number;
  avgRampDays: number;
  totalCampaigns: number;
  trend: 'improving' | 'declining' | 'stable';
  reliabilityScore: number;
}

export interface CampaignIntelligenceData {
  algorithmicLift: AlgorithmicLiftData;
  topPlaylists: TopPlaylist[];
  vendorReliability: VendorReliabilitySummary[];
}

export function useCampaignIntelligence() {
  return useQuery({
    queryKey: ['campaign-intelligence'],
    queryFn: async (): Promise<CampaignIntelligenceData> => {
      const [
        perfResult,
        vendorResult,
        playlistsResult,
        vendorsResult,
        scResult,
        cgResult,
      ] = await Promise.all([
        supabase
          .from('campaign_allocations_performance')
          .select('*, playlists(name, genres), vendors(name), campaigns(name, status, stream_goal)')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('vendor_reliability_scores')
          .select('*, vendors(name)')
          .order('last_updated', { ascending: false }),
        supabase
          .from('campaign_playlists' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('vendors')
          .select('id, name'),
        supabase
          .from('spotify_campaigns' as any)
          .select('id, campaign_group_id, campaign'),
        supabase
          .from('campaign_groups' as any)
          .select('id, name'),
      ]);

      const performanceData = perfResult.data || [];
      const vendorReliability = vendorResult.data || [];
      const campaignPlaylists: any[] = playlistsResult.data || [];
      const vendorsList: any[] = vendorsResult.data || [];
      const spotifyCampaigns: any[] = (scResult.data as any[]) || [];
      const campaignGroupsList: any[] = (cgResult.data as any[]) || [];

      const vendorNameMap = new Map(vendorsList.map((v: any) => [v.id, v.name]));

      // Build bridge: spotify_campaigns.id → campaign_group_id for campaign counting
      // Step 1: direct campaign_group_id link
      const songToGroupMap = new Map<string, string>();
      spotifyCampaigns.forEach((sc: any) => {
        if (sc.campaign_group_id) {
          songToGroupMap.set(String(sc.id), sc.campaign_group_id);
        }
      });
      // Step 2: for songs without campaign_group_id, match by name
      const cgNameToId = new Map<string, string>();
      campaignGroupsList.forEach((cg: any) => {
        if (cg.name) cgNameToId.set(cg.name.toLowerCase().trim(), cg.id);
      });
      spotifyCampaigns.forEach((sc: any) => {
        if (sc.campaign_group_id) return;
        if (!sc.campaign) return;
        const matchedGroupId = cgNameToId.get(sc.campaign.toLowerCase().trim());
        if (matchedGroupId) {
          songToGroupMap.set(String(sc.id), matchedGroupId);
        }
      });


      const algorithmicLift = computeAlgorithmicLift(campaignPlaylists, songToGroupMap);
      const topPlaylists = rankTopPlaylists(campaignPlaylists, vendorNameMap, songToGroupMap);
      const vendorReliabilitySummary = buildVendorReliability(
        vendorReliability,
        performanceData,
        campaignPlaylists,
        vendorNameMap,
        songToGroupMap
      );

      return {
        algorithmicLift,
        topPlaylists,
        vendorReliability: vendorReliabilitySummary,
      };
    },
    staleTime: 15 * 60 * 1000,
  });
}

function computeAlgorithmicLift(
  campaignPlaylists: any[],
  songToGroupMap: Map<string, string>
): AlgorithmicLiftData {
  if (!campaignPlaylists.length) {
    return {
      liftRate: 0,
      liftStreams: 0,
      baselineStreams: 0,
      windowDays: 28,
      campaignsAnalyzed: 0,
      trend: 'flat',
    };
  }

  const algorithmicPlaylists = campaignPlaylists.filter(p => p.is_algorithmic === true);
  const vendorPlaylists = campaignPlaylists.filter(p => p.vendor_id && !p.is_algorithmic && !p.is_organic);

  const algoStreams = algorithmicPlaylists.reduce((s, p) => s + (p.streams_28d || p.streams_12m || 0), 0);
  const vendorStreams = vendorPlaylists.reduce((s, p) => s + (p.streams_28d || p.streams_12m || 0), 0);

  const liftRate = vendorStreams > 0 ? algoStreams / vendorStreams : 0;

  // Count unique campaign groups (parent campaigns) using the bridge
  const groupIds = new Set<string>();
  campaignPlaylists.forEach(p => {
    if (!p.campaign_id) return;
    const groupId = songToGroupMap.get(String(p.campaign_id));
    if (groupId) groupIds.add(groupId);
    else groupIds.add(String(p.campaign_id));
  });

  const algo7d = algorithmicPlaylists.reduce((s, p) => s + (p.streams_7d || 0), 0);
  const algo28d = algorithmicPlaylists.reduce((s, p) => s + (p.streams_28d || 0), 0);
  const trend: 'up' | 'down' | 'flat' =
    algo28d > 0 && algo7d > algo28d * (7 / 28) * 1.2 ? 'up' :
    algo28d > 0 && algo7d < algo28d * (7 / 28) * 0.8 ? 'down' : 'flat';

  return {
    liftRate,
    liftStreams: Math.round(algoStreams),
    baselineStreams: Math.round(vendorStreams),
    windowDays: 28,
    campaignsAnalyzed: groupIds.size,
    trend,
  };
}

function rankTopPlaylists(
  campaignPlaylists: any[],
  vendorNameMap: Map<string, string>,
  songToGroupMap: Map<string, string>
): TopPlaylist[] {
  const vendorPlaylists = campaignPlaylists.filter(p => p.vendor_id && !p.is_algorithmic && !p.is_organic);

  const playlistMap = new Map<string, {
    name: string;
    vendorName: string;
    totalStreams: number;
    campaignGroupIds: Set<string>;
  }>();

  vendorPlaylists.forEach(record => {
    const key = record.playlist_name || 'Unknown';
    const existing = playlistMap.get(key) || {
      name: key,
      vendorName: vendorNameMap.get(record.vendor_id) || 'Unknown',
      totalStreams: 0,
      campaignGroupIds: new Set<string>(),
    };

    existing.totalStreams += record.streams_12m || record.streams_28d || 0;
    if (record.campaign_id) {
      const groupId = songToGroupMap.get(String(record.campaign_id)) || String(record.campaign_id);
      existing.campaignGroupIds.add(groupId);
    }

    playlistMap.set(key, existing);
  });

  const algorithmicPlaylists = campaignPlaylists.filter(p => p.is_algorithmic === true);
  const totalAlgoStreams = algorithmicPlaylists.reduce((s, p) => s + (p.streams_12m || 0), 0);
  const totalVendorStreams = vendorPlaylists.reduce((s, p) => s + (p.streams_12m || 0), 0);
  const globalAlgoRatio = totalVendorStreams > 0 ? totalAlgoStreams / totalVendorStreams : 0;

  return Array.from(playlistMap.entries())
    .map(([playlistName, data]) => ({
      playlistId: playlistName,
      playlistName: data.name,
      vendorName: data.vendorName,
      avgStreamsDelivered: data.campaignGroupIds.size > 0
        ? Math.round(data.totalStreams / data.campaignGroupIds.size)
        : Math.round(data.totalStreams),
      algorithmicLiftCorrelation: globalAlgoRatio,
      campaignSuccessRate: data.totalStreams > 1000 ? 0.8 : data.totalStreams > 100 ? 0.5 : 0.2,
      campaignCount: data.campaignGroupIds.size || 1,
    }))
    .sort((a, b) => b.avgStreamsDelivered - a.avgStreamsDelivered)
    .slice(0, 15);
}

function buildVendorReliability(
  vendorScores: any[],
  performanceData: any[],
  campaignPlaylists: any[],
  vendorNameMap: Map<string, string>,
  songToGroupMap: Map<string, string>
): VendorReliabilitySummary[] {
  const vendorPlaylists = campaignPlaylists.filter(p => p.vendor_id && !p.is_algorithmic && !p.is_organic);

  const vendorStreamMap = new Map<string, {
    totalStreams: number;
    campaignGroupIds: Set<string>;
    playlistCount: number;
  }>();

  vendorPlaylists.forEach(record => {
    const vid = record.vendor_id;
    if (!vid) return;
    const existing = vendorStreamMap.get(vid) || { totalStreams: 0, campaignGroupIds: new Set(), playlistCount: 0 };
    existing.totalStreams += record.streams_12m || record.streams_28d || 0;
    if (record.campaign_id) {
      const groupId = songToGroupMap.get(String(record.campaign_id)) || String(record.campaign_id);
      existing.campaignGroupIds.add(groupId);
    }
    existing.playlistCount += 1;
    vendorStreamMap.set(vid, existing);
  });

  const vendorPerfMap = new Map<string, { onPace: number; total: number; deliveryVariances: number[] }>();
  performanceData.forEach(record => {
    const vid = record.vendor_id;
    if (!vid) return;
    const existing = vendorPerfMap.get(vid) || { onPace: 0, total: 0, deliveryVariances: [] };
    existing.total += 1;
    const allocated = record.allocated_streams || 0;
    const actual = record.actual_streams || 0;
    if (allocated > 0 && actual > 0) {
      const variance = (actual - allocated) / allocated;
      existing.deliveryVariances.push(variance);
      if (variance >= -0.1) existing.onPace += 1;
    }
    vendorPerfMap.set(vid, existing);
  });

  if (vendorScores.length > 0) {
    return vendorScores.map(vendor => {
      const vid = vendor.vendor_id;
      const perf = vendorPerfMap.get(vid);
      const cpData = vendorStreamMap.get(vid);
      const deliveryVariances = perf?.deliveryVariances || [];
      const avgVariance = deliveryVariances.length > 0
        ? deliveryVariances.reduce((s, v) => s + v, 0) / deliveryVariances.length
        : 0;

      const consistency = vendor.delivery_consistency || 0.5;
      const trend: 'improving' | 'declining' | 'stable' =
        consistency > 0.8 ? 'improving' : consistency < 0.6 ? 'declining' : 'stable';

      const totalStreams = cpData?.totalStreams || 0;
      const campaignCount = cpData?.campaignGroupIds.size || perf?.total || 0;

      return {
        vendorId: vid,
        name: vendor.vendors?.name || vendorNameMap.get(vid) || `Vendor ${vid.substring(0, 8)}`,
        campaignsOnPacePercent: perf && perf.total > 0 && perf.deliveryVariances.length > 0
          ? (perf.onPace / perf.total) * 100
          : totalStreams > 0 ? 75 : 0,
        avgDeliveryVariance: avgVariance,
        avgRampDays: vendor.avg_ramp_days || 3,
        totalCampaigns: campaignCount,
        trend,
        reliabilityScore: vendor.quality_score || 0.5,
      };
    }).sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  }

  return Array.from(vendorStreamMap.entries())
    .map(([vendorId, data]) => ({
      vendorId,
      name: vendorNameMap.get(vendorId) || `Vendor ${vendorId.substring(0, 8)}`,
      campaignsOnPacePercent: data.totalStreams > 0 ? 75 : 0,
      avgDeliveryVariance: 0,
      avgRampDays: 3,
      totalCampaigns: data.campaignGroupIds.size,
      trend: 'stable' as const,
      reliabilityScore: data.totalStreams > 10000 ? 0.8 : data.totalStreams > 1000 ? 0.6 : 0.4,
    }))
    .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
    .slice(0, 15);
}

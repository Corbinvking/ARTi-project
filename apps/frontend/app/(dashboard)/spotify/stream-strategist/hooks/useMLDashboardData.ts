"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export interface EarlyWarningCampaign {
  campaignId: string;
  campaignName: string;
  issue: 'below_pace' | 'plateau' | 'vendor_drop';
  severity: 'critical' | 'warning' | 'info';
  dailyStreams: number;
  requiredPace: number;
  streamGoal: number;
  daysRemaining: number;
  message: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'pacing_risk' | 'vendor_underperformance' | 'algorithmic_opportunity' | 'momentum_opportunity';
  campaignName: string;
  campaignId: string;
  issueDetected: string;
  recommendedAction: string;
  confidence: 'high' | 'medium' | 'low';
  createdAt: Date;
}

// Bridge: maps campaign_playlists (integer campaign_id) → campaign_groups (UUID) via spotify_campaigns
async function buildCampaignBridge() {
  const [cpResult, scResult, cgResult] = await Promise.all([
    supabase
      .from('campaign_playlists' as any)
      .select('campaign_id, vendor_id, playlist_name, streams_12m, streams_28d, streams_7d, is_algorithmic, is_organic')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('spotify_campaigns' as any)
      .select('id, campaign_group_id, campaign'),
    supabase
      .from('campaign_groups' as any)
      .select('id, name, total_goal, status, start_date, end_date'),
  ]);

  const campaignPlaylists: any[] = (cpResult.data as any[]) || [];
  const spotifyCampaigns: any[] = (scResult.data as any[]) || [];
  const campaignGroups: any[] = (cgResult.data as any[]) || [];

  // spotify_campaigns.id (integer) → campaign_group_id (UUID)
  // Step 1: direct campaign_group_id link
  const songToGroupMap = new Map<string, string>();
  spotifyCampaigns.forEach((sc: any) => {
    if (sc.campaign_group_id) {
      songToGroupMap.set(String(sc.id), sc.campaign_group_id);
    }
  });
  // Step 2: for songs without campaign_group_id, match by name to campaign_groups
  const cgNameToId = new Map<string, string>();
  campaignGroups.forEach((cg: any) => {
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

  // Aggregate campaign_playlists streams by campaign_group_id
  const cpByGroup = new Map<string, { vendorStreams: number; algoStreams: number }>();
  campaignPlaylists.forEach((p: any) => {
    const songId = String(p.campaign_id);
    const groupId = songToGroupMap.get(songId);
    if (!groupId) return;

    const streams = p.streams_12m || p.streams_28d || 0;
    const existing = cpByGroup.get(groupId) || { vendorStreams: 0, algoStreams: 0 };

    if (p.is_algorithmic) {
      existing.algoStreams += streams;
    } else if (p.vendor_id && !p.is_organic) {
      existing.vendorStreams += streams;
    }
    cpByGroup.set(groupId, existing);
  });

  return { campaignPlaylists, spotifyCampaigns, campaignGroups, songToGroupMap, cpByGroup };
}

export function useEarlyWarnings() {
  return useQuery({
    queryKey: ['early-warnings'],
    queryFn: async (): Promise<EarlyWarningCampaign[]> => {
      const [alertsResult, { campaignGroups, cpByGroup }] = await Promise.all([
        supabase
          .from('performance_alerts')
          .select('*, campaigns(name, stream_goal, start_date, end_date)')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(20),
        buildCampaignBridge(),
      ]);

      const performanceAlerts = alertsResult.data;


      const warnings: EarlyWarningCampaign[] = [];

      (performanceAlerts || []).forEach(alert => {
        const campaign = alert.campaigns;
        if (!campaign) return;

        const now = new Date();
        const endDate = campaign.end_date ? new Date(campaign.end_date) : new Date(now.getTime() + 30 * 86400000);
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000));

        warnings.push({
          campaignId: alert.campaign_id,
          campaignName: campaign.name || 'Unknown Campaign',
          issue: categorizeAlertType(alert.alert_type),
          severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'warning' : 'info',
          dailyStreams: 0,
          requiredPace: campaign.stream_goal && daysRemaining > 0 ? campaign.stream_goal / daysRemaining : 0,
          streamGoal: campaign.stream_goal || 0,
          daysRemaining,
          message: alert.message || alert.alert_type,
        });
      });

      // Check campaign_groups for pacing issues -- only campaigns with delivery data
      const activeStatuses = ['active', 'in_progress', 'running'];
      const now = new Date();
      campaignGroups.forEach((cg: any) => {
        if (!activeStatuses.includes((cg.status || '').toLowerCase())) return;
        const goal = cg.total_goal || 0;
        if (goal <= 0) return;

        const cpData = cpByGroup.get(cg.id);
        if (!cpData) return; // Skip campaigns without delivery data
        const actualStreams = cpData.vendorStreams + cpData.algoStreams;
        if (actualStreams === 0) return;
        const endDate = cg.end_date ? new Date(cg.end_date) : new Date(now.getTime() + 30 * 86400000);
        const startDate = cg.start_date ? new Date(cg.start_date) : now;
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000));
        const totalDuration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
        const elapsedDays = Math.max(1, totalDuration - daysRemaining);
        const expectedByNow = (goal / totalDuration) * elapsedDays;

        if (expectedByNow > 0 && actualStreams < expectedByNow * 0.7) {
          const alreadyListed = warnings.some(w => w.campaignId === cg.id || w.campaignName === cg.name);
          if (!alreadyListed) {
            const pct = Math.round((actualStreams / expectedByNow) * 100);
            warnings.push({
              campaignId: cg.id,
              campaignName: cg.name || 'Unknown',
              issue: 'below_pace',
              severity: pct < 50 ? 'critical' : 'warning',
              dailyStreams: 0,
              requiredPace: daysRemaining > 0 ? (goal - actualStreams) / daysRemaining : 0,
              streamGoal: goal,
              daysRemaining,
              message: `Delivering ${pct}% of expected streams (${actualStreams.toLocaleString()} of ${Math.round(expectedByNow).toLocaleString()} expected)`,
            });
          }
        }
      });

      return warnings.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useOptimizationSuggestions() {
  return useQuery({
    queryKey: ['optimization-suggestions'],
    queryFn: async (): Promise<OptimizationSuggestion[]> => {
      const [{ data: vendorScores }, bridge] = await Promise.all([
        supabase
          .from('vendor_reliability_scores')
          .select('*, vendors(name)')
          .order('last_updated', { ascending: false }),
        buildCampaignBridge(),
      ]);

      const { campaignPlaylists, campaignGroups, songToGroupMap, cpByGroup } = bridge;

      const suggestions: OptimizationSuggestion[] = [];
      const now = new Date();
      const activeStatuses = ['active', 'in_progress', 'running'];

      // Build vendor-level stream totals from campaign_playlists
      const vendorStreamTotals = new Map<string, { total: number; algoTotal: number; vendorTotal: number; groupIds: Set<string> }>();
      campaignPlaylists.forEach((p: any) => {
        const vid = p.vendor_id;
        if (!vid) return;
        const existing = vendorStreamTotals.get(vid) || { total: 0, algoTotal: 0, vendorTotal: 0, groupIds: new Set() };
        const streams = p.streams_12m || p.streams_28d || 0;
        existing.total += streams;
        if (p.is_algorithmic) existing.algoTotal += streams;
        else if (!p.is_organic) existing.vendorTotal += streams;
        const groupId = songToGroupMap.get(String(p.campaign_id));
        if (groupId) existing.groupIds.add(groupId);
        vendorStreamTotals.set(vid, existing);
      });

      // Pacing Risk + Algorithmic/Momentum Opportunities from campaign_groups
      campaignGroups.forEach((cg: any) => {
        if (!activeStatuses.includes((cg.status || '').toLowerCase())) return;
        const goal = cg.total_goal || 0;
        if (goal <= 0) return;

        const cpData = cpByGroup.get(cg.id);
        if (!cpData) return;
        const totalActual = cpData.vendorStreams + cpData.algoStreams;

        const startDate = cg.start_date ? new Date(cg.start_date) : now;
        const endDate = cg.end_date ? new Date(cg.end_date) : new Date(now.getTime() + 30 * 86400000);
        const totalDuration = Math.max(1, (endDate.getTime() - startDate.getTime()) / 86400000);
        const elapsed = Math.max(1, (now.getTime() - startDate.getTime()) / 86400000);
        const expectedByNow = (goal / totalDuration) * elapsed;

        // Pacing Risk
        if (expectedByNow > 0 && totalActual < expectedByNow * 0.75) {
          suggestions.push({
            id: `pacing-${cg.id}`,
            type: 'pacing_risk',
            campaignName: cg.name || 'Unknown',
            campaignId: cg.id,
            issueDetected: `Campaign at ${Math.round((totalActual / expectedByNow) * 100)}% of expected pace (${totalActual.toLocaleString()} of ${Math.round(expectedByNow).toLocaleString()} expected)`,
            recommendedAction: 'Consider adding playlists or checking current placement positioning with vendors.',
            confidence: totalActual < expectedByNow * 0.5 ? 'high' : 'medium',
            createdAt: now,
          });
        }

        // Algorithmic Opportunity: vendor streams good but algo streams flat
        if (cpData.vendorStreams > 1000 && cpData.algoStreams < cpData.vendorStreams * 0.1) {
          suggestions.push({
            id: `algo-opp-${cg.id}`,
            type: 'algorithmic_opportunity',
            campaignName: cg.name || 'Unknown',
            campaignId: cg.id,
            issueDetected: `Vendor streams at ${cpData.vendorStreams.toLocaleString()} but algorithmic streams only ${cpData.algoStreams.toLocaleString()}`,
            recommendedAction: 'Test higher-engagement playlists to improve algorithmic pickup.',
            confidence: 'medium',
            createdAt: now,
          });
        }

        // Momentum Opportunity: algo streams growing rapidly
        if (cpData.algoStreams > cpData.vendorStreams * 0.5 && cpData.algoStreams > 500) {
          suggestions.push({
            id: `momentum-${cg.id}`,
            type: 'momentum_opportunity',
            campaignName: cg.name || 'Unknown',
            campaignId: cg.id,
            issueDetected: `Algorithmic streams (${cpData.algoStreams.toLocaleString()}) are ${Math.round((cpData.algoStreams / Math.max(cpData.vendorStreams, 1)) * 100)}% of vendor streams -- strong algorithmic momentum.`,
            recommendedAction: 'Recommend increasing playlist exposure to capitalize on algorithmic momentum.',
            confidence: cpData.algoStreams > cpData.vendorStreams ? 'high' : 'medium',
            createdAt: now,
          });
        }
      });

      // Vendor Underperformance from vendor_reliability_scores
      const vendorScoreMap = new Map((vendorScores || []).map((v: any) => [v.vendor_id, v]));
      vendorStreamTotals.forEach((data, vendorId) => {
        const score = vendorScoreMap.get(vendorId);
        if (!score) return;
        const historicalQuality = score.quality_score || 0.8;
        if (historicalQuality > 0 && data.vendorTotal > 0 && data.groupIds.size >= 2) {
          const avgPerCampaign = data.vendorTotal / data.groupIds.size;
          if (avgPerCampaign < 500 && historicalQuality > 0.7) {
            suggestions.push({
              id: `vendor-underperf-${vendorId}`,
              type: 'vendor_underperformance',
              campaignName: `${score.vendors?.name || 'Vendor'} (${data.groupIds.size} campaigns)`,
              campaignId: '',
              issueDetected: `${score.vendors?.name || 'Vendor'} averaging ${Math.round(avgPerCampaign).toLocaleString()} streams per campaign across ${data.groupIds.size} campaigns`,
              recommendedAction: 'Consider reallocating remaining streams to higher-performing vendors.',
              confidence: avgPerCampaign < 200 ? 'high' : 'medium',
              createdAt: now,
            });
          }
        }
      });

      return suggestions.sort((a, b) => {
        const confidenceOrder = { high: 0, medium: 1, low: 2 };
        const typeOrder = { pacing_risk: 0, vendor_underperformance: 1, algorithmic_opportunity: 2, momentum_opportunity: 3 };
        return confidenceOrder[a.confidence] - confidenceOrder[b.confidence] || typeOrder[a.type] - typeOrder[b.type];
      });
    },
    staleTime: 10 * 60 * 1000,
  });
}

function categorizeAlertType(alertType: string): 'below_pace' | 'plateau' | 'vendor_drop' {
  const lower = (alertType || '').toLowerCase();
  if (lower.includes('vendor') || lower.includes('reliability')) return 'vendor_drop';
  if (lower.includes('plateau') || lower.includes('stall')) return 'plateau';
  return 'below_pace';
}

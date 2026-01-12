"use client"

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";

export interface PerformanceAlertsData {
  alerts: Array<{
    id: string;
    campaignId: string;
    campaignName: string;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    threshold?: string;
    currentValue?: string;
    timeAgo: string;
    isResolved: boolean;
  }>;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
  };
  alertRules: Array<{
    id: string;
    name: string;
    condition: string;
    isActive: boolean;
    triggeredCount: number;
  }>;
}

export const usePerformanceAlerts = () => {
  return useQuery({
    queryKey: ["performance-alerts"],
    queryFn: async (): Promise<PerformanceAlertsData> => {
      console.log('🚨 [Alerts] Fetching real campaign alerts...');

      // Get active campaign groups
      const { data: campaignGroups, error: campaignsError } = await supabase
        .from("campaign_groups")
        .select("*")
        .in('status', ['Active', 'active', 'Running', 'running']);

      if (campaignsError) {
        console.error('❌ [Alerts] Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }

      console.log(`📊 [Alerts] Found ${campaignGroups?.length || 0} active campaigns`);

      // Get individual campaign data (for stream goals)
      const { data: spotifyCampaigns, error: spotifyError } = await supabase
        .from("spotify_campaigns")
        .select("*");

      if (spotifyError) {
        console.error('❌ [Alerts] Error fetching spotify campaigns:', spotifyError);
      }

      // Get campaign playlist performance data
      const { data: campaignPlaylists, error: playlistsError } = await supabase
        .from("campaign_playlists")
        .select("*");

      if (playlistsError) {
        console.error('❌ [Alerts] Error fetching campaign playlists:', playlistsError);
      }

      const alerts: PerformanceAlertsData['alerts'] = [];
      let resolvedCount = 0;

      // Analyze each campaign for issues
      for (const campaign of campaignGroups || []) {
        // Get campaign songs
        const songs = spotifyCampaigns?.filter(sc => sc.campaign_group_id === campaign.id) || [];
        
        if (songs.length === 0) continue;

        // Calculate total goal and current streams
        const totalGoal = songs.reduce((sum, song) => sum + (parseInt(song.stream_goal) || 0), 0);
        
        // Get performance data for this campaign's songs
        const songIds = songs.map(s => s.id);
        const performanceData = campaignPlaylists?.filter(cp => songIds.includes(cp.campaign_id)) || [];
        
        const totalCurrentStreams = performanceData.reduce((sum, cp) => sum + (cp.streams_12m || 0), 0);
        const algoStreams = performanceData
          .filter(cp => cp.is_algorithmic)
          .reduce((sum, cp) => sum + (cp.streams_12m || 0), 0);

        const progress = totalGoal > 0 ? (totalCurrentStreams / totalGoal) : 0;
        const lastScraped = performanceData.length > 0 
          ? new Date(Math.max(...performanceData.map(p => new Date(p.last_scraped || p.created_at).getTime())))
          : null;

        // Calculate days since campaign start
        const startDate = campaign.start_date ? new Date(campaign.start_date) : new Date(campaign.created_at);
        const daysSinceStart = differenceInDays(new Date(), startDate);
        const expectedProgress = daysSinceStart > 0 ? Math.min(daysSinceStart / 60, 1) : 0; // Assuming 60-day campaigns

        // ALERT 1: Campaign behind schedule (CRITICAL)
        if (daysSinceStart >= 14 && progress < 0.15) {
          alerts.push({
            id: `pace-critical-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'pacing',
            severity: 'critical',
            message: `Campaign severely behind schedule - only ${(progress * 100).toFixed(1)}% complete after ${daysSinceStart} days`,
            threshold: '15% after 2 weeks',
            currentValue: `${(progress * 100).toFixed(1)}%`,
            timeAgo: 'Active',
            isResolved: false
          });
        }
        // ALERT 2: Campaign not on pace to meet goal (HIGH)
        else if (daysSinceStart >= 7 && progress < expectedProgress * 0.5) {
          alerts.push({
            id: `pace-high-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'pacing',
            severity: 'high',
            message: `Campaign not on pace to meet goal - ${(progress * 100).toFixed(1)}% vs expected ${(expectedProgress * 100).toFixed(1)}%`,
            threshold: `${(expectedProgress * 100).toFixed(1)}%`,
            currentValue: `${(progress * 100).toFixed(1)}%`,
            timeAgo: 'Active',
            isResolved: false
          });
        }
        // ALERT 3: Campaign slightly behind (MEDIUM)
        else if (daysSinceStart >= 7 && progress < expectedProgress * 0.75) {
          alerts.push({
            id: `pace-medium-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'pacing',
            severity: 'medium',
            message: `Campaign pacing slightly behind expected progress`,
            threshold: `${(expectedProgress * 100).toFixed(1)}%`,
            currentValue: `${(progress * 100).toFixed(1)}%`,
            timeAgo: 'Active',
            isResolved: false
          });
        }

        // ALERT 4: No recent scraper data (HIGH)
        if (lastScraped) {
          const hoursSinceScraped = differenceInHours(new Date(), lastScraped);
          if (hoursSinceScraped > 48) {
            alerts.push({
              id: `stale-data-${campaign.id}`,
              campaignId: campaign.id,
              campaignName: campaign.name,
              alertType: 'data',
              severity: 'high',
              message: `No scraper data for ${Math.floor(hoursSinceScraped / 24)} days - metrics may be outdated`,
              threshold: '48 hours',
              currentValue: `${Math.floor(hoursSinceScraped / 24)} days ago`,
              timeAgo: formatDistanceToNow(lastScraped, { addSuffix: true }),
              isResolved: false
            });
          }
        } else if (daysSinceStart > 1) {
          alerts.push({
            id: `no-data-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'data',
            severity: 'critical',
            message: 'No scraper data available for this campaign',
            timeAgo: 'Active',
            isResolved: false
          });
        }

        // ALERT 5: Low algorithmic performance (MEDIUM)
        const algoPercentage = totalCurrentStreams > 0 ? (algoStreams / totalCurrentStreams) : 0;
        if (totalCurrentStreams > 1000 && algoPercentage < 0.1) {
          alerts.push({
            id: `algo-low-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'algorithmic',
            severity: 'medium',
            message: 'Low algorithmic playlist engagement - potential to improve reach',
            threshold: '10%',
            currentValue: `${(algoPercentage * 100).toFixed(1)}%`,
            timeAgo: 'Active',
            isResolved: false
          });
        }

        // ALERT 6: High cost per stream warning (MEDIUM)
        const totalCost = songs.reduce((sum, song) => sum + (parseFloat(song.sale_price) || 0), 0);
        const costPerStream = totalCurrentStreams > 0 ? totalCost / totalCurrentStreams : 0;
        if (totalCurrentStreams > 100 && costPerStream > 0.10) {
          alerts.push({
            id: `cost-high-${campaign.id}`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            alertType: 'cost',
            severity: 'medium',
            message: 'Cost per stream higher than recommended threshold',
            threshold: '$0.10',
            currentValue: `$${costPerStream.toFixed(3)}`,
            timeAgo: 'Active',
            isResolved: false
          });
        }

        // Count campaigns that are performing well (for resolved count)
        if (progress >= expectedProgress * 0.9 && progress > 0) {
          resolvedCount++;
        }
      }

      console.log(`🚨 [Alerts] Generated ${alerts.length} alerts from ${campaignGroups?.length || 0} campaigns`);

      // Calculate summary
      const summary = {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
        resolved: resolvedCount
      };

      // Calculate alert rule trigger counts from actual alerts
      const pacingAlerts = alerts.filter(a => a.alertType === 'pacing').length;
      const dataAlerts = alerts.filter(a => a.alertType === 'data').length;
      const algoAlerts = alerts.filter(a => a.alertType === 'algorithmic').length;
      const costAlerts = alerts.filter(a => a.alertType === 'cost').length;

      // Alert rules configuration
      const alertRules = [
        {
          id: '1',
          name: 'Campaign Behind Schedule',
          condition: 'When campaign progress < expected progress based on days active',
          isActive: true,
          triggeredCount: pacingAlerts
        },
        {
          id: '2',
          name: 'Stale Scraper Data',
          condition: 'When campaign data not updated in 48+ hours',
          isActive: true,
          triggeredCount: dataAlerts
        },
        {
          id: '3',
          name: 'Low Algorithmic Performance',
          condition: 'When algorithmic streams < 10% of total streams',
          isActive: true,
          triggeredCount: algoAlerts
        },
        {
          id: '4',
          name: 'High Cost Per Stream',
          condition: 'When cost per stream > $0.10',
          isActive: true,
          triggeredCount: costAlerts
        }
      ];

      return {
        alerts: alerts.sort((a, b) => {
          // Sort by severity: critical > high > medium > low
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
        summary,
        alertRules
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - alerts should be fresh
  });
};









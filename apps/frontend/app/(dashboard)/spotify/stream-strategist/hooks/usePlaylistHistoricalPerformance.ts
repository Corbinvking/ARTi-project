"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

interface PlaylistHistoricalPerformance {
  playlist_id: string;
  playlist_name: string;
  total_streams_12_months: number;
  avg_daily_streams: number;
  campaign_performance: Array<{
    campaign_id: string;
    campaign_name: string;
    streams_contributed: number;
    performance_score: number;
  }>;
}

interface CampaignPaceData {
  campaign_id: string;
  campaign_name: string;
  days_elapsed: number;
  days_remaining: number;
  current_streams: number;
  goal_streams: number;
  required_daily_pace: number;
  current_daily_pace: number;
  is_on_track: boolean;
  projected_completion_percentage: number;
}

export function usePlaylistHistoricalPerformance(playlistIds?: string[]) {
  return useQuery({
    queryKey: ['playlist-historical-performance', playlistIds],
    queryFn: async (): Promise<PlaylistHistoricalPerformance[]> => {
      if (!playlistIds || playlistIds.length === 0) return [];

      // Get 12-month historical data for playlists
      const { data: performanceEntries, error: performanceError } = await supabase
        .from('performance_entries')
        .select('playlist_id, daily_streams, date_recorded, campaign_id')
        .in('playlist_id', playlistIds)
        .gte('date_recorded', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date_recorded', { ascending: false });

      if (performanceError) throw performanceError;

      // Get playlist names separately
      const { data: playlists } = await supabase
        .from('playlists')
        .select('id, name')
        .in('id', playlistIds);

      const playlistLookup = new Map(playlists?.map(p => [p.id, p]) || []);

      // Get campaign allocation performance for these playlists
      const { data: allocations, error: allocError } = await supabase
        .from('campaign_allocations_performance')
        .select('playlist_id, campaign_id, actual_streams, performance_score')
        .in('playlist_id', playlistIds);

      if (allocError) throw allocError;

      // Get campaign names separately
      const campaignIds = [...new Set(allocations?.map(a => a.campaign_id) || [])];
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds);

      const campaignLookup = new Map(campaigns?.map(c => [c.id, c]) || []);

      // Group data by playlist
      const playlistMap = new Map<string, PlaylistHistoricalPerformance>();

      // Initialize playlists
      for (const playlistId of playlistIds) {
        if (!playlistMap.has(playlistId)) {
          const playlist = playlistLookup.get(playlistId);
          playlistMap.set(playlistId, {
            playlist_id: playlistId,
            playlist_name: playlist?.name || 'Unknown Playlist',
            total_streams_12_months: 0,
            avg_daily_streams: 0,
            campaign_performance: []
          });
        }
      }

      // Process performance entries
      performanceEntries?.forEach(entry => {
        const playlist = playlistMap.get(entry.playlist_id);
        if (playlist) {
          playlist.total_streams_12_months += entry.daily_streams;
        }
      });

      // Process campaign allocations
      allocations?.forEach(allocation => {
        const playlist = playlistMap.get(allocation.playlist_id);
        const campaign = campaignLookup.get(allocation.campaign_id);
        if (playlist) {
          playlist.campaign_performance.push({
            campaign_id: allocation.campaign_id,
            campaign_name: campaign?.name || 'Unknown Campaign',
            streams_contributed: allocation.actual_streams,
            performance_score: allocation.performance_score || 0
          });
        }
      });

      // Calculate average daily streams (12 months = 365 days)
      Array.from(playlistMap.values()).forEach(playlist => {
        playlist.avg_daily_streams = Math.round(playlist.total_streams_12_months / 365);
      });

      return Array.from(playlistMap.values());
    },
    enabled: !!playlistIds && playlistIds.length > 0
  });
}

export function useCampaignPaceAnalysis(campaignIds?: string[]) {
  return useQuery({
    queryKey: ['campaign-pace-analysis', campaignIds],
    queryFn: async (): Promise<CampaignPaceData[]> => {
      if (!campaignIds || campaignIds.length === 0) return [];

      // Get campaign details
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, stream_goal, start_date, duration_days')
        .in('id', campaignIds);

      if (campaignError) throw campaignError;

      // Get current performance for each campaign
      const { data: allocations, error: allocError } = await supabase
        .from('campaign_allocations_performance')
        .select('campaign_id, actual_streams')
        .in('campaign_id', campaignIds);

      if (allocError) throw allocError;

      const result: CampaignPaceData[] = [];

      campaigns?.forEach(campaign => {
        const currentStreams = allocations
          ?.filter(a => a.campaign_id === campaign.id)
          .reduce((sum, a) => sum + a.actual_streams, 0) || 0;

        const startDate = new Date(campaign.start_date);
        const currentDate = new Date();
        const daysElapsed = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const daysRemaining = Math.max(0, campaign.duration_days - daysElapsed);
        
        const requiredDailyPace = daysRemaining > 0 ? (campaign.stream_goal - currentStreams) / daysRemaining : 0;
        const currentDailyPace = daysElapsed > 0 ? currentStreams / daysElapsed : 0;
        
        const projectedTotal = currentStreams + (currentDailyPace * daysRemaining);
        const projectedCompletionPercentage = campaign.stream_goal > 0 ? (projectedTotal / campaign.stream_goal) * 100 : 0;

        result.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          days_elapsed: daysElapsed,
          days_remaining: daysRemaining,
          current_streams: currentStreams,
          goal_streams: campaign.stream_goal,
          required_daily_pace: Math.round(requiredDailyPace),
          current_daily_pace: Math.round(currentDailyPace),
          is_on_track: currentDailyPace >= requiredDailyPace * 0.8, // 80% threshold
          projected_completion_percentage: Math.round(projectedCompletionPercentage)
        });
      });

      return result;
    },
    enabled: !!campaignIds && campaignIds.length > 0
  });
}









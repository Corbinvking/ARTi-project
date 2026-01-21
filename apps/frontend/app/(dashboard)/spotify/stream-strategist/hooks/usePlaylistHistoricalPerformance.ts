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

      console.log('📊 usePlaylistHistoricalPerformance: Fetching data for', playlistIds.length, 'playlists');

      // Get playlist data including avg_daily_streams from playlists table
      const { data: playlists } = await supabase
        .from('playlists')
        .select('id, name, avg_daily_streams, spotify_id')
        .in('id', playlistIds);
      
      console.log('📊 Fetched', playlists?.length || 0, 'playlists from playlists table');

      const playlistLookup = new Map(playlists?.map(p => [p.id, p]) || []);
      
      // Get playlist names for matching with campaign_playlists
      const playlistNames = playlists?.map(p => p.name.toLowerCase()) || [];
      const playlistSpotifyIds = playlists?.map(p => (p as any).spotify_id).filter(Boolean) || [];

      // Get 12-month stream data from campaign_playlists (scraped data)
      // Match by playlist name since campaign_playlists doesn't have the same IDs
      const { data: campaignPlaylistData, error: cpError } = await supabase
        .from('campaign_playlists')
        .select('playlist_name, streams_12m, streams_7d, streams_24h, campaign_id, vendor_id')
        .order('updated_at', { ascending: false });

      if (cpError) {
        console.warn('Could not fetch campaign_playlists:', cpError);
      }

      // Get campaign names separately
      const campaignIds = [...new Set(campaignPlaylistData?.map(a => a.campaign_id) || [])];
      const { data: campaigns } = await supabase
        .from('spotify_campaigns')
        .select('id, campaign')
        .in('id', campaignIds);

      const campaignLookup = new Map(campaigns?.map(c => [c.id, { name: c.campaign }]) || []);

      // Group data by playlist
      const playlistMap = new Map<string, PlaylistHistoricalPerformance>();

      // Initialize playlists with data from playlists table
      for (const playlistId of playlistIds) {
        if (!playlistMap.has(playlistId)) {
          const playlist = playlistLookup.get(playlistId);
          // Estimate 12-month total from avg_daily_streams if available
          const estimatedTotal = (playlist?.avg_daily_streams || 0) * 365;
          playlistMap.set(playlistId, {
            playlist_id: playlistId,
            playlist_name: playlist?.name || 'Unknown Playlist',
            total_streams_12_months: estimatedTotal,
            avg_daily_streams: playlist?.avg_daily_streams || 0,
            campaign_performance: []
          });
        }
      }

      // Process campaign_playlists data - match by name and aggregate streams
      // Keep track of which campaign-playlist combos we've seen to avoid duplicates
      const seenCampaignPlaylists = new Set<string>();
      
      // Also track if we've found data for each playlist
      const playlistsWithData = new Set<string>();
      
      campaignPlaylistData?.forEach(cpData => {
        if (!cpData.playlist_name) return;
        
        // Find matching playlist by name (case-insensitive, trim whitespace)
        const normalizedCpName = cpData.playlist_name.toLowerCase().trim();
        const matchingPlaylist = playlists?.find(p => 
          p.name.toLowerCase().trim() === normalizedCpName
        );
        
        if (matchingPlaylist) {
          playlistsWithData.add(matchingPlaylist.id);
          const playlist = playlistMap.get(matchingPlaylist.id);
          if (playlist) {
            const campaignPlaylistKey = `${cpData.campaign_id}-${cpData.playlist_name}`;
            
            // Only count each campaign-playlist combo once (avoid duplicates)
            if (!seenCampaignPlaylists.has(campaignPlaylistKey)) {
              seenCampaignPlaylists.add(campaignPlaylistKey);
              
              // Use scraped streams_12m if available and higher than estimated
              if (cpData.streams_12m && cpData.streams_12m > 0) {
                // Take the max of scraped and estimated (in case we have partial data)
                playlist.total_streams_12_months = Math.max(
                  playlist.total_streams_12_months, 
                  cpData.streams_12m
                );
              }
              
              // Add campaign performance
              const campaign = campaignLookup.get(cpData.campaign_id);
              if (campaign) {
                playlist.campaign_performance.push({
                  campaign_id: cpData.campaign_id?.toString() || '',
                  campaign_name: campaign.name || 'Unknown Campaign',
                  streams_contributed: cpData.streams_12m || 0,
                  performance_score: 0
                });
              }
            }
          }
        }
      });

      // Recalculate avg_daily_streams from total if we got better data
      Array.from(playlistMap.values()).forEach(playlist => {
        if (playlist.total_streams_12_months > 0 && playlist.avg_daily_streams === 0) {
          playlist.avg_daily_streams = Math.round(playlist.total_streams_12_months / 365);
        }
      });

      const results = Array.from(playlistMap.values());
      const withData = results.filter(p => p.total_streams_12_months > 0);
      console.log('📊 Matched', playlistsWithData.size, 'playlists to campaign_playlists data');
      console.log('📊 Returning', results.length, 'playlists,', withData.length, 'with 12-month data');
      
      return results;
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









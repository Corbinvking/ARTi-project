"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export interface CampaignVendorResponse {
  id: string;
  campaign_id: string;
  vendor_id: string;
  playlist_ids: string[];
  status: 'pending' | 'approved' | 'rejected';
  response_notes?: string;
  requested_at: string;
  responded_at?: string;
  // Joined vendor data
  vendor?: {
    id: string;
    name: string;
  };
  // Joined playlist data
  playlists?: Array<{
    id: string;
    name: string;
    avg_daily_streams: number;
    follower_count?: number;
  }>;
}

// Hook to fetch vendor responses for a specific campaign (for admin/manager view)
export function useCampaignVendorResponses(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-vendor-responses', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_vendor_requests')
        .select(`
          *,
          vendor:vendor_id (
            id,
            name
          )
        `)
        .eq('campaign_id', campaignId)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Fetch playlist details for each response  
      const responsesWithPlaylists = await Promise.all(
        (data || []).map(async (response) => {
          const playlistIds = Array.isArray(response.playlist_ids) ? response.playlist_ids as string[] : [];
          if (playlistIds && playlistIds.length > 0) {
            const { data: playlists, error: playlistError } = await supabase
              .from('playlists')
              .select('id, name, avg_daily_streams, follower_count')
              .in('id', playlistIds);

            if (playlistError) {
              console.error('Error fetching playlists:', playlistError);
              return { ...response, playlists: [] };
            }

            return { ...response, playlists };
          }
          return { ...response, playlists: [] };
        })
      );

      return responsesWithPlaylists as unknown as CampaignVendorResponse[];
    },
    enabled: !!campaignId,
  });
}









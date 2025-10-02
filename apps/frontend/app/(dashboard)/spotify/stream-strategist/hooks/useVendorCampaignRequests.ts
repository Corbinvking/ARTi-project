"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

export interface VendorCampaignRequest {
  id: string;
  campaign_id: string;
  vendor_id: string;
  playlist_ids: string[];
  status: 'pending' | 'approved' | 'rejected';
  response_notes?: string;
  requested_at: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
  // Joined campaign data
  campaign?: {
    id: string;
    name: string;
    brand_name: string;
    track_name?: string;
    track_url: string;
    budget: number;
    start_date: string;
    duration_days: number;
    music_genres: string[];
    content_types: string[];
    territory_preferences: string[];
    post_types: string[];
    sub_genres?: string[];
    stream_goal?: number;
    creator_count: number;
  };
  // Joined playlist data
  playlists?: Array<{
    id: string;
    name: string;
    avg_daily_streams: number;
    follower_count?: number;
  }>;
}

export interface RespondToRequestData {
  requestId: string;
  status: 'approved' | 'rejected';
  response_notes?: string;
  playlist_ids?: string[];
}

// Hook to fetch vendor campaign requests for current vendor
export function useVendorCampaignRequests() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ['vendor-campaign-requests', user?.id ?? 'anon'],
    enabled: !!user && !loading,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // First get current user's vendor IDs
      const { data: vendorUsers, error: vendorError } = await supabase
        .from('vendor_users')
        .select('vendor_id')
        .eq('user_id', user!.id);

      if (vendorError) throw vendorError;
      
      const vendorIds = vendorUsers?.map(vu => vu.vendor_id) || [];
      if (vendorIds.length === 0) return [];

      // Fetch campaign vendor requests for current user's vendors (pending only)
      const { data: requests, error } = await supabase
        .from('campaign_vendor_requests')
        .select('*')
        .in('vendor_id', vendorIds)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Collect unique campaign IDs and fetch campaigns separately (no FK join available)
      const campaignIds = Array.from(new Set((requests || []).map((r: any) => r.campaign_id)));
      let campaignsMap: Record<string, any> = {};

      if (campaignIds.length > 0) {
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('id, name, brand_name, track_name, track_url, budget, start_date, duration_days, music_genres, content_types, territory_preferences, post_types, sub_genres, stream_goal, creator_count')
          .in('id', campaignIds);
        if (campaignsError) throw campaignsError;
        campaignsMap = (campaigns || []).reduce((acc: any, c: any) => { acc[c.id] = c; return acc; }, {});
      }

      // Fetch playlist details for each request and attach campaign data
      const requestsWithPlaylists = await Promise.all(
        (requests || []).map(async (request: any) => {
          const playlistIds = Array.isArray(request.playlist_ids) ? (request.playlist_ids as string[]) : [];
          let playlistsForRequest: any[] = [];

          if (playlistIds && playlistIds.length > 0) {
            const { data: playlists, error: playlistError } = await supabase
              .from('playlists')
              .select('id, name, avg_daily_streams, follower_count')
              .in('id', playlistIds);

            if (playlistError) {
              console.error('Error fetching playlists:', playlistError);
            } else {
              playlistsForRequest = playlists || [];
            }
          }

          return { 
            ...request, 
            campaign: campaignsMap[request.campaign_id],
            playlists: playlistsForRequest 
          };
        })
      );

      return requestsWithPlaylists as VendorCampaignRequest[];
    },
  });
}

// Hook to respond to campaign requests (approve/reject)
export function useRespondToVendorRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, status, response_notes, playlist_ids }: RespondToRequestData) => {
      // First, get the request details to access playlist_ids and campaign_id
      const { data: request, error: requestError } = await supabase
        .from('campaign_vendor_requests')
        .select('playlist_ids, campaign_id')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Determine which playlist IDs to use (provided ones or original ones)
      const playlistsToUse = playlist_ids || request.playlist_ids;

      // Update the request status and playlist selection
      const { data, error } = await supabase
        .from('campaign_vendor_requests')
        .update({
          status,
          response_notes,
          playlist_ids: playlistsToUse,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved, add playlists to campaign's selected_playlists (only if playlists selected)
      if (status === 'approved' && playlistsToUse && Array.isArray(playlistsToUse) && playlistsToUse.length > 0) {
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('selected_playlists')
          .eq('id', request.campaign_id)
          .single();

        if (campaignError) throw campaignError;

        // Add new playlist IDs to existing selected_playlists (avoid duplicates)
        const existingPlaylists = Array.isArray(campaign.selected_playlists) ? campaign.selected_playlists : [];
        const newPlaylists = playlistsToUse.filter(id => !existingPlaylists.includes(id));
        const updatedPlaylists = [...existingPlaylists, ...newPlaylists];

        // Update campaign with new playlists
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            selected_playlists: updatedPlaylists,
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.campaign_id);

        if (updateError) throw updateError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-campaign-requests'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-vendor-responses'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      
      toast({
        title: variables.status === 'approved' ? 'Request Approved' : 'Request Rejected',
        description: `You have ${variables.status} the campaign request.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to respond to request. Please try again.',
        variant: 'destructive',
      });
      console.error('Error responding to request:', error);
    },
  });
}









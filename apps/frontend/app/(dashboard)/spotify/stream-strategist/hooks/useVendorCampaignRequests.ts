"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

// Interface for pending admin submissions that include this vendor
export interface PendingSubmissionForVendor {
  id: string;
  campaign_name: string;
  client_name: string;
  track_url: string;
  stream_goal: number;
  price_paid: number;
  start_date: string;
  duration_days: number;
  music_genres: string[];
  status: string;
  created_at: string;
  vendor_allocation: {
    vendor_id: string;
    vendor_name: string;
    allocated_streams: number;
    allocated_budget: number;
    playlist_ids: string[];
  };
  playlists: Array<{
    id: string;
    name: string;
    avg_daily_streams: number;
  }>;
}

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

      // Collect unique campaign_group IDs and fetch campaign data
      // campaign_id in campaign_vendor_requests now references campaign_groups.id
      const campaignGroupIds = Array.from(new Set((requests || []).map((r: any) => r.campaign_id)));
      let campaignsMap: Record<string, any> = {};

      if (campaignGroupIds.length > 0) {
        // First try to fetch from campaign_groups with related spotify_campaigns data
        const { data: campaignGroups, error: groupsError } = await supabase
          .from('campaign_groups')
          .select(`
            id, 
            name, 
            client_id,
            start_date,
            end_date,
            stream_goal,
            budget,
            notes,
            clients (name)
          `)
          .in('id', campaignGroupIds);
        
        if (groupsError) {
          console.error('Error fetching campaign groups:', groupsError);
        } else if (campaignGroups && campaignGroups.length > 0) {
          // Also fetch spotify_campaigns for additional track info
          const { data: spotifyCampaigns } = await supabase
            .from('spotify_campaigns')
            .select('campaign_group_id, campaign, url, status')
            .in('campaign_group_id', campaignGroupIds);
          
          const spotifyCampaignsMap = (spotifyCampaigns || []).reduce((acc: any, sc: any) => {
            acc[sc.campaign_group_id] = sc;
            return acc;
          }, {});
          
          campaignsMap = campaignGroups.reduce((acc: any, cg: any) => {
            const spotifyCampaign = spotifyCampaignsMap[cg.id];
            acc[cg.id] = {
              id: cg.id,
              name: cg.name || spotifyCampaign?.campaign || 'Campaign',
              brand_name: (cg.clients as any)?.name || 'Unknown Client',
              track_name: spotifyCampaign?.campaign || cg.name,
              track_url: spotifyCampaign?.url || '',
              budget: cg.budget || 0,
              start_date: cg.start_date,
              duration_days: cg.end_date && cg.start_date 
                ? Math.ceil((new Date(cg.end_date).getTime() - new Date(cg.start_date).getTime()) / (1000 * 60 * 60 * 24))
                : 30,
              music_genres: [],
              content_types: [],
              territory_preferences: [],
              post_types: [],
              stream_goal: cg.stream_goal || 0,
              creator_count: 0
            };
            return acc;
          }, {});
        }
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

// Hook to fetch pending submissions that include this vendor's playlists (awaiting admin approval)
export function usePendingSubmissionsForVendor() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ['pending-submissions-for-vendor', user?.id ?? 'anon'],
    enabled: !!user && !loading,
    staleTime: 30000,
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

      // Fetch all pending submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('campaign_submissions')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching pending submissions:', submissionsError);
        return [];
      }

      // Filter submissions that include this vendor in vendor_assignments
      const relevantSubmissions: PendingSubmissionForVendor[] = [];
      
      for (const submission of submissions || []) {
        const vendorAssignments = (submission.vendor_assignments as any[]) || [];
        
        // Find assignment for this vendor
        const vendorAssignment = vendorAssignments.find(va => 
          vendorIds.includes(va.vendor_id)
        );
        
        if (vendorAssignment && vendorAssignment.playlist_ids?.length > 0) {
          // Fetch playlist details
          const { data: playlists } = await supabase
            .from('playlists')
            .select('id, name, avg_daily_streams')
            .in('id', vendorAssignment.playlist_ids);
          
          relevantSubmissions.push({
            id: submission.id,
            campaign_name: submission.campaign_name,
            client_name: submission.client_name,
            track_url: submission.track_url,
            stream_goal: submission.stream_goal,
            price_paid: submission.price_paid,
            start_date: submission.start_date,
            duration_days: submission.duration_days,
            music_genres: submission.music_genres || [],
            status: submission.status,
            created_at: submission.created_at,
            vendor_allocation: vendorAssignment,
            playlists: playlists || []
          });
        }
      }
      
      return relevantSubmissions;
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

      // If approved, update campaign_playlists to mark vendor's playlists as accepted
      // campaign_id now references campaign_groups.id, so we need to find the spotify_campaign
      if (status === 'approved' && playlistsToUse && Array.isArray(playlistsToUse) && playlistsToUse.length > 0) {
        // Get spotify_campaign linked to this campaign_group
        const { data: spotifyCampaign, error: scError } = await supabase
          .from('spotify_campaigns')
          .select('id')
          .eq('campaign_group_id', request.campaign_id)
          .maybeSingle();

        if (scError) {
          console.error('Error fetching spotify campaign:', scError);
        } else if (spotifyCampaign) {
          // Get playlist details to update/create campaign_playlists entries
          const { data: playlistDetails, error: playlistError } = await supabase
            .from('playlists')
            .select('id, name, vendor_id, vendor:vendors(id, name)')
            .in('id', playlistsToUse);

          if (playlistError) {
            console.error('Error fetching playlist details:', playlistError);
          } else if (playlistDetails && playlistDetails.length > 0) {
            // Create campaign_playlists entries for approved playlists
            const campaignPlaylistEntries = playlistDetails.map(playlist => ({
              campaign_id: spotifyCampaign.id,
              playlist_name: playlist.name,
              vendor_id: playlist.vendor_id,
              playlist_curator: (playlist as any).vendor?.name || null,
              is_algorithmic: false,
              vendor_accepted: true, // Mark as vendor accepted
              org_id: '00000000-0000-0000-0000-000000000001'
            }));

            // Use upsert to avoid duplicates - match on campaign_id + playlist_name
            const { error: upsertError } = await supabase
              .from('campaign_playlists')
              .upsert(campaignPlaylistEntries, { 
                onConflict: 'campaign_id,playlist_name',
                ignoreDuplicates: false 
              });

            if (upsertError) {
              console.error('Error upserting campaign_playlists:', upsertError);
            } else {
              console.log(`✅ Added ${campaignPlaylistEntries.length} playlists to campaign`);
            }
          }
        }
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









"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

export interface VendorCampaign {
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
  stream_goal: number;
  creator_count: number;
  status: string;
  selected_playlists: string[];
  vendor_allocations: Record<string, any>;
  payment_status: 'paid' | 'unpaid' | 'pending' | 'partial';
  amount_owed?: number;
  total_streams_delivered?: number;
  // Vendor-specific data
  vendor_playlists?: Array<{
    id: string;
    name: string;
    avg_daily_streams: number;
    follower_count?: number;
    is_allocated: boolean;
    // Actual scraped stream data
    current_streams: number;
    streams_24h: number;
    streams_7d: number;
    streams_12m: number;
    vendor_paid: boolean;
    cost_per_1k_override?: number | null;
  }>;
  vendor_stream_goal?: number;
  vendor_allocation?: Record<string, any>;
}

// Hook to fetch campaigns where vendor has playlists allocated
export function useVendorCampaigns() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ['vendor-campaigns', user?.id ?? 'anon'],
    enabled: !!user && !loading,
    staleTime: 30000, // Cache for 30 seconds to reduce refetches
    gcTime: 60000, // Keep in cache for 1 minute
    refetchOnWindowFocus: false, // Don't refetch on every tab switch
    retry: 1, // Only retry once on failure
    queryFn: async () => {
      console.log('🔄 useVendorCampaigns: Starting query for user', user?.id);
      // First get current user's vendor data
      const { data: vendorUsers, error: vendorError } = await supabase
        .from('vendor_users')
        .select(`
          vendor_id,
          vendors (
            id,
            name,
            cost_per_1k_streams
          )
        `)
        .eq('user_id', user!.id);

      if (vendorError) throw vendorError;
      
      const vendorIds = vendorUsers?.map(vu => vu.vendor_id) || [];
      if (vendorIds.length === 0) return [];

      // Get vendor's playlists
      const { data: playlists, error: playlistError } = await supabase
        .from('playlists')
        .select('id, name, avg_daily_streams, follower_count, vendor_id')
        .in('vendor_id', vendorIds);

      if (playlistError) throw playlistError;
      
      const playlistIds = playlists?.map(p => p.id) || [];

      // Fetch campaign_playlists for this vendor to find which campaigns they're in
      // campaign_playlists.campaign_id references spotify_campaigns.id (integer)
      const { data: campaignPlaylists, error: cpError } = await supabase
        .from('campaign_playlists')
        .select('campaign_id')
        .in('vendor_id', vendorIds);

      if (cpError) throw cpError;
      
      // ALSO fetch campaigns from campaign_vendor_requests where vendor has accepted
      const { data: acceptedRequests, error: arError } = await supabase
        .from('campaign_vendor_requests')
        .select('campaign_id')
        .in('vendor_id', vendorIds)
        .eq('status', 'approved');
      
      if (arError) console.error('Error fetching accepted requests:', arError);
      
      // Campaign IDs from accepted requests are campaign_group IDs directly
      const acceptedCampaignGroupIds = [...new Set(acceptedRequests?.map(ar => ar.campaign_id).filter(Boolean) || [])];
      console.log('📋 Found', acceptedCampaignGroupIds.length, 'accepted campaign group IDs');
      
      // Get unique campaign IDs (these are spotify_campaigns.id, not campaign_groups.id)
      const spotifyCampaignIds = [...new Set(campaignPlaylists?.map(cp => cp.campaign_id).filter(Boolean) || [])];
      
      let campaignIdsWithAllocations: string[] = [...acceptedCampaignGroupIds];
      
      if (spotifyCampaignIds.length > 0) {
        console.log('📋 Found', spotifyCampaignIds.length, 'spotify campaign IDs');
        
        // Get the campaign_group_ids from spotify_campaigns
        const { data: spotifyCampaigns, error: scError } = await supabase
          .from('spotify_campaigns')
          .select('id, campaign_group_id')
          .in('id', spotifyCampaignIds);
        
        if (scError) throw scError;
        
        const playlistCampaignGroupIds = spotifyCampaigns?.map(sc => sc.campaign_group_id).filter(Boolean) || [];
        campaignIdsWithAllocations = [...new Set([...campaignIdsWithAllocations, ...playlistCampaignGroupIds])];
      }
      
      if (campaignIdsWithAllocations.length === 0) {
        console.log('📋 No campaign groups found for vendor campaigns');
        return [];
      }
      
      console.log('📋 Found', campaignIdsWithAllocations.length, 'total campaign group IDs');

      // Fetch only campaigns where this vendor has allocations AND status is 'Active'
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaign_groups')
        .select('*')
        .in('id', campaignIdsWithAllocations)
        .eq('status', 'Active');

      if (campaignError) throw campaignError;

      // Get payment/performance data from campaign_playlists (actual scraped data)
      const campaignIds = campaigns?.map(c => c.id) || [];
      
      // Get spotify_campaigns for these campaign_groups to link back to campaign_playlists
      const spotifyCampaignIdsForPayment = spotifyCampaigns
        ?.filter(sc => campaignIds.includes(sc.campaign_group_id))
        ?.map(sc => sc.id) || [];
      
      // Fetch playlist performance data for these campaigns
      const { data: playlistPerformance, error: perfError } = await supabase
        .from('campaign_playlists')
        .select('*')
        .in('campaign_id', spotifyCampaignIdsForPayment)
        .in('vendor_id', vendorIds);
      
      if (perfError) throw perfError;
      
      console.log('📋 Found', playlistPerformance?.length || 0, 'playlist performance records');

      // Process campaigns to include vendor-specific data
      const vendorCampaigns = campaigns?.map(campaign => {
        // Normalize selected_playlists to handle both string and object formats
        const normalizePlaylistIds = (selectedPlaylists: any): string[] => {
          if (!Array.isArray(selectedPlaylists)) return [];
          
          return selectedPlaylists.map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null) {
              return item.id || item.playlist_id || '';
            }
            return '';
          }).filter(id => id !== '');
        };

        const selectedPlaylistIds = normalizePlaylistIds(campaign.selected_playlists);
        
        // Get campaign's spotify_campaign IDs for this campaign group
        const campaignSpotifyIds = spotifyCampaigns
          ?.filter(sc => sc.campaign_group_id === campaign.id)
          ?.map(sc => sc.id) || [];
        
        // Get playlist performance for this campaign and vendor
        const campaignPlaylistPerf = playlistPerformance?.filter(p => 
          campaignSpotifyIds.includes(p.campaign_id) && vendorIds.includes(p.vendor_id)
        ) || [];

        // Get vendor's playlist names for strict matching
        const vendorPlaylistNames = new Set(playlists?.map(p => p.name.toLowerCase()) || []);
        const vendorPlaylistSpotifyIds = new Set(
          playlists?.map(p => (p as any).spotify_id).filter(Boolean) || []
        );

        // Build vendor playlists - ONLY include playlists that the vendor actually owns
        // Match by name OR spotify_id to ensure accuracy
        const vendorPlaylistsInCampaign = campaignPlaylistPerf
          .filter(perf => {
            // Must match a playlist the vendor owns in the playlists table
            const nameMatch = perf.playlist_name && vendorPlaylistNames.has(perf.playlist_name.toLowerCase());
            const spotifyIdMatch = perf.playlist_spotify_id && vendorPlaylistSpotifyIds.has(perf.playlist_spotify_id);
            return nameMatch || spotifyIdMatch;
          })
          .map(perf => {
            // Find the matching playlist from playlists table
            const matchingPlaylist = playlists?.find(p => 
              p.name.toLowerCase() === perf.playlist_name?.toLowerCase() || 
              (p as any).spotify_id === perf.playlist_spotify_id
            );
            
            return {
              id: matchingPlaylist?.id || perf.id?.toString() || perf.playlist_spotify_id || '',
              name: matchingPlaylist?.name || perf.playlist_name || 'Unknown Playlist',
              avg_daily_streams: matchingPlaylist?.avg_daily_streams || 0,
              follower_count: matchingPlaylist?.follower_count || perf.playlist_follower_count || 0,
              vendor_id: matchingPlaylist?.vendor_id || perf.vendor_id,
              is_allocated: true, // All matched entries are allocated
              // Actual scraped streams from campaign_playlists
              current_streams: perf.streams_12m || 0,
              streams_24h: perf.streams_24h || 0,
              streams_7d: perf.streams_7d || 0,
              streams_12m: perf.streams_12m || 0,
              // Payment status per playlist
              vendor_paid: perf.vendor_paid || false,
              cost_per_1k_override: perf.cost_per_1k_override || null
            };
          });

        // Calculate vendor's stream goal allocation
        // Priority: 1. vendor_allocations (if stored with allocated_streams)
        //           2. Campaign's total_goal as the main source
        const vendorAllocationsData = campaign.vendor_allocations;
        let vendorStreamGoal = 0;
        
        // Handle both array and object formats for vendor_allocations
        if (Array.isArray(vendorAllocationsData)) {
          // Array format: [{vendor_id, allocated_streams, ...}]
          for (const vendorId of vendorIds) {
            const allocation = vendorAllocationsData.find((a: any) => a.vendor_id === vendorId);
            if (allocation) {
              vendorStreamGoal += allocation.allocated_streams || allocation.allocation || 0;
            }
          }
        } else if (vendorAllocationsData && typeof vendorAllocationsData === 'object') {
          // Object format: {vendorId: {allocated_streams, ...}}
          for (const vendorId of vendorIds) {
            const allocation = (vendorAllocationsData as Record<string, any>)[vendorId];
            if (allocation) {
              vendorStreamGoal += allocation.allocated_streams || allocation.allocation || 0;
            }
          }
        }
        
        // If no vendor-specific allocations, use campaign's total_goal
        // This is the primary source for CSV-imported campaigns
        if (vendorStreamGoal === 0) {
          vendorStreamGoal = campaign.total_goal || campaign.stream_goal || 0;
        }

        // Calculate total streams and estimate payment
        let totalStreams = 0;
        let totalAmountOwed = 0;
        let paymentStatus: 'paid' | 'unpaid' | 'pending' | 'partial' = 'pending';

        // Get vendor default cost rate
        const vendorData = vendorUsers?.find(vu => vendorIds.includes(vu.vendor_id))?.vendors as any;
        const vendorDefaultCost = vendorData?.cost_per_1k_streams || 0;

        // Sum up streams and calculate payment per playlist (using campaign-specific rates if set)
        for (const perf of campaignPlaylistPerf) {
          const playlistStreams = perf.streams_12m || 0;
          totalStreams += playlistStreams;
          
          // Use cost_per_1k_override if set, otherwise use vendor default
          const effectiveCostPer1k = perf.cost_per_1k_override ?? vendorDefaultCost;
          totalAmountOwed += (playlistStreams / 1000) * effectiveCostPer1k;
        }
        
        // Determine payment status from campaign_playlists.vendor_paid
        const paidCount = campaignPlaylistPerf.filter(p => p.vendor_paid === true).length;
        const totalPlaylists = campaignPlaylistPerf.length;

        if (totalPlaylists === 0) {
          paymentStatus = 'pending';
        } else if (paidCount === totalPlaylists) {
          paymentStatus = 'paid';
        } else if (paidCount > 0) {
          paymentStatus = 'partial';
        } else {
          paymentStatus = 'unpaid';
        }

        // Get the effective cost per 1k for this vendor in this campaign
        // Priority: 1. cost_per_1k_override from first playlist, 2. vendor allocation rate, 3. vendor default
        const firstPlaylistWithOverride = campaignPlaylistPerf.find(p => p.cost_per_1k_override != null);
        
        // Safely extract vendor-specific allocation data
        let vendorAllocationData: Record<string, any> | null = null;
        if (Array.isArray(vendorAllocationsData)) {
          vendorAllocationData = vendorAllocationsData.find((a: any) => vendorIds.includes(a.vendor_id)) || null;
        } else if (vendorAllocationsData && typeof vendorAllocationsData === 'object') {
          vendorAllocationData = (vendorAllocationsData as Record<string, any>)[vendorIds[0]] || null;
        }
        
        const allocationCostPer1k = vendorAllocationData?.cost_per_1k_streams;
        const effectiveCostPer1k = firstPlaylistWithOverride?.cost_per_1k_override ?? allocationCostPer1k ?? vendorDefaultCost ?? 8;

        return {
          ...campaign,
          vendor_playlists: vendorPlaylistsInCampaign,
          vendor_stream_goal: vendorStreamGoal,
          vendor_allocation: {
            ...(vendorAllocationData || {}),
            cost_per_1k_streams: effectiveCostPer1k
          },
          cost_per_1k_streams: effectiveCostPer1k, // Top-level for easy access
          payment_status: paymentStatus,
          amount_owed: totalAmountOwed,
          total_streams_delivered: totalStreams
        };
      }) || [];

      return vendorCampaigns as VendorCampaign[];
    },
  });
}

// Hook to update playlist allocation in a campaign
export function useUpdatePlaylistAllocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      playlistId, 
      action 
    }: { 
      campaignId: string; 
      playlistId: string; 
      action: 'add' | 'remove' 
    }) => {
      // Get current campaign
      const { data: campaign, error: fetchError } = await supabase
        .from('campaign_groups')
        .select('selected_playlists')
        .eq('id', campaignId)
        .single();

      if (fetchError) throw fetchError;

      const selectedPlaylists = Array.isArray(campaign.selected_playlists) 
        ? campaign.selected_playlists as string[] 
        : [];

      let updatedPlaylists;
      if (action === 'add' && !selectedPlaylists.includes(playlistId)) {
        updatedPlaylists = [...selectedPlaylists, playlistId];
      } else if (action === 'remove') {
        updatedPlaylists = selectedPlaylists.filter(id => id !== playlistId);
      } else {
        updatedPlaylists = selectedPlaylists;
      }

      // Update campaign with new playlist allocation
      const { data, error } = await supabase
        .from('campaign_groups')
        .update({ 
          selected_playlists: updatedPlaylists,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-performance-data'] });
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      
      toast({
        title: variables.action === 'add' ? 'Playlist Added' : 'Playlist Removed',
        description: `Playlist has been ${variables.action === 'add' ? 'added to' : 'removed from'} the campaign.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update playlist allocation. Please try again.',
        variant: 'destructive',
      });
      console.error('Error updating playlist allocation:', error);
    },
  });
}









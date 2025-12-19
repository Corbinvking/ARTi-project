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
  payment_status: 'paid' | 'unpaid' | 'pending';
  amount_owed?: number;
  // Vendor-specific data
  vendor_playlists?: Array<{
    id: string;
    name: string;
    avg_daily_streams: number;
    follower_count?: number;
    is_allocated: boolean;
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
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
      
      // Get unique campaign IDs (these are spotify_campaigns.id, not campaign_groups.id)
      const spotifyCampaignIds = [...new Set(campaignPlaylists?.map(cp => cp.campaign_id).filter(Boolean) || [])];
      
      if (spotifyCampaignIds.length === 0) {
        console.log('📋 No campaign playlists found for vendor');
        return [];
      }
      
      console.log('📋 Found', spotifyCampaignIds.length, 'spotify campaign IDs');
      
      // Get the campaign_group_ids from spotify_campaigns
      const { data: spotifyCampaigns, error: scError } = await supabase
        .from('spotify_campaigns')
        .select('id, campaign_group_id')
        .in('id', spotifyCampaignIds);
      
      if (scError) throw scError;
      
      const campaignIdsWithAllocations = [...new Set(spotifyCampaigns?.map(sc => sc.campaign_group_id).filter(Boolean) || [])];
      
      if (campaignIdsWithAllocations.length === 0) {
        console.log('📋 No campaign groups found for vendor campaigns');
        return [];
      }
      
      console.log('📋 Found', campaignIdsWithAllocations.length, 'campaign group IDs');

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
        
        // Get vendor's playlists that are in this campaign
        const vendorPlaylistsInCampaign = playlists?.map(playlist => ({
          ...playlist,
          is_allocated: selectedPlaylistIds.includes(playlist.id)
        })) || [];

        // Calculate vendor's stream goal allocation
        const vendorAllocations = campaign.vendor_allocations as Record<string, any> || {};
        let vendorStreamGoal = 0;
        
        for (const vendorId of vendorIds) {
          if (vendorAllocations[vendorId]) {
            vendorStreamGoal += vendorAllocations[vendorId].allocated_streams || 0;
          }
        }

        // Get campaign's spotify_campaign IDs
        const campaignSpotifyIds = spotifyCampaigns
          ?.filter(sc => sc.campaign_group_id === campaign.id)
          ?.map(sc => sc.id) || [];
        
        // Get playlist performance for this campaign and vendor
        const campaignPlaylistPerf = playlistPerformance?.filter(p => 
          campaignSpotifyIds.includes(p.campaign_id) && vendorIds.includes(p.vendor_id)
        ) || [];

        // Calculate total streams and estimate payment
        let totalStreams = 0;
        let paymentStatus: 'paid' | 'unpaid' | 'pending' = 'pending';

        // Sum up streams from all vendor playlists in this campaign
        for (const perf of campaignPlaylistPerf) {
          totalStreams += (perf.streams_28d || 0);
        }
        
        // Get vendor cost rate
        const vendorData = vendorUsers?.find(vu => vendorIds.includes(vu.vendor_id))?.vendors as any;
        const costPer1kStreams = vendorData?.cost_per_1k_streams || 0;
        
        // Calculate amount owed based on streams
        const totalAmountOwed = (totalStreams / 1000) * costPer1kStreams;
        
        // For now, mark as unpaid if there are streams, pending if no data
        if (totalStreams > 0) {
          paymentStatus = 'unpaid';
        }

        return {
          ...campaign,
          vendor_playlists: vendorPlaylistsInCampaign,
          vendor_stream_goal: vendorStreamGoal,
          vendor_allocation: vendorAllocations[vendorIds[0]], // For simplicity, use first vendor
          payment_status: paymentStatus,
          amount_owed: totalAmountOwed
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









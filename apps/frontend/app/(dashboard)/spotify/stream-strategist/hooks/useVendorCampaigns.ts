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

      // Fetch campaign allocations for this vendor to find which campaigns they're in
      const { data: allocations, error: allocError } = await supabase
        .from('campaign_allocations_performance')
        .select('campaign_id')
        .in('vendor_id', vendorIds);

      if (allocError) throw allocError;

      const campaignIdsWithAllocations = [...new Set(allocations?.map(a => a.campaign_id) || [])];
      
      if (campaignIdsWithAllocations.length === 0) return [];

      // Fetch only campaigns where this vendor has allocations AND status is 'Active'
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaign_groups')
        .select('*')
        .in('id', campaignIdsWithAllocations)
        .eq('status', 'Active');

      if (campaignError) throw campaignError;

      // Get payment data for campaigns involving this vendor
      const campaignIds = campaigns?.map(c => c.id) || [];
      const { data: paymentData, error: paymentError } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .in('campaign_id', campaignIds)
        .in('vendor_id', vendorIds);

      if (paymentError) throw paymentError;

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

        // Get payment data for this campaign and vendor
        const campaignPayments = paymentData?.filter(p => 
          p.campaign_id === campaign.id && vendorIds.includes(p.vendor_id)
        ) || [];

        // Calculate total amount owed and determine payment status based on allocated streams
        let totalAmountOwed = 0;
        let paymentStatus: 'paid' | 'unpaid' | 'pending' = 'pending';
        let hasUnpaid = false;
        let hasPaid = false;

        // Always calculate from campaign allocation performance records
        if (campaignPayments.length > 0) {
          for (const payment of campaignPayments) {
            const costPerStream = payment.cost_per_stream || 0;
            const allocatedStreams = payment.allocated_streams || 0;
            const paymentAmount = allocatedStreams * costPerStream;
            
            totalAmountOwed += paymentAmount;
            
            if (payment.payment_status === 'paid') {
              hasPaid = true;
            } else {
              hasUnpaid = true;
            }
          }
          
          // Set payment status based on actual payment records
          if (hasPaid && !hasUnpaid) {
            paymentStatus = 'paid';
          } else if (hasUnpaid || totalAmountOwed > 0) {
            paymentStatus = 'unpaid';
          }
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









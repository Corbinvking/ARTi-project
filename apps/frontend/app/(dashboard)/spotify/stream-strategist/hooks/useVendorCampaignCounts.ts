"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export interface VendorCampaignCount {
  vendor_id: string;
  active_campaigns: number;
  max_concurrent_campaigns: number;
}

export function useVendorCampaignCounts() {
  return useQuery({
    queryKey: ['vendor-campaign-counts'],
    queryFn: async (): Promise<Record<string, VendorCampaignCount>> => {
      // First get all active vendors with their limits
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, max_concurrent_campaigns')
        .eq('is_active', true);
      
      if (vendorsError) throw vendorsError;

      // Get all active campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, selected_playlists, vendor_allocations')
        .eq('status', 'active');
      
      if (campaignsError) throw campaignsError;

      // Get all playlists to map playlist IDs to vendor IDs
      const { data: playlists, error: playlistsError } = await supabase
        .from('playlists')
        .select('id, vendor_id');
      
      if (playlistsError) throw playlistsError;

      // Create playlist to vendor mapping
      const playlistToVendor: Record<string, string> = {};
      playlists?.forEach(playlist => {
        playlistToVendor[playlist.id] = playlist.vendor_id;
      });

      // Count campaigns per vendor
      const vendorCounts: Record<string, number> = {};
      
      campaigns?.forEach(campaign => {
        const vendorsInCampaign = new Set<string>();

        // Check vendor_allocations (direct vendor assignments)
        if (campaign.vendor_allocations && typeof campaign.vendor_allocations === 'object') {
          Object.keys(campaign.vendor_allocations).forEach(vendorId => {
            vendorsInCampaign.add(vendorId);
          });
        }

        // Check selected_playlists (playlist-based assignments)
        if (Array.isArray(campaign.selected_playlists)) {
          campaign.selected_playlists.forEach((playlist: any) => {
            let playlistId: string | null = null;
            
            if (typeof playlist === 'string') {
              playlistId = playlist;
            } else if (playlist && typeof playlist === 'object') {
              playlistId = playlist.id || playlist.playlist_id;
            }
            
            if (playlistId && playlistToVendor[playlistId]) {
              vendorsInCampaign.add(playlistToVendor[playlistId]);
            }
          });
        }

        // Increment count for each vendor involved in this campaign
        vendorsInCampaign.forEach(vendorId => {
          vendorCounts[vendorId] = (vendorCounts[vendorId] || 0) + 1;
        });
      });

      // Build final result
      const result: Record<string, VendorCampaignCount> = {};
      vendors?.forEach(vendor => {
        result[vendor.id] = {
          vendor_id: vendor.id,
          active_campaigns: vendorCounts[vendor.id] || 0,
          max_concurrent_campaigns: vendor.max_concurrent_campaigns
        };
      });

      return result;
    }
  });
}









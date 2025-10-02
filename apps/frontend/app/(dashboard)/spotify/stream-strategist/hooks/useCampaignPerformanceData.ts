"use client"

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

interface CampaignPerformanceData {
  vendor_id: string;
  vendor_name: string;
  allocated_streams: number;
  actual_streams: number;
  predicted_streams: number;
  performance_score: number;
  cost_per_stream: number;
  playlists: Array<{
    id: string;
    name: string;
    allocated_streams: number;
    actual_streams: number;
    cost_per_stream: number;
    payment_status: string;
    daily_data: Array<{
      date: string;
      streams: number;
    }>;
  }>;
}

export function useCampaignPerformanceData(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-performance-data', campaignId],
    queryFn: async (): Promise<CampaignPerformanceData[]> => {
      if (!campaignId) return [];

      // Fetch campaign allocation performance
      const { data: allocations, error: allocError } = await supabase
        .from('campaign_allocations_performance')
        .select('*')
        .eq('campaign_id', campaignId);

      if (allocError) throw allocError;

      if (!allocations || allocations.length === 0) return [];

      // Fetch vendor and playlist details separately
      const vendorIds = [...new Set(allocations.map(a => a.vendor_id))];
      const playlistIds = [...new Set(allocations.map(a => a.playlist_id))];

      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, name')
        .in('id', vendorIds);

      const { data: playlists } = await supabase
        .from('playlists')
        .select('id, name')
        .in('id', playlistIds);

      // Create lookup maps
      const vendorLookup = new Map(vendors?.map(v => [v.id, v]) || []);
      const playlistLookup = new Map(playlists?.map(p => [p.id, p]) || []);

      // Group by vendor
      const vendorMap = new Map<string, CampaignPerformanceData>();

      for (const allocation of allocations) {
        const vendorId = allocation.vendor_id;
        const vendor = vendorLookup.get(vendorId);
        
        if (!vendorMap.has(vendorId)) {
          vendorMap.set(vendorId, {
            vendor_id: vendorId,
            vendor_name: vendor?.name || '',
            allocated_streams: 0,
            actual_streams: 0,
            predicted_streams: 0,
            performance_score: 0,
            cost_per_stream: 0,
            playlists: []
          });
        }

        const vendorData = vendorMap.get(vendorId)!;
        vendorData.allocated_streams += allocation.allocated_streams;
        vendorData.actual_streams += allocation.actual_streams;
        vendorData.predicted_streams += allocation.predicted_streams;
        vendorData.cost_per_stream = allocation.cost_per_stream || 0;

        // Fetch daily performance data for this playlist
        const { data: dailyData } = await supabase
          .from('performance_entries')
          .select('daily_streams, date_recorded')
          .eq('playlist_id', allocation.playlist_id)
          .eq('campaign_id', campaignId)
          .order('date_recorded', { ascending: true })
          .limit(30); // Last 30 days

        const playlist = playlistLookup.get(allocation.playlist_id);
        vendorData.playlists.push({
          id: allocation.playlist_id,
          name: playlist?.name || 'Unknown Playlist',
          allocated_streams: allocation.allocated_streams,
          actual_streams: allocation.actual_streams,
          cost_per_stream: allocation.cost_per_stream || 0,
          payment_status: allocation.payment_status || 'unpaid',
          daily_data: dailyData?.map(entry => ({
            date: entry.date_recorded,
            streams: entry.daily_streams
          })) || []
        });
      }

      // Calculate average performance scores for each vendor
      const result = Array.from(vendorMap.values()).map(vendor => ({
        ...vendor,
        performance_score: vendor.predicted_streams > 0 
          ? vendor.actual_streams / vendor.predicted_streams 
          : 0
      }));

      return result;
    },
    enabled: !!campaignId
  });
}

export function useCampaignOverallPerformance(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-overall-performance', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Get total actual streams from all vendors
      const { data: allocations, error: allocError } = await supabase
        .from('campaign_allocations_performance')
        .select('actual_streams, predicted_streams, allocated_streams')
        .eq('campaign_id', campaignId);

      if (allocError) throw allocError;

      const totalActual = allocations?.reduce((sum, a) => sum + a.actual_streams, 0) || 0;
      const totalPredicted = allocations?.reduce((sum, a) => sum + a.predicted_streams, 0) || 0;
      const totalAllocated = allocations?.reduce((sum, a) => sum + a.allocated_streams, 0) || 0;

      return {
        campaign_goal: campaign.stream_goal,
        total_actual: totalActual,
        total_predicted: totalPredicted,
        total_allocated: totalAllocated,
        progress_percentage: campaign.stream_goal > 0 ? (totalActual / campaign.stream_goal) * 100 : 0,
        prediction_accuracy: totalPredicted > 0 ? (totalActual / totalPredicted) * 100 : 0
      };
    },
    enabled: !!campaignId
  });
}









"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

export function useUpdateVendorCampaignRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      newRatePer1k 
    }: { 
      campaignId: string; 
      newRatePer1k: number;
    }) => {
      // Update the rate in campaign_allocations_performance for this campaign
      const { error } = await supabase
        .from('campaign_allocations_performance')
        .update({
          cost_per_stream: newRatePer1k / 1000.0, // Convert from per-1k to per-stream
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payment-data'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-performance-data'] });
      
      toast({
        title: 'Rate Updated',
        description: `Payment rate updated to $${variables.newRatePer1k.toFixed(2)} per 1k streams.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update payment rate. Please try again.',
        variant: 'destructive',
      });
      console.error('Error updating payment rate:', error);
    },
  });
}









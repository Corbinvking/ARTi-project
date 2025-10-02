"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../hooks/use-toast';

export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      // First, check if client has any campaigns
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('client_id', clientId);
      
      if (campaignError) throw campaignError;
      
      if (campaigns && campaigns.length > 0) {
        throw new Error(
          `Cannot delete client. Please first unassign ${campaigns.length} campaign(s) from this client.`
        );
      }
      
      // Delete client credits first
      const { error: creditsError } = await supabase
        .from('client_credits')
        .delete()
        .eq('client_id', clientId);
      
      if (creditsError) throw creditsError;
      
      // Then delete the client
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (clientError) throw clientError;
      
      return clientId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Client deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error deleting client', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}









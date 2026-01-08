"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Client, ClientCredit } from '../types';
import { toast } from '@/components/ui/use-toast';
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from '../lib/constants';

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      // First get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsError) throw clientsError;

      // Then get campaign counts from spotify_campaigns (the actual campaign data)
      const clientsWithCounts = await Promise.all(
        clients.map(async (client) => {
          const { data: campaigns, error: campaignsError } = await supabase
            .from('spotify_campaigns')
            .select('id, status')
            .eq('client_id', client.id);

          if (campaignsError) {
            console.error('Error fetching campaigns for client:', client.id, campaignsError);
            return {
              ...client,
              activeCampaignsCount: 0,
              totalCampaignsCount: 0,
            };
          }

          return {
            ...client,
            activeCampaignsCount: campaigns?.filter((c: any) => c.status === 'Active').length || 0,
            totalCampaignsCount: campaigns?.length || 0,
          };
        })
      );

      return clientsWithCounts;
    },
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      // First get the client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Get campaigns directly from spotify_campaigns table
      const { data: campaigns, error: campaignsError } = await supabase
        .from('spotify_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('start_date', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Map campaigns to the expected format with metrics
      const campaignsWithMetrics = (campaigns || []).map((campaign: any) => {
        return {
          id: campaign.id,
          name: campaign.campaign,
          artist_name: campaign.client, // Use client as artist fallback
          status: campaign.status || 'Active',
          start_date: campaign.start_date,
          remaining_streams: parseInt(campaign.remaining) || 0,
          daily_streams: parseInt(campaign.daily) || 0,
          weekly_streams: parseInt(campaign.weekly) || 0,
          goal: campaign.goal,
          sale_price: campaign.sale_price,
          vendor: campaign.vendor,
          playlists: campaign.playlists,
          url: campaign.url,
          sfa: campaign.sfa,
          song_count: 1, // Each spotify_campaign is a single song
          // Keep original campaign data for reference
          ...campaign
        };
      });

      console.log(`✅ Client ${client.name} has ${campaigns?.length || 0} campaigns`);

      return {
        ...client,
        campaigns: campaignsWithMetrics || []
      };
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      
      if (error) throw error;
      return data as Client;
    },
    onSuccess: (newClient) => {
      // Optimistically update the cache with the new client
      queryClient.setQueryData(['clients'], (oldData: any) => {
        if (oldData) {
          return [...oldData, newClient];
        }
        return [newClient];
      });
      
      // Also invalidate for a full refresh
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Client created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error creating client', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Client updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating client', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useClientCredits(clientId: string) {
  return useQuery({
    queryKey: ['client-credits', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_credits')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientCredit[];
    },
    enabled: !!clientId,
  });
}

export function useAddClientCredit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (credit: Omit<ClientCredit, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('client_credits')
        .insert(credit)
        .select()
        .single();
      
      if (error) throw error;
      
      // Get current client balance and update it
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('credit_balance')
        .eq('id', credit.client_id)
        .single();
      
      if (clientError) throw clientError;
      
      const newBalance = (clientData.credit_balance || 0) + credit.amount;
      
      const { error: balanceError } = await supabase
        .from('clients')
        .update({ credit_balance: newBalance })
        .eq('id', credit.client_id);
      
      if (balanceError) throw balanceError;
      
      return data as ClientCredit;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-credits', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.client_id] });
      toast({ title: 'Credit transaction recorded' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error recording credit', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}









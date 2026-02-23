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
        // Parse the goal (could be "20K", "500K", "1,000K", etc.)
        let goalNum = 0;
        if (campaign.goal) {
          const goalStr = String(campaign.goal).replace(/,/g, '').toUpperCase();
          if (goalStr.includes('K')) {
            goalNum = parseFloat(goalStr.replace('K', '')) * 1000;
          } else if (goalStr.includes('M')) {
            goalNum = parseFloat(goalStr.replace('M', '')) * 1000000;
          } else {
            goalNum = parseFloat(goalStr) || 0;
          }
        }
        
        // Parse sale_price (could be "$350.00", "$7,000.00", etc.)
        let budgetNum = 0;
        if (campaign.sale_price) {
          const priceStr = String(campaign.sale_price).replace(/[$,]/g, '');
          budgetNum = parseFloat(priceStr) || 0;
        }
        
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
          total_goal: goalNum,
          sale_price: campaign.sale_price,
          total_budget: budgetNum,
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

async function getCurrentBalance(clientId: string): Promise<number> {
  const { data, error } = await supabase
    .from('clients')
    .select('credit_balance')
    .eq('id', clientId)
    .single();
  if (error) throw error;
  return data.credit_balance || 0;
}

async function applyBalanceDelta(clientId: string, delta: number) {
  const currentBalance = await getCurrentBalance(clientId);
  const newBalance = currentBalance + delta;

  const { error } = await supabase
    .from('clients')
    .update({ credit_balance: newBalance })
    .eq('id', clientId);
  if (error) throw error;
}

function invalidateCreditQueries(queryClient: ReturnType<typeof useQueryClient>, clientId: string) {
  queryClient.invalidateQueries({ queryKey: ['client-credits', clientId] });
  queryClient.invalidateQueries({ queryKey: ['clients'] });
  queryClient.invalidateQueries({ queryKey: ['client', clientId] });
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

      await applyBalanceDelta(credit.client_id, credit.amount);
      
      return data as ClientCredit;
    },
    onSuccess: (_, variables) => {
      invalidateCreditQueries(queryClient, variables.client_id);
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

export function useUpdateClientCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, client_id, amount, reason }: { id: string; client_id: string; amount: number; reason?: string | null }) => {
      const { data: oldEntry, error: fetchOldError } = await supabase
        .from('client_credits')
        .select('amount')
        .eq('id', id)
        .single();

      if (fetchOldError) throw fetchOldError;
      const oldAmount = oldEntry.amount;

      const { data, error } = await supabase
        .from('client_credits')
        .update({ amount, reason })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await applyBalanceDelta(client_id, amount - oldAmount);

      return data as ClientCredit;
    },
    onSuccess: (_, variables) => {
      invalidateCreditQueries(queryClient, variables.client_id);
      toast({ title: 'Credit entry updated' });
    },
    onError: (error) => {
      toast({
        title: 'Error updating credit entry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClientCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const { data: entryToDelete, error: fetchError } = await supabase
        .from('client_credits')
        .select('amount')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      const deletedAmount = entryToDelete.amount;

      const { error } = await supabase
        .from('client_credits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await applyBalanceDelta(client_id, -deletedAmount);
    },
    onSuccess: (_, variables) => {
      invalidateCreditQueries(queryClient, variables.client_id);
      toast({ title: 'Credit entry deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting credit entry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}









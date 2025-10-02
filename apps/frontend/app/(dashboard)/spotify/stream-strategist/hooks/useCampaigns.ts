"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../hooks/use-toast';
import { logCurrentProject, validateCampaignData } from '../utils/debugUtils';
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_SOURCE_INTAKE, APP_CAMPAIGN_TYPE } from '../lib/constants';

export interface Campaign {
  id: string;
  name: string;
  status: string;
  client_id?: string;
  client_name?: string;
  start_date: string;
  duration_days: number;
  budget: number;
  stream_goal: number;
  remaining_streams: number;
  created_at: string;
  updated_at: string;
  source: string;
  campaign_type: string;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns', APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('source', [APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_SOURCE_INTAKE])
        .eq('campaign_type', APP_CAMPAIGN_TYPE)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    },
  });
}

export function useCampaignsForClient(clientId: string) {
  return useQuery({
    queryKey: ['campaigns', 'client', clientId, APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId)
        .in('source', [APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_SOURCE_INTAKE])
        .eq('campaign_type', APP_CAMPAIGN_TYPE)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!clientId,
  });
}

export function useAllCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'all', APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE],
    queryFn: async () => {
      logCurrentProject();
      
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients!campaigns_client_id_fkey(name)
        `)
        .in('source', [APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_SOURCE_INTAKE])
        .eq('campaign_type', APP_CAMPAIGN_TYPE)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching campaigns:', error);
        throw error;
      }
      
      console.log('✅ Fetched all campaigns:', data);
      
      // Validate we're getting the right project data
      const isValid = validateCampaignData(data);
      if (!isValid) {
        console.error('❌ WRONG PROJECT DATA - Clear browser cache and refresh!');
      }
      
      return data as (Campaign & { clients?: { name: string } | null })[];
    },
    staleTime: 0, // Force fresh fetch
    gcTime: 0, // Don't cache
  });
}

export function useUnassignedCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'unassigned', APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE],
    queryFn: async () => {
      logCurrentProject();
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .is('client_id', null)
        .in('source', [APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_SOURCE_INTAKE])
        .eq('campaign_type', APP_CAMPAIGN_TYPE)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching campaigns:', error);
        throw error;
      }
      
      console.log('✅ Fetched unassigned campaigns:', data);
      
      // Validate we're getting the right project data
      const isValid = validateCampaignData(data);
      if (!isValid) {
        console.error('❌ WRONG PROJECT DATA - Clear browser cache and refresh!');
      }
      
      return data as Campaign[];
    },
    staleTime: 0, // Force fresh fetch
    gcTime: 0, // Don't cache
  });
}

export function useAssignCampaignToClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      clientId, 
      previousClientId 
    }: { 
      campaignId: string; 
      clientId: string; 
      previousClientId?: string;
    }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ client_id: clientId })
        .eq('id', campaignId)
        .select(`
          *,
          clients!campaigns_client_id_fkey(name)
        `)
        .single();
      
      if (error) throw error;
      return { data, previousClientId };
    },
    onSuccess: ({ data, previousClientId }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'unassigned', APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'all', APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE] });
      if (previousClientId) {
        queryClient.invalidateQueries({ queryKey: ['campaigns', 'client', previousClientId] });
      }
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      
      if (previousClientId) {
        toast({ title: `Campaign reassigned successfully` });
      } else {
        toast({ title: 'Campaign assigned successfully' });
      }
    },
    onError: (error) => {
      toast({ 
        title: 'Error assigning campaign', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUnassignCampaignFromClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ campaignId, clientId }: { campaignId: string; clientId: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ client_id: null })
        .eq('id', campaignId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'unassigned', APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Campaign unassigned successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error unassigning campaign', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}









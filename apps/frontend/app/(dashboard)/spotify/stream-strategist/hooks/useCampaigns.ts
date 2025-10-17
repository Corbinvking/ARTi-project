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
        .from('spotify_campaigns')
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
    queryKey: ['campaigns', 'client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spotify_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns for client:', clientId, error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} campaigns for client ${clientId}`);
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
        .from('spotify_campaigns')
        .select(`
          *,
          clients!spotify_campaigns_client_id_fkey(name)
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
        .from('spotify_campaigns')
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
        .from('spotify_campaigns')
        .update({ client_id: clientId })
        .eq('id', campaignId)
        .select(`
          *,
          clients!spotify_campaigns_client_id_fkey(name)
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
        .from('spotify_campaigns')
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

export interface CreateCampaignData {
  client_id: string;
  campaign_group_name: string;
  artist_name: string;
  start_date: string;
  songs: Array<{
    track_url?: string;
    sfa_link?: string;
    campaign_name: string;
    goal: string;
    budget: string;
    vendor_id?: string;
  }>;
  total_budget: string;
  genre?: string;
  salesperson?: string;
  notes?: string;
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignData: CreateCampaignData) => {
      // Step 1: Create the campaign group
      const { data: campaignGroup, error: groupError } = await supabase
        .from('campaign_groups')
        .insert({
          client_id: campaignData.client_id,
          name: campaignData.campaign_group_name,
          artist_name: campaignData.artist_name,
          start_date: campaignData.start_date,
          total_budget: parseFloat(campaignData.total_budget),
          total_goal: campaignData.songs.reduce((sum, song) => sum + parseInt(song.goal), 0),
          status: 'Active',
          salesperson: campaignData.salesperson || null,
        })
        .select()
        .single();

      if (groupError) {
        console.error('Error creating campaign group:', groupError);
        throw groupError;
      }

      // Step 2: Create all songs linked to this campaign group
      const songInserts = campaignData.songs.map(song => ({
        campaign_group_id: campaignGroup.id,
        client_id: campaignData.client_id,
        campaign: `${campaignData.campaign_group_name} - ${song.campaign_name}`, // Combined campaign and song name
        url: song.track_url || null,
        sfa: song.sfa_link || null,
        vendor: song.vendor_id || null,
        goal: song.goal.toString(), // Keep as string
        remaining: song.goal.toString(), // Initially, remaining = goal (as string)
        sale_price: song.budget.toString(), // Use sale_price column (as string)
        start_date: campaignData.start_date,
        daily: '0', // Keep as string
        weekly: '0', // Keep as string
        notes: campaignData.notes || null,
        source: APP_CAMPAIGN_SOURCE,
        campaign_type: APP_CAMPAIGN_TYPE,
      }));

      const { data: songs, error: songsError } = await supabase
        .from('spotify_campaigns')
        .insert(songInserts)
        .select();

      if (songsError) {
        console.error('Error creating campaign songs:', songsError);
        // Rollback: delete the campaign group
        await supabase.from('campaign_groups').delete().eq('id', campaignGroup.id);
        throw songsError;
      }

      return { campaignGroup, songs };
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'client', data.campaignGroup.client_id] });
      
      toast({ 
        title: 'Campaign created successfully!',
        description: `${data.songs.length} song(s) added to the campaign.`
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Error creating campaign', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}









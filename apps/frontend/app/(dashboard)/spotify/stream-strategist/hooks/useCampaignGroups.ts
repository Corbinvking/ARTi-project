import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface CampaignSong {
  id: number;
  track_name: string;
  vendor: string;
  goal: string;
  remaining: string;
  daily: string;
  weekly: string;
  url: string;
  status: string;
  curator_status: string;
  playlists: string;
  notes: string;
  plays_last_7d: number;
  plays_last_3m: number;
  plays_last_12m: number;
  playlist_adds: number;
  saves: number;
}

export interface CampaignGroup {
  id: string;
  name: string;
  artist_name: string;
  client_id: string;
  client_name: string;
  total_goal: number;
  total_budget: number;
  total_remaining: number;
  total_daily: number;
  total_weekly: number;
  progress_percentage: number;
  start_date: string;
  end_date: string;
  status: string;
  invoice_status: string;
  salesperson: string;
  notes: string;
  songs: CampaignSong[];
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all campaign groups
 */
export function useCampaignGroups() {
  return useQuery({
    queryKey: ['campaign-groups'],
    queryFn: async () => {
      // Fetch campaign groups with aggregated metrics
      const { data: campaignGroups, error } = await supabase
        .from('campaign_groups')
        .select(`
          *,
          clients:client_id (
            id,
            name,
            emails
          )
        `)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching campaign groups:', error);
        throw error;
      }

      // For each campaign group, fetch songs and calculate metrics
      const enrichedGroups = await Promise.all(
        campaignGroups.map(async (group) => {
          const { data: songs, error: songsError } = await supabase
            .from('spotify_campaigns')
            .select('*')
            .eq('campaign_group_id', group.id);

          if (songsError) {
            console.error(`Error fetching songs for campaign ${group.id}:`, songsError);
            return {
              ...group,
              client_name: group.clients?.name || group.client_id,
              total_remaining: 0,
              total_daily: 0,
              total_weekly: 0,
              progress_percentage: 0,
              songs: []
            };
          }

          // Calculate totals
          const total_daily = songs.reduce((sum, song) => sum + (parseInt(song.daily) || 0), 0);
          const total_weekly = songs.reduce((sum, song) => sum + (parseInt(song.weekly) || 0), 0);
          
          // Calculate total_remaining - if all songs have no data yet, default to total_goal (not 0!)
          const songs_remaining_sum = songs.reduce((sum, song) => sum + (parseInt(song.remaining) || 0), 0);
          const has_any_data = songs.some(song => song.remaining && parseInt(song.remaining) > 0);
          
          // If no songs have remaining data yet, assume campaign hasn't started (remaining = goal)
          // Otherwise use the sum of all song remainings
          const total_remaining = (!has_any_data && songs_remaining_sum === 0) 
            ? group.total_goal || 0
            : songs_remaining_sum;
          
          const progress_percentage = group.total_goal > 0 
            ? Math.round(((group.total_goal - total_remaining) / group.total_goal) * 100)
            : 0;

          return {
            ...group,
            client_name: group.clients?.name || group.client_id,
            total_remaining,
            total_daily,
            total_weekly,
            progress_percentage,
            songs: songs || []
          };
        })
      );

      return enrichedGroups as CampaignGroup[];
    },
  });
}

/**
 * Fetch single campaign group with songs
 */
export function useCampaignGroup(campaignGroupId: string) {
  return useQuery({
    queryKey: ['campaign-group', campaignGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_campaign_group_with_songs', { campaign_group_id_param: campaignGroupId })
        .single();

      if (error) {
        console.error('Error fetching campaign group:', error);
        throw error;
      }

      return data as unknown as CampaignGroup;
    },
    enabled: !!campaignGroupId,
  });
}

/**
 * Fetch campaign groups for a specific client
 */
export function useClientCampaignGroups(clientId: string) {
  return useQuery({
    queryKey: ['campaign-groups', 'client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_client_campaigns', { client_id_param: clientId });

      if (error) {
        console.error('Error fetching client campaigns:', error);
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} campaign groups for client ${clientId}`);
      return data as unknown as CampaignGroup[];
    },
    enabled: !!clientId,
  });
}

/**
 * Create a new campaign group
 */
export function useCreateCampaignGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignGroup: Partial<CampaignGroup>) => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .insert(campaignGroup)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
    },
  });
}

/**
 * Update campaign group
 */
export function useUpdateCampaignGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-group', data.id] });
    },
  });
}

/**
 * Delete campaign group
 */
export function useDeleteCampaignGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaign_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
    },
  });
}


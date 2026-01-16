"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

export interface Playlist {
  id: string;
  vendor_id: string;
  name: string;
  url: string;
  genres: string[];
  avg_daily_streams: number;
  follower_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePlaylistData {
  name: string;
  url: string;
  genres: string[];
  avg_daily_streams: number;
  follower_count?: number;
}

// Fetch playlists for current vendor user
export function useMyPlaylists() {
  return useQuery({
    queryKey: ['my-playlists'],
    staleTime: 60000, // Cache for 1 minute
    gcTime: 120000, // Keep in cache for 2 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      console.log('🔍 useMyPlaylists: Starting query...');
      
      // Get all vendor mappings for current user and prefer "Club Restricted"
      const { data: mappings, error: vendorError } = await supabase
        .from('vendor_users')
        .select('vendor_id, vendors ( id, name )');

      console.log('📦 Vendor mappings:', mappings, 'Error:', vendorError);

      if (vendorError) throw vendorError;
      const rows = (mappings as any[]) || [];
      if (rows.length === 0) {
        console.log('⚠️ No vendor mappings found');
        return [];
      }

      const preferred = rows.find((r: any) => r.vendors?.name === 'Club Restricted') || rows[0];
      const vendorId = preferred.vendor_id as string;
      console.log('✅ Using vendor:', preferred.vendors?.name, 'ID:', vendorId);

      // Then get playlists for this vendor
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('name');

      console.log('📋 Playlists query result:', data, 'Error:', error);

      if (error) throw error;
      return data as Playlist[];
    },
  });
}

// Create playlist for current vendor
export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistData: CreatePlaylistData) => {
      // Determine preferred vendor (Club Restricted if available)
      const { data: mappings, error: vendorError } = await supabase
        .from('vendor_users')
        .select('vendor_id, vendors ( id, name )');

      if (vendorError) throw vendorError;
      const rows = (mappings as any[]) || [];
      if (rows.length === 0) throw new Error('No vendor association found');

      const preferred = rows.find((r: any) => r.vendors?.name === 'Club Restricted') || rows[0];
      const vendorId = preferred.vendor_id as string;

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          ...playlistData,
          vendor_id: vendorId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      toast.success('Playlist added successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create playlist: ${error.message}`);
    },
  });
}

// Update playlist
export function useUpdatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<CreatePlaylistData>) => {
      const { data, error } = await supabase
        .from('playlists')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      toast.success('Playlist updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update playlist: ${error.message}`);
    },
  });
}

// Delete playlist
export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      toast.success('Playlist deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete playlist: ${error.message}`);
    },
  });
}









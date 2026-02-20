'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

const NICHES_QUERY_KEY = ['niches'];

export function useNiches() {
  const queryClient = useQueryClient();

  const { data: niches = [], isLoading } = useQuery({
    queryKey: NICHES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('niches')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Failed to fetch niches:', error);
        return [];
      }

      return (data || []).map((n: { id: string; name: string }) => n.name);
    },
    staleTime: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Niche name cannot be empty');

      const { error } = await supabase
        .from('niches')
        .insert({ name: trimmed });

      if (error) {
        if (error.code === '23505') throw new Error('Niche already exists');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NICHES_QUERY_KEY });
      window.dispatchEvent(new CustomEvent('tagsUpdated'));
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('niches')
        .delete()
        .eq('name', name);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NICHES_QUERY_KEY });
      window.dispatchEvent(new CustomEvent('tagsUpdated'));
    },
  });

  return {
    niches,
    isLoading,
    addNiche: addMutation.mutateAsync,
    removeNiche: removeMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

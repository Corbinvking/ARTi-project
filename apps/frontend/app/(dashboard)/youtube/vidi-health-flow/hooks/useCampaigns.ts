import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "../integrations/supabase/client";
import type { Database } from "../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];
type Client = Database['public']['Tables']['clients']['Row'];
type Salesperson = Database['public']['Tables']['salespersons']['Row'];

export const useCampaigns = () => {
  const queryClient = useQueryClient();

  // React Query hooks for centralized data management
  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            company
          ),
          salespersons (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  const salespersonsQuery = useQuery({
    queryKey: ['salespersons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salespersons')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Map React Query results to legacy hook API
  const campaigns = campaignsQuery.data || [];
  const clients = clientsQuery.data || [];
  const salespersons = salespersonsQuery.data || [];
  const loading = campaignsQuery.isLoading || clientsQuery.isLoading || salespersonsQuery.isLoading;

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
      queryClient.invalidateQueries({ queryKey: ['clients'] }),
      queryClient.invalidateQueries({ queryKey: ['salespersons'] })
    ]);
  };

  useEffect(() => {
    // Set up real-time subscriptions with query invalidation
    const campaignsChannel = supabase
      .channel('campaigns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, (payload) => {
        console.log('Campaign real-time event:', payload);
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      })
      .subscribe((status) => {
        console.log('Campaigns channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.warn('Failed to subscribe to campaigns channel');
        }
      });

    const clientsChannel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
        console.log('Client real-time event:', payload);
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      })
      .subscribe((status) => {
        console.log('Clients channel status:', status);
      });

    const salespersonsChannel = supabase
      .channel('salespersons-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salespersons' }, (payload) => {
        console.log('Salesperson real-time event:', payload);
        queryClient.invalidateQueries({ queryKey: ['salespersons'] });
      })
      .subscribe((status) => {
        console.log('Salespersons channel status:', status);
      });

    return () => {
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(salespersonsChannel);
    };
  }, [queryClient]);

  const createCampaign = async (campaignData: CampaignInsert) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;
      
      // Immediately invalidate campaigns cache for instant UI update
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      // Trigger immediate YouTube stats fetch for the new campaign
      if (data?.video_id) {
        try {
          await triggerYouTubeStatsFetch(data.id);
        } catch (statsError) {
          console.warn('Failed to fetch initial YouTube stats:', statsError);
          // Don't fail the campaign creation if stats fetch fails
        }
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return { data: null, error };
    }
  };

  const triggerYouTubeStatsFetch = async (campaignId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch_youtube_stats', {
        body: campaignId ? { campaignId } : {}
      });

      if (error) throw error;
      console.log('YouTube stats fetch result:', data);
      
      // Invalidate campaigns cache after stats update
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      return { data, error: null };
    } catch (error) {
      console.error('Error triggering YouTube stats fetch:', error);
      return { data: null, error };
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      return { data, error: null };
    } catch (error) {
      console.error('Error updating campaign:', error);
      return { data: null, error };
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      return { error: null };
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return { error };
    }
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'youtube_access_requested' | 'youtube_access_requested_at'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      return { data, error: null };
    } catch (error) {
      console.error('Error creating client:', error);
      return { data: null, error };
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      return { data, error: null };
    } catch (error) {
      console.error('Error updating client:', error);
      return { data: null, error };
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      return { error: null };
    } catch (error) {
      console.error('Error deleting client:', error);
      return { error };
    }
  };

  const requestYouTubeAccess = async (clientId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send_youtube_access_request', {
        body: { clientId }
      });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      return { data, error: null };
    } catch (error) {
      console.error('Error requesting YouTube access:', error);
      return { data: null, error };
    }
  };

  return {
    campaigns,
    clients,
    salespersons,
    loading,
    refreshData,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createClient,
    updateClient,
    deleteClient,
    requestYouTubeAccess,
    triggerYouTubeStatsFetch
  };
};
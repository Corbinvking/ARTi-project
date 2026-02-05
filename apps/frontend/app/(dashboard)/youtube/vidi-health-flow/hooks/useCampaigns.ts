import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "../integrations/supabase/client";
import type { Database } from "../integrations/supabase/types";
import { getApiUrl } from "../lib/getApiUrl";
import { notifyOpsCampaignCreated } from "@/lib/status-notify";

// Use YouTube-specific table types
type Campaign = Database['public']['Tables']['youtube_campaigns']['Row'] & {
  youtube_clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  youtube_salespersons?: { id: string; name: string; email: string | null } | null;
};
type CampaignInsert = Database['public']['Tables']['youtube_campaigns']['Insert'];
type Client = Database['public']['Tables']['youtube_clients']['Row'];
type Salesperson = Database['public']['Tables']['youtube_salespersons']['Row'];

export const useCampaigns = () => {
  const queryClient = useQueryClient();

  // React Query hooks for centralized data management - QUERY YOUTUBE TABLES
  const campaignsQuery = useQuery({
    queryKey: ['youtube-campaigns'],
    queryFn: async () => {
      console.log('🎬 Fetching YouTube campaigns...');
      const { data, error } = await supabase
        .from('youtube_campaigns')
        .select(`
          *,
          youtube_clients (
            id,
            name,
            email,
            company
          ),
          youtube_salespersons (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching YouTube campaigns:', error);
        throw error;
      }
      console.log('✅ YouTube campaigns fetched:', data?.length || 0);
      return data || [];
    },
  });

  const clientsQuery = useQuery({
    queryKey: ['youtube-clients'],
    queryFn: async () => {
      console.log('👥 Fetching YouTube clients...');
      const { data, error } = await supabase
        .from('youtube_clients')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Error fetching YouTube clients:', error);
        throw error;
      }
      console.log('✅ YouTube clients fetched:', data?.length || 0);
      return data || [];
    },
  });

  const salespersonsQuery = useQuery({
    queryKey: ['youtube-salespersons'],
    queryFn: async () => {
      console.log('💼 Fetching YouTube salespersons...');
      const { data, error } = await supabase
        .from('youtube_salespersons')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Error fetching YouTube salespersons:', error);
        throw error;
      }
      console.log('✅ YouTube salespersons fetched:', data?.length || 0);
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
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] }),
      queryClient.invalidateQueries({ queryKey: ['youtube-clients'] }),
      queryClient.invalidateQueries({ queryKey: ['youtube-salespersons'] })
    ]);
  };

  // DISABLED: Real-time subscriptions causing CHANNEL_ERROR
  // Can be re-enabled once proper RLS policies are configured
  // useEffect(() => {
  //   // Set up real-time subscriptions with query invalidation - YOUTUBE TABLES
  //   const campaignsChannel = supabase
  //     .channel('youtube-campaigns-changes')
  //     .on('postgres_changes', { event: '*', schema: 'public', table: 'youtube_campaigns' }, (payload) => {
  //       console.log('🎬 YouTube Campaign real-time event:', payload);
  //       queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
  //     })
  //     .subscribe((status) => {
  //       console.log('YouTube Campaigns channel status:', status);
  //       if (status === 'CHANNEL_ERROR') {
  //         console.warn('Failed to subscribe to YouTube campaigns channel');
  //       }
  //     });

  //   const clientsChannel = supabase
  //     .channel('youtube-clients-changes')
  //     .on('postgres_changes', { event: '*', schema: 'public', table: 'youtube_clients' }, (payload) => {
  //       console.log('👥 YouTube Client real-time event:', payload);
  //       queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });
  //     })
  //     .subscribe((status) => {
  //       console.log('YouTube Clients channel status:', status);
  //     });

  //   const salespersonsChannel = supabase
  //     .channel('youtube-salespersons-changes')
  //     .on('postgres_changes', { event: '*', schema: 'public', table: 'youtube_salespersons' }, (payload) => {
  //       console.log('💼 YouTube Salesperson real-time event:', payload);
  //       queryClient.invalidateQueries({ queryKey: ['youtube-salespersons'] });
  //     })
  //     .subscribe((status) => {
  //       console.log('YouTube Salespersons channel status:', status);
  //     });

  //   return () => {
  //     supabase.removeChannel(campaignsChannel);
  //     supabase.removeChannel(clientsChannel);
  //     supabase.removeChannel(salespersonsChannel);
  //   };
  // }, [queryClient]);

  // Default org ID used for all youtube tables
  const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

  const createCampaign = async (campaignData: CampaignInsert) => {
    try {
      // Ensure org_id is set for RLS policy compliance
      const dataWithOrg = {
        ...campaignData,
        org_id: DEFAULT_ORG_ID
      };
      
      const { data, error } = await supabase
        .from('youtube_campaigns')
        .insert(dataWithOrg)
        .select()
        .single();

      if (error) throw error;
      
      // Immediately invalidate campaigns cache for instant UI update
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
      
      // Trigger immediate YouTube stats fetch for the new campaign
      if (data?.video_id || data?.youtube_url) {
        try {
          await triggerYouTubeStatsFetch(data.id);
        } catch (statsError) {
          console.warn('Failed to fetch initial YouTube stats:', statsError);
          // Don't fail the campaign creation if stats fetch fails
        }
      }
      
      // Notify ops about new campaign creation
      try {
        await notifyOpsCampaignCreated({
          service: 'youtube',
          campaignId: data.id,
          campaignName: data.campaign_name,
          youtubeUrl: data.youtube_url,
          clientName: null, // Will be enhanced when client info is available
          actorEmail: null, // Can be passed from component if needed
        });
      } catch (notifyError) {
        console.warn('Failed to send campaign creation notification:', notifyError);
        // Don't fail the campaign creation if notification fails
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error creating YouTube campaign:', error);
      return { data: null, error };
    }
  };

  const triggerYouTubeStatsFetch = async (campaignId?: string) => {
    try {
      if (!campaignId) {
        throw new Error('campaignId is required');
      }

      // Fetch the campaign's YouTube URL so we can call the API route that already exists
      const { data: campaign, error: campaignError } = await supabase
        .from('youtube_campaigns')
        .select('youtube_url')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      if (!campaign?.youtube_url) throw new Error('Campaign is missing youtube_url');

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/youtube-data-api/fetch-video-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: campaign.youtube_url, campaignId }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to fetch stats (HTTP ${response.status}). ${text}`);
      }

      const result = await response.json();
      console.log('YouTube stats fetch result:', result);
      
      // Invalidate campaigns cache after stats update
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
      
      return { data: result, error: null };
    } catch (error) {
      console.error('Error triggering YouTube stats fetch:', error);
      return { data: null, error };
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const { data, error } = await supabase
        .from('youtube_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
      return { data, error: null };
    } catch (error) {
      console.error('Error updating YouTube campaign:', error);
      return { data: null, error };
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('youtube_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] });
      return { error: null };
    } catch (error) {
      console.error('Error deleting YouTube campaign:', error);
      return { error };
    }
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Ensure org_id is set for RLS policy compliance
      const dataWithOrg = {
        ...clientData,
        org_id: DEFAULT_ORG_ID
      };
      
      const { data, error } = await supabase
        .from('youtube_clients')
        .insert(dataWithOrg)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });
      return { data, error: null };
    } catch (error) {
      console.error('Error creating YouTube client:', error);
      return { data: null, error };
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { data, error } = await supabase
        .from('youtube_clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });
      return { data, error: null };
    } catch (error) {
      console.error('Error updating YouTube client:', error);
      return { data: null, error };
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('youtube_clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });
      return { error: null };
    } catch (error) {
      console.error('Error deleting YouTube client:', error);
      return { error };
    }
  };

  const requestYouTubeAccess = async (clientId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send_youtube_access_request', {
        body: { clientId }
      });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-clients'] });
      return { data, error: null };
    } catch (error) {
      console.error('Error requesting YouTube access:', error);
      return { data: null, error };
    }
  };

  // SALESPERSON CRUD OPERATIONS
  const createSalesperson = async (salespersonData: Omit<Salesperson, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Ensure org_id is set for RLS policy compliance
      const dataWithOrg = {
        ...salespersonData,
        org_id: DEFAULT_ORG_ID
      };
      
      const { data, error } = await supabase
        .from('youtube_salespersons')
        .insert(dataWithOrg)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-salespersons'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] }); // Campaigns have salesperson relations
      return { data, error: null };
    } catch (error) {
      console.error('Error creating YouTube salesperson:', error);
      return { data: null, error };
    }
  };

  const updateSalesperson = async (id: string, updates: Partial<Salesperson>) => {
    try {
      const { data, error } = await supabase
        .from('youtube_salespersons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-salespersons'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] }); // Campaigns have salesperson relations
      return { data, error: null };
    } catch (error) {
      console.error('Error updating YouTube salesperson:', error);
      return { data: null, error };
    }
  };

  const deleteSalesperson = async (id: string) => {
    try {
      const { error } = await supabase
        .from('youtube_salespersons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['youtube-salespersons'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-campaigns'] }); // Campaigns might reference deleted salesperson
      return { error: null };
    } catch (error) {
      console.error('Error deleting YouTube salesperson:', error);
      return { error };
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
    createSalesperson,
    updateSalesperson,
    deleteSalesperson,
    requestYouTubeAccess,
    triggerYouTubeStatsFetch
  };
};
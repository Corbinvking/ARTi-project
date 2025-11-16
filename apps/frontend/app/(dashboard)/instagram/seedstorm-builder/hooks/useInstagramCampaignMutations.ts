import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from './use-toast';

export interface CampaignInput {
  campaign?: string;
  clients?: string;
  start_date?: string;
  price?: string;
  spend?: string;
  remaining?: string;
  sound_url?: string;
  status?: string;
  tracker?: string;
  campaign_started?: string;
  send_tracker?: string;
  send_final_report?: string;
  invoice?: string;
  salespeople?: string;
  report_notes?: string;
  client_notes?: string;
  paid_ops?: string;
}

export function useInstagramCampaignMutations() {
  const queryClient = useQueryClient();

  // Create Campaign
  const createCampaign = useMutation({
    mutationFn: async (input: CampaignInput) => {
      console.log('📝 Creating new Instagram campaign:', input);
      
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .insert([{
          ...input,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating campaign:', error);
        throw error;
      }

      console.log('✅ Campaign created:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-campaigns'] });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
    },
    onError: (error: any) => {
      console.error('❌ Create campaign error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  // Update Campaign
  const updateCampaign = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<CampaignInput> }) => {
      console.log('✏️ Updating campaign:', id, updates);
      
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating campaign:', error);
        throw error;
      }

      console.log('✅ Campaign updated:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-campaigns'] });
      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('❌ Update campaign error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  // Delete Campaign
  const deleteCampaign = useMutation({
    mutationFn: async (id: number) => {
      console.log('🗑️ Deleting campaign:', id);
      
      const { error } = await supabase
        .from('instagram_campaigns')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting campaign:', error);
        throw error;
      }

      console.log('✅ Campaign deleted:', id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-campaigns'] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error('❌ Delete campaign error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  // Quick update status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      console.log('🔄 Updating campaign status:', id, status);
      
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-campaigns'] });
      toast({
        title: "Success",
        description: "Status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  return {
    createCampaign: createCampaign.mutate,
    createCampaignAsync: createCampaign.mutateAsync,
    updateCampaign: updateCampaign.mutate,
    updateCampaignAsync: updateCampaign.mutateAsync,
    deleteCampaign: deleteCampaign.mutate,
    deleteCampaignAsync: deleteCampaign.mutateAsync,
    updateStatus: updateStatus.mutate,
    updateStatusAsync: updateStatus.mutateAsync,
    isCreating: createCampaign.isPending,
    isUpdating: updateCampaign.isPending,
    isDeleting: deleteCampaign.isPending,
  };
}


import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../hooks/use-toast';
import { useWorkflowOrchestration } from './useWorkflowOrchestration';

export interface CampaignCreator {
  id: string;
  campaign_id: string;
  creator_id: string;
  instagram_handle: string;
  rate: number;
  posts_count: number;
  post_type: string;
  payment_status: 'unpaid' | 'pending' | 'paid';
  post_status: 'not_posted' | 'scheduled' | 'posted';
  approval_status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  payment_notes?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
}

export const useCampaignCreators = (campaignId?: string) => {
  const [creators, setCreators] = useState<CampaignCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const { executeWorkflowRules, checkCampaignCompletion } = useWorkflowOrchestration();

  const fetchCreators = async () => {
    if (!campaignId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_creators')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('instagram_handle');

      if (error) throw error;
      setCreators((data || []).map(creator => ({
        ...creator,
        payment_status: creator.payment_status as CampaignCreator['payment_status'],
        post_status: creator.post_status as CampaignCreator['post_status'],
        approval_status: creator.approval_status as CampaignCreator['approval_status']
      })));
    } catch (error) {
      console.error('Error fetching campaign creators:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign creators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCreatorStatus = async (
    creatorId: string,
    updates: Partial<Pick<CampaignCreator, 'payment_status' | 'post_status' | 'approval_status' | 'payment_notes' | 'approval_notes'>>
  ) => {
    try {
      // Find the current creator for workflow rule execution
      const currentCreator = creators.find(c => c.id === creatorId);
      
      const { error } = await supabase
        .from('campaign_creators')
        .update(updates)
        .eq('id', creatorId);

      if (error) throw error;
      
      // Execute workflow rules for potential cascade updates
      const cascadeUpdates = await executeWorkflowRules(creatorId, updates, currentCreator);
      
      // Update local state with both original and cascade updates
      const finalUpdates = { ...updates, ...cascadeUpdates };
      setCreators(prev => prev.map(creator => 
        creator.id === creatorId 
          ? { ...creator, ...finalUpdates }
          : creator
      ));

      // Check if campaign completion status should be updated
      if (campaignId && (updates.approval_status || updates.post_status)) {
        await checkCampaignCompletion(campaignId);
      }

      toast({
        title: "Status Updated",
        description: "Creator status updated successfully",
      });
    } catch (error) {
      console.error('Error updating creator status:', error);
      toast({
        title: "Error",
        description: "Failed to update creator status",
        variant: "destructive",
      });
    }
  };

  const bulkUpdateStatus = async (
    creatorIds: string[],
    updates: Partial<Pick<CampaignCreator, 'payment_status' | 'post_status' | 'approval_status'>>
  ) => {
    try {
      const { error } = await supabase
        .from('campaign_creators')
        .update(updates)
        .in('id', creatorIds);

      if (error) throw error;
      
      // Update local state
      setCreators(prev => prev.map(creator => 
        creatorIds.includes(creator.id)
          ? { ...creator, ...updates }
          : creator
      ));

      toast({
        title: "Bulk Update Complete",
        description: `Updated ${creatorIds.length} creator(s) successfully`,
      });
    } catch (error) {
      console.error('Error bulk updating creators:', error);
      toast({
        title: "Error",
        description: "Failed to bulk update creators",
        variant: "destructive",
      });
    }
  };

  const syncCampaignCreators = async (campaignId: string, selectedCreators: any[]) => {
    try {
      // Validate input - ensure selectedCreators is an array
      if (!Array.isArray(selectedCreators)) {
        console.error('syncCampaignCreators: selectedCreators is not an array:', selectedCreators);
        throw new Error('selectedCreators must be an array');
      }

      // Get existing creators for this campaign
      const { data: existing, error: fetchError } = await supabase
        .from('campaign_creators')
        .select('creator_id')
        .eq('campaign_id', campaignId);

      if (fetchError) throw fetchError;

      const existingIds = new Set(existing?.map(c => c.creator_id) || []);
      const newCreators = selectedCreators.filter(creator => !existingIds.has(creator.id));

      if (newCreators.length > 0) {
        const { error: insertError } = await supabase
          .from('campaign_creators')
          .insert(
            newCreators.map(creator => ({
              campaign_id: campaignId,
              creator_id: creator.id,
              instagram_handle: creator.instagram_handle,
              rate: creator.campaign_rate || creator.reel_rate || 0,
              posts_count: creator.posts_count || 1,
              post_type: creator.selected_post_type || 'reel',
            }))
          );

        if (insertError) throw insertError;
      }

      await fetchCreators();
    } catch (error) {
      console.error('Error syncing campaign creators:', error);
      toast({
        title: "Error",
        description: "Failed to sync campaign creators",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchCreators();
    }
  }, [campaignId]);

  return {
    creators,
    loading,
    updateCreatorStatus,
    bulkUpdateStatus,
    syncCampaignCreators,
    refetch: fetchCreators,
  };
};
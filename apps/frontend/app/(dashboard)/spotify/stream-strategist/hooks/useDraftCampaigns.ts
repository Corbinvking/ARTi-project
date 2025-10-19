"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

// Hook to get draft campaigns created from submissions
export function useDraftCampaigns() {
  return useQuery({
    queryKey: ['draft-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .select(`
          *,
          submission:campaign_submissions!submission_id(*)
        `)
        .eq('pending_operator_review', true)
        .order('created_at', { ascending: false })
        .limit(25); // Add limit for better performance

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Hook to get submissions with their related draft campaigns
export function useSubmissionsWithDrafts() {
  return useQuery({
    queryKey: ['submissions-with-drafts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_submissions')
        .select(`
          *,
          campaign:campaigns!submission_id(
            id,
            status,
            pending_operator_review,
            created_at,
            updated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook to approve a draft campaign (moves it out of pending review)
export function useApproveDraftCampaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('campaign_groups')
        .update({ 
          pending_operator_review: false,
          status: 'Active',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Draft Approved",
        description: "Campaign moved to built status and ready for launch.",
      });
      queryClient.invalidateQueries({ queryKey: ['draft-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['submissions-with-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve draft campaign.",
        variant: "destructive",
      });
    },
  });
}

// Hook to reject a draft campaign (sends it back to pending with notes)
export function useRejectDraftCampaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, reason }: { campaignId: string; reason: string }) => {
      // Update the campaign with rejection notes
      const { error } = await supabase
        .from('campaign_groups')
        .update({ 
          status: 'Draft',
          pending_operator_review: true,
          // Store rejection reason in algorithm_recommendations for now
          algorithm_recommendations: {
            rejection_reason: reason,
            rejected_at: new Date().toISOString(),
            rejected_by: 'operator'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Draft Rejected",
        description: "Campaign sent back with feedback for revision.",
      });
      queryClient.invalidateQueries({ queryKey: ['draft-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['submissions-with-drafts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject draft campaign.",
        variant: "destructive",
      });
    },
  });
}









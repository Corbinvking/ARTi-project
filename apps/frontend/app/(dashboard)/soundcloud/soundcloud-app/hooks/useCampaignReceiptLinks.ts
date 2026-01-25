import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CampaignReceiptLink {
  id: string;
  campaign_id?: string;
  submission_id?: string;
  supporter_name: string;
  supporter_handle: string;
  reach_amount: number;
  proof_url: string | null;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReceiptLinkData {
  campaign_id?: string;
  submission_id?: string;
  supporter_name: string;
  supporter_handle: string;
  reach_amount: number;
  proof_url?: string;
  scheduled_date?: string;
  status?: string;
}

export const useReceiptLinks = (campaignId?: string, submissionId?: string) => {
  const [receiptLinks, setReceiptLinks] = useState<CampaignReceiptLink[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReceiptLinks = async (id: string, type: 'campaign' | 'submission') => {
    setLoading(true);
    try {
      const column = type === 'campaign' ? 'campaign_id' : 'submission_id';
      const { data, error } = await supabase
        .from('campaign_receipt_links')
        .select('*')
        .eq(column, id)
        .order('created_at', { ascending: false });

      if (error) {
        // Handle case where table doesn't exist - return empty data silently
        if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('campaign_receipt_links table not found, using empty data');
          setReceiptLinks([]);
          return;
        }
        throw error;
      }
      setReceiptLinks(data || []);
    } catch (error: any) {
      // Only show error for unexpected errors
      if (!error?.message?.includes('404') && !error?.message?.includes('does not exist')) {
        toast({
          title: "Error loading receipt links",
          description: error.message,
          variant: "destructive"
        });
      }
      setReceiptLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const addReceiptLink = async (data: CreateReceiptLinkData) => {
    try {
      const { data: newLink, error } = await supabase
        .from('campaign_receipt_links')
        .insert([data as any])
        .select()
        .single();

      if (error) throw error;
      
      setReceiptLinks(prev => [newLink, ...prev]);
      toast({
        title: "Receipt link added",
        description: "Campaign receipt link has been successfully added."
      });
      return newLink;
    } catch (error: any) {
      toast({
        title: "Error adding receipt link",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateReceiptLink = async (id: string, updates: Partial<CampaignReceiptLink>) => {
    try {
      const { data, error } = await supabase
        .from('campaign_receipt_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setReceiptLinks(prev => prev.map(link => 
        link.id === id ? { ...link, ...updates } : link
      ));
      toast({
        title: "Receipt link updated",
        description: "Campaign receipt link has been successfully updated."
      });
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating receipt link",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteReceiptLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaign_receipt_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setReceiptLinks(prev => prev.filter(link => link.id !== id));
      toast({
        title: "Receipt link deleted",
        description: "Campaign receipt link has been successfully deleted."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting receipt link",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const getTotalReach = () => {
    return receiptLinks.reduce((total, link) => total + link.reach_amount, 0);
  };

  useEffect(() => {
    if (campaignId) {
      fetchReceiptLinks(campaignId, 'campaign');
    } else if (submissionId) {
      fetchReceiptLinks(submissionId, 'submission');
    }
  }, [campaignId, submissionId]);

  return {
    receiptLinks,
    loading,
    addReceiptLink,
    updateReceiptLink,
    deleteReceiptLink,
    getTotalReach,
    refetch: () => {
      if (campaignId) {
        fetchReceiptLinks(campaignId, 'campaign');
      } else if (submissionId) {
        fetchReceiptLinks(submissionId, 'submission');
      }
    }
  };
};

// Legacy export for backwards compatibility
export const useCampaignReceiptLinks = (campaignId?: string) => {  
  return useReceiptLinks(campaignId, undefined);
};
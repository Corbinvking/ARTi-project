import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifyOpsStatusChange } from '@/lib/status-notify';

export interface SubmissionWithMember {
  id: string;
  track_url: string;
  artist_name: string;
  track_name: string;
  status: string;
  family: string;
  subgenres: string[];
  submitted_at: string;
  expected_reach_planned: number;
  expected_reach_min: number;
  expected_reach_max: number;
  support_date: string;
  scheduled_date: string | null;
  notes: string;
  qa_reason: string;
  need_live_link: boolean;
  support_url: string;
  member_id: string;
  members: {
    id: string;
    name: string;
    primary_email: string;
    size_tier: string;
    status: string;
    net_credits: number;
    soundcloud_followers: number;
    repost_credit_wallet: {
      balance: number;
      monthly_grant: number;
    };
  };
}

export const useSubmissionsList = (status?: string | 'all') => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<SubmissionWithMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    try {
      let query = supabase
        .from('submissions')
        .select(`
          id,
          track_url,
          artist_name,
          track_name,
          status,
          family,
          subgenres,
          submitted_at,
          expected_reach_planned,
          expected_reach_min,
          expected_reach_max,
          support_date,
          scheduled_date,
          notes,
          qa_reason,
          need_live_link,
          support_url,
          member_id,
          members!inner(
            id,
            name,
            primary_email,
            size_tier,
            status,
            net_credits,
            soundcloud_followers,
            repost_credit_wallet!inner(balance, monthly_grant)
          )
        `)
        .order('submitted_at', { ascending: false });

      if (status && status !== 'all' && status !== 'undefined') {
        query = query.eq('status', status as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSubmissions(data as SubmissionWithMember[]);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, newStatus: string, suggestedSupporters?: string[]) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (suggestedSupporters && suggestedSupporters.length > 0) {
        updateData.suggested_supporters = suggestedSupporters;
      }

      const { error } = await supabase
        .from('submissions')
        .update(updateData)
        .eq('id', submissionId);

      if (error) throw error;

      // Refresh submissions
      await fetchSubmissions();

      toast({
        title: "Success",
        description: `Submission status updated to ${newStatus}`,
      });

      await notifyOpsStatusChange({
        service: 'soundcloud',
        campaignId: submissionId,
        status: newStatus,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: "Failed to update submission",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [status]);

  return {
    submissions,
    loading,
    refetch: fetchSubmissions,
    updateSubmissionStatus,
  };
};
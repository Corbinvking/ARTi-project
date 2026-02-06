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
    } | null;
  };
}

export const useSubmissionsList = (status?: string | 'all') => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<SubmissionWithMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    try {
      // Query soundcloud_submissions with aliased join to soundcloud_members
      // Alias followers → soundcloud_followers so downstream components work
      // net_credits serves as the balance (no separate wallet table exists)
      let query = supabase
        .from('soundcloud_submissions')
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
          members:soundcloud_members!member_id(
            id,
            name,
            primary_email,
            size_tier,
            status,
            net_credits,
            soundcloud_followers:followers,
            monthly_credit_limit
          )
        `)
        .order('submitted_at', { ascending: false });

      if (status && status !== 'all' && status !== 'undefined') {
        query = query.eq('status', status as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map the data to add a virtual repost_credit_wallet for backward compat
      const mapped = (data || []).map((row: any) => ({
        ...row,
        members: row.members ? {
          ...row.members,
          repost_credit_wallet: {
            balance: row.members.net_credits || 0,
            monthly_grant: row.members.monthly_credit_limit || 0,
          },
        } : row.members,
      }));

      setSubmissions(mapped as SubmissionWithMember[]);
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
        .from('soundcloud_submissions')
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

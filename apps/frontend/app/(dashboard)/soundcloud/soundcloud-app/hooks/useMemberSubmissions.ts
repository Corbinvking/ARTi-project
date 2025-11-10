import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

export interface MemberSubmissionStats {
  totalSubmissions: number;
  thisMonthSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  recentSubmissions: Array<{
    id: string;
    track_url: string;
    artist_name: string;
    status: string;
    submitted_at: string;
  }>;
}

export const useMemberSubmissions = () => {
  const { member } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<MemberSubmissionStats>({
    totalSubmissions: 0,
    thisMonthSubmissions: 0,
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
    recentSubmissions: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchMemberStats = async () => {
    if (!member?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all submissions for the member
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('id, track_url, artist_name, status, submitted_at')
        .eq('member_id', member.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const newStats = {
        totalSubmissions: submissions.length,
        thisMonthSubmissions: submissions.filter(s => 
          new Date(s.submitted_at) >= startOfMonth
        ).length,
        pendingSubmissions: submissions.filter(s => 
          ['new', 'pending', 'qa_flag'].includes(s.status)
        ).length,
        approvedSubmissions: submissions.filter(s => s.status === 'approved').length,
        rejectedSubmissions: submissions.filter(s => s.status === 'rejected').length,
        recentSubmissions: submissions.slice(0, 5),
      };

      setStats(newStats);
    } catch (error: any) {
      console.error('Error fetching member stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your submission statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberStats();
  }, [member?.id]);

  return { stats, loading, refetch: fetchMemberStats };
};
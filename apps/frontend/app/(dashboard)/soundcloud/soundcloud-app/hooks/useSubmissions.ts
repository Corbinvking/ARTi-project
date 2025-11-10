import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubmissionStats {
  total: number;
  new: number;
  pending: number;
  approved: number;
  rejected: number;
  qa_flag: number;
}

export const useSubmissions = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<SubmissionStats>({
    total: 0,
    new: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    qa_flag: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('status');

      if (error) throw error;

      const newStats = {
        total: data.length,
        new: data.filter(s => s.status === 'new').length,
        pending: data.filter(s => (s.status as string) === 'pending').length,
        approved: data.filter(s => s.status === 'approved').length,
        rejected: data.filter(s => s.status === 'rejected').length,
        qa_flag: data.filter(s => (s.status as string) === 'qa_flag').length,
      };

      setStats(newStats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch submission statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
};
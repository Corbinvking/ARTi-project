import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubmissionStats {
  total: number;
  pending: number;
  ready: number;
  active: number;
  complete: number;
  on_hold: number;
  qa_flag: number;
}

export const useSubmissions = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<SubmissionStats>({
    total: 0,
    pending: 0,
    ready: 0,
    active: 0,
    complete: 0,
    on_hold: 0,
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
        pending: data.filter(s => (s.status as string) === 'pending').length,
        ready: data.filter(s => (s.status as string) === 'ready').length,
        active: data.filter(s => (s.status as string) === 'active').length,
        complete: data.filter(s => (s.status as string) === 'complete').length,
        on_hold: data.filter(s => (s.status as string) === 'on_hold').length,
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
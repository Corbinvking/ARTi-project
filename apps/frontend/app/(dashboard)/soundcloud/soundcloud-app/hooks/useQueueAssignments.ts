import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QueueAssignment {
  id: string;
  position: number;
  status: string;
  credits_allocated: number;
  proof_url: string | null;
  completed_at: string | null;
  members: {
    id: string;
    name: string;
    soundcloud_followers: number;
  } | null;
}

export const useQueueAssignments = (submissionId: string | null) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<QueueAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignments = async () => {
    if (!submissionId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('queue_assignments')
        .select(`
          id,
          position,
          status,
          credits_allocated,
          proof_url,
          completed_at,
          members!supporter_id (
            id,
            name,
            soundcloud_followers
          )
        `)
        .eq('submission_id', submissionId)
        .order('position', { ascending: true });

      if (error) throw error;

      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error fetching queue assignments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reposting assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [submissionId]);

  return { assignments, loading, refetch: fetchAssignments };
};
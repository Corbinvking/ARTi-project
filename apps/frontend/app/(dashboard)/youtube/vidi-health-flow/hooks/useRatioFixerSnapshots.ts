import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export interface RatioFixerSnapshot {
  id: number;
  campaign_id: string;
  recorded_at: string;
  views: number;
  likes: number;
  comments: number;
  ordered_likes: number;
  ordered_comments: number;
  desired_likes: number;
  desired_comments: number;
  flask_status: string | null;
}

export function useRatioFixerSnapshots(campaignId: string | undefined, enabled = true) {
  return useQuery<RatioFixerSnapshot[]>({
    queryKey: ['ratio-fixer-snapshots', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('ratio_fixer_snapshots')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('recorded_at', { ascending: true })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as RatioFixerSnapshot[];
    },
    enabled: enabled && !!campaignId,
    refetchInterval: 60_000,
  });
}

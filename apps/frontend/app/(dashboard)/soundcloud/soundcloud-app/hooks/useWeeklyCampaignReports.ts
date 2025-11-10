import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';

export interface Campaign {
  id: string;
  artist_name: string;
  track_name: string;
  track_url: string;
  status: string;
  goal_reposts: number | null;
  price_usd: number | null;
  start_date: string;
  end_date: string | null;
}

export interface InfluenceReceipt {
  supporterName: string;
  supporterHandle: string;
  scheduledDate: string;
  proofUrl: string | null;
  status: 'completed' | 'pending' | 'failed';
  creditsAllocated: number;
}

export interface MetricSnapshot {
  plays: number;
  likes: number;
  reposts: number;
  comments: number;
}

export interface MetricChange {
  absolute: number;
  percentage: number;
}

export interface StreamingMetrics {
  currentWeek: MetricSnapshot;
  previousWeek: MetricSnapshot;
  changes: {
    plays: MetricChange;
    likes: MetricChange;
    reposts: MetricChange;
    comments: MetricChange;
  };
}

export interface WeeklyReportData {
  campaign: Campaign;
  weekRange: { start: Date; end: Date };
  influenceReceipts: InfluenceReceipt[];
  streamingMetrics: StreamingMetrics | null;
}

export interface WeeklyOverview {
  activeCampaigns: number;
  activeCampaignsChange?: number;
  weeklyRevenue: number;
  revenueChange?: number;
  revenueChangePercent?: number;
  averageROI: number;
  roiChange?: number;
  campaignsNeedingAttention: number;
}

export const useWeeklyCampaignReports = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [weeklyOverview, setWeeklyOverview] = useState<WeeklyOverview | null>(null);
  const [campaignWeeklyReport, setCampaignWeeklyReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, artist_name, track_name, track_url, status, goal_reposts, price_usd, start_date, end_date')
        .in('status', ['live', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    }
  };

  const fetchWeeklyOverview = async () => {
    try {
      const currentWeekStart = startOfWeek(new Date());
      const currentWeekEnd = endOfWeek(new Date());
      const previousWeekStart = startOfWeek(subWeeks(new Date(), 1));
      const previousWeekEnd = endOfWeek(subWeeks(new Date(), 1));

      // Get current week campaigns
      const { data: currentWeekCampaigns, error: currentError } = await supabase
        .from('campaigns')
        .select('*')
        .gte('created_at', currentWeekStart.toISOString())
        .lte('created_at', currentWeekEnd.toISOString());

      if (currentError) throw currentError;

      // Get previous week campaigns for comparison
      const { data: previousWeekCampaigns, error: previousError } = await supabase
        .from('campaigns')
        .select('*')
        .gte('created_at', previousWeekStart.toISOString())
        .lte('created_at', previousWeekEnd.toISOString());

      if (previousError) throw previousError;

      // Calculate metrics
      const activeCampaigns = currentWeekCampaigns?.filter(c => c.status === 'live').length || 0;
      const previousActiveCampaigns = previousWeekCampaigns?.filter(c => c.status === 'live').length || 0;
      
      const weeklyRevenue = currentWeekCampaigns?.reduce((sum, c) => sum + (c.price_usd || 0), 0) || 0;
      const previousWeeklyRevenue = previousWeekCampaigns?.reduce((sum, c) => sum + (c.price_usd || 0), 0) || 0;

      // Get campaigns needing attention (missing receipts, low performance, etc.)
      const { data: campaignsNeedingAttention, error: attentionError } = await supabase
        .from('campaigns')
        .select(`
          id,
          schedules!inner(proof_url, status)
        `)
        .eq('status', 'live')
        .is('schedules.proof_url', null);

      if (attentionError) throw attentionError;

      setWeeklyOverview({
        activeCampaigns,
        activeCampaignsChange: activeCampaigns - previousActiveCampaigns,
        weeklyRevenue,
        revenueChange: weeklyRevenue - previousWeeklyRevenue,
        revenueChangePercent: previousWeeklyRevenue > 0 ? ((weeklyRevenue - previousWeeklyRevenue) / previousWeeklyRevenue) * 100 : 0,
        averageROI: 0, // Will be calculated from attribution data when available
        campaignsNeedingAttention: campaignsNeedingAttention?.length || 0
      });

    } catch (error: any) {
      console.error('Error fetching weekly overview:', error);
      toast({
        title: "Error",
        description: "Failed to fetch weekly overview",
        variant: "destructive",
      });
    }
  };

  const fetchCampaignWeeklyReport = async (campaignId: string, weekDate: Date) => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(weekDate);
      const weekEnd = endOfWeek(weekDate);
      
      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Get influence planner receipts for this week
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          member_accounts!inner(
            handle,
            members!inner(name)
          )
        `)
        .eq('parent_id', campaignId)
        .eq('parent_type', 'campaign')
        .gte('scheduled_at', weekStart.toISOString())
        .lte('scheduled_at', weekEnd.toISOString());

      if (schedulesError) throw schedulesError;

      const influenceReceipts: InfluenceReceipt[] = schedules?.map(schedule => ({
        supporterName: schedule.member_accounts?.members?.name || 'Unknown',
        supporterHandle: schedule.member_accounts?.handle || 'unknown',
        scheduledDate: schedule.scheduled_at,
        proofUrl: schedule.proof_url,
        status: schedule.proof_url ? 'completed' : 'pending',
        creditsAllocated: schedule.credits_allocated || 0
      })) || [];

      // Get streaming metrics for current and previous week
      const currentWeekStart = startOfWeek(weekDate);
      const currentWeekEnd = endOfWeek(weekDate);
      const previousWeekStart = startOfWeek(subWeeks(weekDate, 1));
      const previousWeekEnd = endOfWeek(subWeeks(weekDate, 1));

      const { data: currentWeekMetrics, error: currentMetricsError } = await supabase
        .from('attribution_snapshots')
        .select('plays, likes, reposts, comments')
        .eq('parent_id', campaignId)
        .eq('parent_type', 'campaign')
        .gte('snapshot_date', format(currentWeekStart, 'yyyy-MM-dd'))
        .lte('snapshot_date', format(currentWeekEnd, 'yyyy-MM-dd'))
        .order('snapshot_date', { ascending: false })
        .limit(1);

      const { data: previousWeekMetrics, error: previousMetricsError } = await supabase
        .from('attribution_snapshots')
        .select('plays, likes, reposts, comments')
        .eq('parent_id', campaignId)
        .eq('parent_type', 'campaign')
        .gte('snapshot_date', format(previousWeekStart, 'yyyy-MM-dd'))
        .lte('snapshot_date', format(previousWeekEnd, 'yyyy-MM-dd'))
        .order('snapshot_date', { ascending: false })
        .limit(1);

      let streamingMetrics: StreamingMetrics | null = null;

      if (currentWeekMetrics && currentWeekMetrics.length > 0) {
        const current = currentWeekMetrics[0];
        const previous = previousWeekMetrics && previousWeekMetrics.length > 0 ? previousWeekMetrics[0] : null;

        const calculateChange = (currentVal: number, previousVal: number): MetricChange => ({
          absolute: currentVal - previousVal,
          percentage: previousVal > 0 ? ((currentVal - previousVal) / previousVal) * 100 : 0
        });

        streamingMetrics = {
          currentWeek: {
            plays: current.plays || 0,
            likes: current.likes || 0,
            reposts: current.reposts || 0,
            comments: current.comments || 0
          },
          previousWeek: {
            plays: previous?.plays || 0,
            likes: previous?.likes || 0,
            reposts: previous?.reposts || 0,
            comments: previous?.comments || 0
          },
          changes: {
            plays: calculateChange(current.plays || 0, previous?.plays || 0),
            likes: calculateChange(current.likes || 0, previous?.likes || 0),
            reposts: calculateChange(current.reposts || 0, previous?.reposts || 0),
            comments: calculateChange(current.comments || 0, previous?.comments || 0)
          }
        };
      }

      setCampaignWeeklyReport({
        campaign,
        weekRange: { start: weekStart, end: weekEnd },
        influenceReceipts,
        streamingMetrics
      });

    } catch (error: any) {
      console.error('Error fetching campaign weekly report:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaign weekly report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportWeeklyReport = async (campaignId: string, weekDate: Date): Promise<void> => {
    // Implementation would generate PDF or CSV export
    // For now, just simulate the export
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  };

  const refetch = async () => {
    await Promise.all([
      fetchCampaigns(),
      fetchWeeklyOverview()
    ]);
  };

  useEffect(() => {
    refetch();
  }, []);

  return {
    campaigns,
    weeklyOverview,
    campaignWeeklyReport,
    loading,
    fetchCampaignWeeklyReport,
    exportWeeklyReport,
    refetch
  };
};
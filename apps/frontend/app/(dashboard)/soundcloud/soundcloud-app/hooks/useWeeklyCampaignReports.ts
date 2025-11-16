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
      // Query soundcloud_submissions for SoundCloud campaigns
      const { data, error } = await supabase
        .from('soundcloud_submissions' as any)
        .select('id, artist_name, track_name, track_url, status, expected_reach_planned, support_date, created_at')
        .in('status', ['approved']) // 'approved' is the SoundCloud equivalent of 'live'
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map to expected Campaign interface
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        artist_name: item.artist_name,
        track_name: item.track_name,
        track_url: item.track_url,
        status: 'live', // Map 'approved' back to 'live' for display
        goal_reposts: item.expected_reach_planned,
        price_usd: null,
        start_date: item.support_date || item.created_at,
        end_date: null,
      }));
      
      setCampaigns(mappedData);
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

      // Get current week campaigns from soundcloud_submissions
      const { data: currentWeekCampaigns, error: currentError } = await supabase
        .from('soundcloud_submissions' as any)
        .select('*')
        .gte('created_at', currentWeekStart.toISOString())
        .lte('created_at', currentWeekEnd.toISOString());

      if (currentError) throw currentError;

      // Get previous week campaigns for comparison
      const { data: previousWeekCampaigns, error: previousError } = await supabase
        .from('soundcloud_submissions' as any)
        .select('*')
        .gte('created_at', previousWeekStart.toISOString())
        .lte('created_at', previousWeekEnd.toISOString());

      if (previousError) throw previousError;

      // Calculate metrics (SoundCloud uses 'approved' status instead of 'live')
      const activeCampaigns = currentWeekCampaigns?.filter((c: any) => c.status === 'approved').length || 0;
      const previousActiveCampaigns = previousWeekCampaigns?.filter((c: any) => c.status === 'approved').length || 0;
      
      // SoundCloud doesn't have price_usd in submissions, so weekly revenue is 0
      const weeklyRevenue = 0;
      const previousWeeklyRevenue = 0;

      // For SoundCloud, we'll skip the "campaigns needing attention" query since
      // it requires a 'schedules' relationship that doesn't exist
      const campaignsNeedingAttention = 0;

      setWeeklyOverview({
        activeCampaigns,
        activeCampaignsChange: activeCampaigns - previousActiveCampaigns,
        weeklyRevenue,
        revenueChange: weeklyRevenue - previousWeeklyRevenue,
        revenueChangePercent: 0,
        averageROI: 0,
        campaignsNeedingAttention
      });

    } catch (error: any) {
      console.error('Error fetching weekly overview:', error);
      // Don't show toast for this error since it's not critical
    }
  };

  const fetchCampaignWeeklyReport = async (campaignId: string, weekDate: Date) => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(weekDate);
      const weekEnd = endOfWeek(weekDate);
      
      // Get campaign details from soundcloud_submissions
      const { data: submission, error: campaignError } = await supabase
        .from('soundcloud_submissions' as any)
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      
      // Map submission data to campaign format
      const campaign: any = {
        id: submission.id,
        artist_name: submission.artist_name,
        track_name: submission.track_name,
        track_url: submission.track_url,
        status: 'live',
        goal_reposts: submission.expected_reach_planned,
        price_usd: null,
        start_date: submission.support_date || submission.created_at,
        end_date: null,
      };

      // For SoundCloud, we don't have 'schedules' or 'attribution_snapshots' tables yet
      // Return empty data for now - these features can be implemented later
      const influenceReceipts: InfluenceReceipt[] = [];
      const streamingMetrics: StreamingMetrics | null = null;

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
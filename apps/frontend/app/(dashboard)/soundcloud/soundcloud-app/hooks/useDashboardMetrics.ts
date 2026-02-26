import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { startOfMonth, subMonths, startOfDay, subDays } from 'date-fns';

export type AlertSeverity = 'critical' | 'warning';

export interface ActionAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  link?: string;
}

export interface DashboardMetrics {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  revenueChangePercent: number;
  activeCampaigns: { total: number; paid: number; free: number };
  queueCapacityPercent: number;
  systemHealth: {
    successRate: number;
    failuresLast24h: number;
    activeWarnings: number;
  };
  throughputToday: {
    tracksProcessed: number;
    campaignsCompleted: number;
    newEntries: number;
  };
  avgCampaignValue: number;
  actionAlerts: ActionAlert[];
}

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
  const todayStart = startOfDay(now).toISOString();

  const [
    campaignsResult,
    prevCampaignsResult,
    queuesResult,
    membersResult,
    todaySubmissionsCompleted,
    todayCampaignsCompleted,
    todayNewEntries,
  ] = await Promise.all([
    // All campaigns for active counts + current month revenue
    supabase
      .from('soundcloud_campaigns')
      .select('id, status, sales_price, created_at'),

    // Previous month paid campaigns for revenue comparison
    supabase
      .from('soundcloud_campaigns')
      .select('sales_price')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart)
      .not('sales_price', 'is', null),

    // Today's queue capacity
    supabase
      .from('soundcloud_queues')
      .select('filled_slots, total_slots')
      .eq('date', now.toISOString().split('T')[0])
      .limit(1),

    // Member statuses for system health + IP disconnects
    supabase
      .from('members')
      .select('status, influence_planner_status'),

    // Throughput: submissions completed today
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete')
      .gte('updated_at', todayStart),

    // Throughput: campaigns completed today
    supabase
      .from('soundcloud_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Complete')
      .gte('updated_at', todayStart),

    // Throughput: new submissions today
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
  ]);

  const campaigns = campaignsResult.data ?? [];
  const prevCampaigns = prevCampaignsResult.data ?? [];
  const queues = queuesResult.data ?? [];
  const members = membersResult.data ?? [];

  // --- Revenue (paid campaigns only, current month) ---
  const currentMonthPaid = campaigns.filter(
    (c) =>
      c.sales_price != null &&
      c.sales_price > 0 &&
      c.created_at != null &&
      c.created_at >= monthStart
  );
  const monthlyRevenue = currentMonthPaid.reduce(
    (sum, c) => sum + (c.sales_price ?? 0),
    0
  );
  const previousMonthRevenue = prevCampaigns.reduce(
    (sum, c) => sum + (c.sales_price ?? 0),
    0
  );
  const revenueChangePercent =
    previousMonthRevenue > 0
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;

  // --- Active Campaigns (status = 'Active') ---
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');
  const paidCount = activeCampaigns.filter(
    (c) => c.sales_price != null && c.sales_price > 0
  ).length;
  const freeCount = activeCampaigns.length - paidCount;

  // --- Avg Campaign Value (across all paid campaigns) ---
  const allPaidCampaigns = campaigns.filter(
    (c) => c.sales_price != null && c.sales_price > 0
  );
  const avgCampaignValue =
    allPaidCampaigns.length > 0
      ? allPaidCampaigns.reduce((sum, c) => sum + (c.sales_price ?? 0), 0) /
        allPaidCampaigns.length
      : 0;

  // --- Queue Capacity ---
  let queueCapacityPercent = 0;
  if (queues.length > 0 && queues[0].total_slots > 0) {
    queueCapacityPercent = Math.round(
      (queues[0].filled_slots / queues[0].total_slots) * 100
    );
  }

  // --- System Health (derived from member connection statuses) ---
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'active').length;
  const needsReconnect = members.filter(
    (m) => m.status === 'needs_reconnect'
  ).length;
  const successRate =
    totalMembers > 0
      ? Math.round((activeMembers / totalMembers) * 1000) / 10
      : 100;
  const activeWarnings = needsReconnect;

  // --- Throughput ---
  const throughputToday = {
    tracksProcessed: todaySubmissionsCompleted.count ?? 0,
    campaignsCompleted: todayCampaignsCompleted.count ?? 0,
    newEntries: todayNewEntries.count ?? 0,
  };

  // --- Action Alerts ---
  const actionAlerts: ActionAlert[] = [];

  if (needsReconnect > 0) {
    actionAlerts.push({
      id: 'needs-reconnect',
      severity: needsReconnect > 10 ? 'critical' : 'warning',
      title: `${needsReconnect} member${needsReconnect === 1 ? '' : 's'} need reconnection`,
      description: 'SoundCloud integrations disconnected',
      link: '/soundcloud/dashboard/members',
    });
  }

  const disconnectedIP = members.filter(
    (m) => m.influence_planner_status === 'disconnected'
  ).length;
  if (disconnectedIP > 0) {
    actionAlerts.push({
      id: 'ip-disconnected',
      severity: disconnectedIP > 10 ? 'critical' : 'warning',
      title: `${disconnectedIP} member${disconnectedIP === 1 ? '' : 's'} disconnected from Influence Planner`,
      description: 'Reconnect members to restore automation',
      link: '/soundcloud/dashboard/members',
    });
  }

  if (queueCapacityPercent > 80) {
    actionAlerts.push({
      id: 'queue-capacity',
      severity: queueCapacityPercent > 95 ? 'critical' : 'warning',
      title: `Queue at ${queueCapacityPercent}% capacity`,
      description: 'Consider expanding queue slots or throttling intake',
      link: '/soundcloud/dashboard/queue',
    });
  }

  // Stuck campaigns: Active for more than 30 days
  const stuckThreshold = subDays(now, 30).toISOString();
  const stuckCampaigns = activeCampaigns.filter(
    (c) => c.created_at != null && c.created_at < stuckThreshold
  );
  if (stuckCampaigns.length > 0) {
    actionAlerts.push({
      id: 'stuck-campaigns',
      severity: stuckCampaigns.length > 3 ? 'critical' : 'warning',
      title: `${stuckCampaigns.length} campaign${stuckCampaigns.length === 1 ? '' : 's'} active for 30+ days`,
      description: 'Review campaigns that may be stalled',
      link: '/soundcloud/dashboard/campaigns',
    });
  }

  return {
    monthlyRevenue: Math.round(monthlyRevenue),
    previousMonthRevenue: Math.round(previousMonthRevenue),
    revenueChangePercent: Math.round(revenueChangePercent * 10) / 10,
    activeCampaigns: {
      total: activeCampaigns.length,
      paid: paidCount,
      free: freeCount,
    },
    queueCapacityPercent,
    systemHealth: {
      successRate,
      failuresLast24h: needsReconnect,
      activeWarnings,
    },
    throughputToday,
    avgCampaignValue: Math.round(avgCampaignValue),
    actionAlerts,
  };
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['soundcloud-dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

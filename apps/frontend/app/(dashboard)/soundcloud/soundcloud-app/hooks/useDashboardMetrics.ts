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
  const last24h = subDays(now, 1).toISOString();

  const [
    campaignsResult,
    prevCampaignsResult,
    queuesResult,
    integrationResult,
    todaySubmissionsCompleted,
    todayCampaignsCompleted,
    todayNewEntries,
    disconnectedMembers,
  ] = await Promise.all([
    // Active campaigns + current month revenue
    supabase
      .from('soundcloud_campaigns')
      .select('id, status, campaign_type, sales_price, created_at')
      .in('status', ['active', 'completed', 'in_progress']),

    // Previous month campaigns for revenue comparison
    supabase
      .from('soundcloud_campaigns')
      .select('sales_price, status')
      .gte('created_at', prevMonthStart)
      .lt('created_at', monthStart)
      .not('sales_price', 'is', null),

    // Today's queue capacity
    supabase
      .from('queues')
      .select('filled_slots, total_slots')
      .eq('date', now.toISOString().split('T')[0])
      .limit(1),

    // Integration statuses for system health
    supabase
      .from('integration_status')
      .select('status, error_count, updated_at'),

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
      .eq('status', 'completed')
      .gte('updated_at', todayStart),

    // Throughput: new submissions today
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),

    // Disconnected members on Influence Planner
    supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('influence_planner_status', 'disconnected'),
  ]);

  const campaigns = campaignsResult.data ?? [];
  const prevCampaigns = prevCampaignsResult.data ?? [];
  const queues = queuesResult.data ?? [];
  const integrations = integrationResult.data ?? [];

  // --- Revenue ---
  const paidActiveCampaigns = campaigns.filter(
    (c) => c.sales_price != null && c.sales_price > 0
  );
  const currentMonthPaid = paidActiveCampaigns.filter(
    (c) => c.created_at >= monthStart
  );
  const monthlyRevenue = currentMonthPaid.reduce(
    (sum, c) => sum + (c.sales_price ?? 0),
    0
  );
  const previousMonthRevenue = prevCampaigns.reduce(
    (sum, c) => sum + (parseFloat(String(c.sales_price ?? 0)) || 0),
    0
  );
  const revenueChangePercent =
    previousMonthRevenue > 0
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;

  // --- Active Campaigns ---
  const activeCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'in_progress');
  const paidCount = activeCampaigns.filter(
    (c) => c.sales_price != null && c.sales_price > 0
  ).length;
  const freeCount = activeCampaigns.length - paidCount;

  // --- Avg Campaign Value ---
  const avgCampaignValue =
    paidCount > 0
      ? activeCampaigns
          .filter((c) => c.sales_price != null && c.sales_price > 0)
          .reduce((sum, c) => sum + (c.sales_price ?? 0), 0) / paidCount
      : 0;

  // --- Queue Capacity ---
  let queueCapacityPercent = 0;
  if (queues.length > 0 && queues[0].total_slots > 0) {
    queueCapacityPercent = Math.round(
      (queues[0].filled_slots / queues[0].total_slots) * 100
    );
  }

  // --- System Health ---
  const totalIntegrations = integrations.length;
  const linkedCount = integrations.filter((i) => i.status === 'linked').length;
  const successRate =
    totalIntegrations > 0
      ? Math.round((linkedCount / totalIntegrations) * 1000) / 10
      : 100;

  const failuresLast24h = integrations.filter(
    (i) =>
      (i.status === 'error' || i.status === 'disconnected') &&
      i.updated_at &&
      i.updated_at >= last24h
  ).length;

  const activeWarnings = integrations.filter(
    (i) => i.status === 'reconnect' || i.status === 'error'
  ).length;

  // --- Throughput ---
  const throughputToday = {
    tracksProcessed: todaySubmissionsCompleted.count ?? 0,
    campaignsCompleted: todayCampaignsCompleted.count ?? 0,
    newEntries: todayNewEntries.count ?? 0,
  };

  // --- Action Alerts ---
  const actionAlerts: ActionAlert[] = [];

  if (failuresLast24h > 0) {
    actionAlerts.push({
      id: 'integration-failures',
      severity: failuresLast24h > 5 ? 'critical' : 'warning',
      title: `${failuresLast24h} integration${failuresLast24h === 1 ? '' : 's'} failed`,
      description: 'Check member integrations for connection errors',
      link: '/soundcloud/dashboard/health',
    });
  }

  const disconnectedCount = disconnectedMembers.count ?? 0;
  if (disconnectedCount > 0) {
    actionAlerts.push({
      id: 'ip-disconnected',
      severity: disconnectedCount > 10 ? 'critical' : 'warning',
      title: `${disconnectedCount} member${disconnectedCount === 1 ? '' : 's'} disconnected from Influence Planner`,
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

  // Stuck campaigns: active for more than 30 days
  const stuckThreshold = subDays(now, 30).toISOString();
  const stuckCampaigns = activeCampaigns.filter(
    (c) => c.created_at < stuckThreshold
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
      failuresLast24h,
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

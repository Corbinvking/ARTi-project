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

function getPrice(row: Record<string, unknown>): number {
  const v = row.sale_price ?? row.sales_price ?? row.price_usd ?? 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/[$,]/g, '')) || 0;
}

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
  const todayStart = startOfDay(now).toISOString();

  // Use select('*') for soundcloud_campaigns to avoid 400s from mismatched column names.
  // The production schema may differ from the generated types.
  const [
    campaignsResult,
    membersResult,
    todaySubmissionsCompleted,
    todayNewEntries,
  ] = await Promise.all([
    supabase
      .from('soundcloud_campaigns')
      .select('*'),

    supabase
      .from('members')
      .select('status, influence_planner_status'),

    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete')
      .gte('updated_at', todayStart),

    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
  ]);

  const campaigns = (campaignsResult.data ?? []) as Record<string, unknown>[];
  const members = membersResult.data ?? [];

  // --- Revenue (paid campaigns, current month vs previous month) ---
  const paidCampaigns = campaigns.filter((c) => getPrice(c) > 0);

  const currentMonthPaid = paidCampaigns.filter(
    (c) => typeof c.created_at === 'string' && c.created_at >= monthStart
  );
  const monthlyRevenue = currentMonthPaid.reduce(
    (sum, c) => sum + getPrice(c),
    0
  );

  const prevMonthPaid = paidCampaigns.filter(
    (c) =>
      typeof c.created_at === 'string' &&
      c.created_at >= prevMonthStart &&
      c.created_at < monthStart
  );
  const previousMonthRevenue = prevMonthPaid.reduce(
    (sum, c) => sum + getPrice(c),
    0
  );

  const revenueChangePercent =
    previousMonthRevenue > 0
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;

  // --- Active Campaigns (status = 'Active') ---
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');
  const paidActiveCount = activeCampaigns.filter((c) => getPrice(c) > 0).length;
  const freeActiveCount = activeCampaigns.length - paidActiveCount;

  // --- Avg Campaign Value ---
  const avgCampaignValue =
    paidCampaigns.length > 0
      ? paidCampaigns.reduce((sum, c) => sum + getPrice(c), 0) /
        paidCampaigns.length
      : 0;

  // --- Today's completed campaigns (count in JS since we already have all campaigns) ---
  const campaignsCompletedToday = campaigns.filter(
    (c) =>
      c.status === 'Complete' &&
      typeof c.updated_at === 'string' &&
      c.updated_at >= todayStart
  ).length;

  // --- Queue Capacity (table may not exist in production — handle gracefully) ---
  let queueCapacityPercent = 0;
  try {
    const { data: queues } = await supabase
      .from('soundcloud_queues' as string)
      .select('filled_slots, total_slots')
      .eq('date', now.toISOString().split('T')[0])
      .limit(1);
    if (queues && queues.length > 0 && (queues[0] as Record<string, number>).total_slots > 0) {
      const q = queues[0] as Record<string, number>;
      queueCapacityPercent = Math.round((q.filled_slots / q.total_slots) * 100);
    }
  } catch {
    // Table doesn't exist — queue capacity stays at 0
  }

  // --- System Health (from member connection statuses) ---
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'active').length;
  const needsReconnect = members.filter(
    (m) => m.status === 'needs_reconnect'
  ).length;
  const successRate =
    totalMembers > 0
      ? Math.round((activeMembers / totalMembers) * 1000) / 10
      : 100;

  // --- Throughput ---
  const throughputToday = {
    tracksProcessed: todaySubmissionsCompleted.count ?? 0,
    campaignsCompleted: campaignsCompletedToday,
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

  const stuckThreshold = subDays(now, 30).toISOString();
  const stuckCampaigns = activeCampaigns.filter(
    (c) => typeof c.created_at === 'string' && c.created_at < stuckThreshold
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
      paid: paidActiveCount,
      free: freeActiveCount,
    },
    queueCapacityPercent,
    systemHealth: {
      successRate,
      failuresLast24h: needsReconnect,
      activeWarnings: needsReconnect,
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

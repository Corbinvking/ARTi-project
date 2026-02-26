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

interface NormalizedCampaign {
  id: string | number;
  status: string;
  price: number;
  created_at: string | null;
  updated_at: string | null;
  source: 'sc' | 'intake';
}

function parsePrice(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/[$,]/g, '')) || 0;
}

function normalizeSCCampaign(row: Record<string, unknown>): NormalizedCampaign {
  return {
    id: row.id as string | number,
    status: (row.status as string) || '',
    price: parsePrice(row.sale_price),
    created_at: (row.created_at as string) ?? null,
    updated_at: (row.updated_at as string) ?? null,
    source: 'sc',
  };
}

function normalizeIntakeCampaign(row: Record<string, unknown>): NormalizedCampaign {
  const status = (row.status as string) || '';
  const statusMap: Record<string, string> = {
    intake: 'Pending',
    draft: 'Pending',
    scheduled: 'Ready',
    live: 'Active',
    completed: 'Complete',
  };
  return {
    id: row.id as string | number,
    status: statusMap[status] ?? status,
    price: parsePrice(row.price_usd),
    created_at: (row.created_at as string) ?? null,
    updated_at: (row.updated_at as string) ?? null,
    source: 'intake',
  };
}

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
  const todayStart = startOfDay(now).toISOString();

  // Query both campaign tables with select('*') to avoid column-name 400s.
  // soundcloud_campaigns = imported legacy data (sale_price text field)
  // campaigns = paid intake form entries (price_usd numeric field)
  const [
    scCampaignsResult,
    intakeCampaignsResult,
    membersResult,
    todaySubmissionsCompleted,
    todayNewEntries,
  ] = await Promise.all([
    supabase.from('soundcloud_campaigns').select('*'),
    supabase.from('campaigns').select('*'),
    supabase.from('members').select('status, influence_planner_status'),
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

  console.log('[Dashboard] SC campaigns:', scCampaignsResult.data?.length ?? 0, 'error:', scCampaignsResult.error?.message ?? 'none');
  console.log('[Dashboard] Intake campaigns:', intakeCampaignsResult.data?.length ?? 0, 'error:', intakeCampaignsResult.error?.message ?? 'none');
  if (intakeCampaignsResult.data && intakeCampaignsResult.data.length > 0) {
    const s = intakeCampaignsResult.data[0] as Record<string, unknown>;
    console.log('[Dashboard] Intake sample columns:', Object.keys(s));
    console.log('[Dashboard] Intake sample price_usd:', s.price_usd, 'status:', s.status);
  }
  // Log first SC campaign with a non-empty sale_price
  const scRaw = (scCampaignsResult.data ?? []) as Record<string, unknown>[];
  const withPrice = scRaw.filter(r => r.sale_price != null && r.sale_price !== '' && r.sale_price !== '0');
  console.log('[Dashboard] SC campaigns with non-empty sale_price:', withPrice.length, 'sample:', withPrice[0]?.sale_price);

  const scCampaigns = scRaw.map(normalizeSCCampaign);
  const intakeCampaigns = ((intakeCampaignsResult.data ?? []) as Record<string, unknown>[]).map(normalizeIntakeCampaign);
  const campaigns = [...scCampaigns, ...intakeCampaigns];
  const members = membersResult.data ?? [];

  // --- Revenue (paid campaigns, current month vs previous month) ---
  const paidCampaigns = campaigns.filter((c) => c.price > 0);
  console.log('[Dashboard] Total campaigns:', campaigns.length, 'Paid:', paidCampaigns.length, 'Active:', campaigns.filter(c => c.status === 'Active').length);

  const currentMonthPaid = paidCampaigns.filter(
    (c) => c.created_at != null && c.created_at >= monthStart
  );
  const monthlyRevenue = currentMonthPaid.reduce((sum, c) => sum + c.price, 0);

  const prevMonthPaid = paidCampaigns.filter(
    (c) =>
      c.created_at != null &&
      c.created_at >= prevMonthStart &&
      c.created_at < monthStart
  );
  const previousMonthRevenue = prevMonthPaid.reduce((sum, c) => sum + c.price, 0);

  const revenueChangePercent =
    previousMonthRevenue > 0
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;

  // --- Active Campaigns ---
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');
  const paidActiveCount = activeCampaigns.filter((c) => c.price > 0).length;
  const freeActiveCount = activeCampaigns.length - paidActiveCount;

  // --- Avg Campaign Value ---
  const avgCampaignValue =
    paidCampaigns.length > 0
      ? paidCampaigns.reduce((sum, c) => sum + c.price, 0) / paidCampaigns.length
      : 0;

  // --- Today's completed campaigns ---
  const campaignsCompletedToday = campaigns.filter(
    (c) =>
      c.status === 'Complete' &&
      c.updated_at != null &&
      c.updated_at >= todayStart
  ).length;

  // --- Queue Capacity (table may not exist — handle gracefully) ---
  let queueCapacityPercent = 0;
  try {
    const { data: queues } = await supabase
      .from('soundcloud_queues' as string)
      .select('*')
      .eq('date', now.toISOString().split('T')[0])
      .limit(1);
    if (queues && queues.length > 0) {
      const q = queues[0] as Record<string, unknown>;
      const filled = typeof q.filled_slots === 'number' ? q.filled_slots : 0;
      const total = typeof q.total_slots === 'number' ? q.total_slots : 0;
      if (total > 0) {
        queueCapacityPercent = Math.round((filled / total) * 100);
      }
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

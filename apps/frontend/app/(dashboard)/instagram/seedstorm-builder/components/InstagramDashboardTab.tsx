'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useInstagramDashboardMetrics } from '../hooks/useInstagramDashboardMetrics';

const MAX_ALERTS_VISIBLE = 3;

export function InstagramDashboardTab() {
  const router = useRouter();
  const m = useInstagramDashboardMetrics();
  const visibleAlerts = m.alerts.slice(0, MAX_ALERTS_VISIBLE);
  const hasMoreAlerts = m.alerts.length > MAX_ALERTS_VISIBLE;

  if (m.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section 1 — Global Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-xl font-bold">{m.activeCampaigns}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Posts Live (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-xl font-bold">{m.postsLive30d}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pending Posts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-xl font-bold">{m.pendingPosts}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Vendor Payments Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-xl font-bold">${m.vendorPaymentsOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Avg Cost Per 1K Views
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-xl font-bold">
              {m.avgCostPer1kViews != null ? `$${m.avgCostPer1kViews.toFixed(2)}` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <Link href="/instagram/campaigns?filter=attention" className="block h-full">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex items-center justify-between">
              <p className="text-xl font-bold">{m.needsAttention}</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Section 2 — Posting Velocity */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="py-2 px-4 pb-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Posting Velocity (last 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[160px] px-4">
          {m.velocity.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={m.velocity.map((v) => ({ date: v.date.slice(5), posts: v.count }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number) => [value, 'Posts']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No post data in the last 30 days
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Operational Alerts */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="py-2 px-4 pb-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Operational Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {visibleAlerts.length > 0 ? (
            <div className="space-y-1.5">
              {visibleAlerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => router.push(`/instagram/campaigns?open=${alert.campaign_id}`)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'} className="shrink-0">
                      {alert.count}
                    </Badge>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{alert.campaign_name}</div>
                      <div className="text-xs text-muted-foreground">{alert.title}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                </button>
              ))}
              {hasMoreAlerts && (
                <div className="pt-2">
                  <Link
                    href="/instagram/campaigns"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View all {m.alerts.length} alerts
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No operational alerts. Campaigns are running smoothly.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

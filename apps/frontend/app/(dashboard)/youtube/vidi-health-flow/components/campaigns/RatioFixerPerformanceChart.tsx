import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Timer, ThumbsUp, MessageCircle, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { useRatioFixerSnapshots } from '../../hooks/useRatioFixerSnapshots';
import type { Database } from '../../integrations/supabase/types';

type Campaign = Database['public']['Tables']['youtube_campaigns']['Row'];

interface RatioFixerPerformanceChartProps {
  campaign: Campaign;
}

function formatAxisValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RatioFixerPerformanceChart({ campaign }: RatioFixerPerformanceChartProps) {
  const { data: snapshots = [], isLoading } = useRatioFixerSnapshots(
    campaign.id,
    true,
  );

  const ratioFixerStatus = campaign.ratio_fixer_status;
  const isRunning = ratioFixerStatus === 'running';
  const hasBeenStarted = !!campaign.ratio_fixer_started_at;

  const chartData = useMemo(() => {
    if (snapshots.length < 2) return null;

    const data = snapshots.map((s) => ({
      time: formatTime(s.recorded_at),
      rawTime: s.recorded_at,
      views: s.views,
      likes: s.likes,
      comments: s.comments,
      orderedLikes: s.ordered_likes,
      orderedComments: s.ordered_comments,
    }));

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    const metrics = [
      {
        key: 'likes' as const,
        label: 'Likes',
        color: '#3b82f6',
        icon: <ThumbsUp className="h-3.5 w-3.5" />,
        current: last.likes,
        change: last.likes - first.likes,
      },
      {
        key: 'comments' as const,
        label: 'Comments',
        color: '#a855f7',
        icon: <MessageCircle className="h-3.5 w-3.5" />,
        current: last.comments,
        change: last.comments - first.comments,
      },
      {
        key: 'orderedLikes' as const,
        label: 'Likes Ordered',
        color: '#22c55e',
        icon: <ThumbsUp className="h-3.5 w-3.5" />,
        current: last.ordered_likes,
        change: last.ordered_likes - first.ordered_likes,
      },
      {
        key: 'orderedComments' as const,
        label: 'Comments Ordered',
        color: '#f97316',
        icon: <MessageCircle className="h-3.5 w-3.5" />,
        current: last.ordered_comments,
        change: last.ordered_comments - first.ordered_comments,
      },
    ];

    return { data, metrics };
  }, [snapshots]);

  const runtime = useMemo(() => {
    if (!campaign.ratio_fixer_started_at) return null;
    const start = new Date(campaign.ratio_fixer_started_at).getTime();
    const end = campaign.ratio_fixer_stopped_at
      ? new Date(campaign.ratio_fixer_stopped_at).getTime()
      : Date.now();
    const diffMs = Math.max(0, end - start);
    const days = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
    const mins = Math.floor((diffMs % 3_600_000) / 60_000);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [campaign.ratio_fixer_started_at, campaign.ratio_fixer_stopped_at]);

  // Persisted engagement data from the youtube_campaigns table
  const orderedLikes = campaign.ordered_likes ?? 0;
  const orderedComments = campaign.ordered_comments ?? 0;
  const desiredLikes = campaign.desired_likes ?? 0;
  const desiredComments = campaign.desired_comments ?? 0;
  const likesGrowth = (campaign.likes_at_fixer_start != null)
    ? Math.max(0, (campaign.current_likes ?? 0) - (campaign.likes_at_fixer_start ?? 0))
    : null;
  const commentsGrowth = (campaign.comments_at_fixer_start != null)
    ? Math.max(0, (campaign.current_comments ?? 0) - (campaign.comments_at_fixer_start ?? 0))
    : null;

  const likesFulfillPct = desiredLikes > 0 ? Math.min(100, Math.round((orderedLikes / desiredLikes) * 100)) : 0;
  const commentsFulfillPct = desiredComments > 0 ? Math.min(100, Math.round((orderedComments / desiredComments) * 100)) : 0;

  return (
    <>
      {/* Ratio Fixer Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Ratio Fixer Performance
            </span>
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Badge variant="default" className="bg-green-600 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5 inline-block" />
                  Active
                </Badge>
              ) : ratioFixerStatus === 'stopped' ? (
                <Badge variant="secondary" className="text-xs">Stopped</Badge>
              ) : campaign.in_fixer ? (
                <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">In Fixer</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Not Started</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Session info */}
          {hasBeenStarted && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <div className="text-xs text-muted-foreground mb-0.5">Started</div>
                <div className="font-medium">
                  {new Date(campaign.ratio_fixer_started_at!).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <div className="text-xs text-muted-foreground mb-0.5">Runtime</div>
                <div className="font-medium flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                  {runtime || '—'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <div className="text-xs text-muted-foreground mb-0.5">Last Check</div>
                <div className="font-medium">
                  {campaign.ratio_fixer_last_check
                    ? new Date(campaign.ratio_fixer_last_check).toLocaleString(undefined, {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })
                    : '—'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <div className="text-xs text-muted-foreground mb-0.5">Snapshots</div>
                <div className="font-medium">{snapshots.length}</div>
              </div>
            </div>
          )}

          {/* Engagement ordered / fulfillment */}
          {(orderedLikes > 0 || orderedComments > 0 || desiredLikes > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-blue-400">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Likes Ordered
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {orderedLikes.toLocaleString()} / {desiredLikes.toLocaleString()}
                  </span>
                </div>
                <Progress value={likesFulfillPct} className="h-2" />
                <div className="text-xs text-muted-foreground">{likesFulfillPct}% fulfilled</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-purple-400">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Comments Ordered
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {orderedComments.toLocaleString()} / {desiredComments.toLocaleString()}
                  </span>
                </div>
                <Progress value={commentsFulfillPct} className="h-2" />
                <div className="text-xs text-muted-foreground">{commentsFulfillPct}% fulfilled</div>
              </div>
            </div>
          )}

          {/* Engagement growth since fixer started */}
          {(likesGrowth !== null || commentsGrowth !== null) && (
            <div className="grid grid-cols-2 gap-4">
              {likesGrowth !== null && (
                <div className="p-2.5 rounded bg-green-500/5 border border-green-500/20 text-center">
                  <div className="text-lg font-bold text-green-400">+{likesGrowth.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Likes Gained</div>
                </div>
              )}
              {commentsGrowth !== null && (
                <div className="p-2.5 rounded bg-green-500/5 border border-green-500/20 text-center">
                  <div className="text-lg font-bold text-green-400">+{commentsGrowth.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Comments Gained</div>
                </div>
              )}
            </div>
          )}

          {/* No data yet message */}
          {!hasBeenStarted && !campaign.in_fixer && (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Ratio fixer has not been started for this campaign.</p>
              <p className="text-xs mt-1">Go to the Ratio Fixer tab to start it.</p>
            </div>
          )}

          {(campaign.in_fixer || hasBeenStarted) && orderedLikes === 0 && orderedComments === 0 && !isRunning && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <p>No engagement has been ordered yet.</p>
              <p className="text-xs mt-1">
                {campaign.in_fixer
                  ? 'The fixer is enabled — use the "Start Automated Ratio Fixer" button in the Ratio Fixer tab to begin.'
                  : 'Start the ratio fixer from the Ratio Fixer tab to begin automated engagement ordering.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time-series charts - only when we have snapshot data */}
      {chartData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Performance Over Time</span>
              {isRunning && (
                <Badge variant="default" className="bg-green-600 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5 inline-block" />
                  Live
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {chartData.metrics.map((metric, idx) => (
                <div key={metric.key} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: metric.color }}>
                      {metric.icon}
                      {metric.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tabular-nums">
                        {formatAxisValue(metric.current)}
                      </span>
                      {metric.change !== 0 && (
                        <span className={`text-xs flex items-center gap-0.5 ${metric.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {metric.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {metric.change > 0 ? '+' : ''}{formatAxisValue(metric.change)}
                        </span>
                      )}
                      {metric.change === 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Minus className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.data} margin={{ top: 4, right: 4, left: 0, bottom: idx >= 2 ? 40 : 4 }}>
                        <defs>
                          <linearGradient id={`rf-gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                        <XAxis
                          dataKey="time"
                          tick={idx >= 2 ? { fontSize: 9 } : false}
                          axisLine={false}
                          tickLine={false}
                          angle={-45}
                          textAnchor="end"
                          height={idx >= 2 ? 40 : 4}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tick={{ fontSize: 9 }}
                          tickFormatter={formatAxisValue}
                          axisLine={false}
                          tickLine={false}
                          width={45}
                        />
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString(), metric.label]}
                          labelFormatter={(label) => `${label}`}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                          labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                        />
                        <Area
                          type="monotone"
                          dataKey={metric.key}
                          stroke={metric.color}
                          strokeWidth={2}
                          fill={`url(#rf-gradient-${metric.key})`}
                          connectNulls={true}
                          dot={{ r: 2, fill: metric.color }}
                          activeDot={{ r: 4, fill: metric.color }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* When fixer was/is active but no snapshot data yet */}
      {!chartData && (campaign.in_fixer || hasBeenStarted) && isRunning && (
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40 animate-pulse" />
              <p className="font-medium">Collecting performance data...</p>
              <p className="text-xs mt-1">
                Snapshots are recorded every 5 minutes. The performance chart will appear once enough data points are collected.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

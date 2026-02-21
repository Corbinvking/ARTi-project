'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Instagram,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  Play,
  DollarSign,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const publicSupabase = createClient(supabaseUrl, supabaseAnonKey);

interface CampaignPost {
  id: string;
  post_url: string;
  post_type: string;
  instagram_handle: string;
  status: string;
  tracked_views?: number;
  tracked_likes?: number;
  tracked_comments?: number;
  thumbnail_url?: string;
  posted_at?: string;
  created_at: string;
}

interface Campaign {
  id: string;
  campaign?: string;
  name?: string;
  status?: string;
  public_access_enabled?: boolean;
  public_token?: string;
  price?: string;
  created_at: string;
}

interface ChartDataPoint {
  date: string;
  views: number;
  likes: number;
  comments: number;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  prefix = '',
  suffix = '',
  color = 'default',
  statusColor,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  color?: 'default' | 'green' | 'blue' | 'purple' | 'orange' | 'pink';
  statusColor?: 'green' | 'blue' | 'orange' | 'red';
}) {
  const colorClasses: Record<string, string> = {
    default: 'text-foreground',
    green: 'text-emerald-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    pink: 'text-pink-500',
  };

  const statusDot: Record<string, string> = {
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <Card className="relative transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Sparkles className="h-3 w-3" />
            <span>{title}</span>
          </div>
          {statusColor && (
            <div className={`h-2.5 w-2.5 rounded-full ${statusDot[statusColor]}`} />
          )}
        </div>
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
      </CardContent>
    </Card>
  );
}

function buildChartData(posts: CampaignPost[], campaignCreatedAt: string): ChartDataPoint[] {
  if (posts.length === 0) return [];

  const sortedPosts = [...posts].sort(
    (a, b) => new Date(a.posted_at || a.created_at).getTime() - new Date(b.posted_at || b.created_at).getTime()
  );

  const startDate = new Date(campaignCreatedAt);
  const endDate = new Date();
  const dayMs = 86400000;

  const days: string[] = [];
  for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + dayMs)) {
    days.push(d.toISOString().split('T')[0]);
  }
  if (days.length < 2) {
    const prev = new Date(startDate.getTime() - dayMs);
    days.unshift(prev.toISOString().split('T')[0]);
  }

  return days.map((day) => {
    const postsOnOrBefore = sortedPosts.filter((p) => {
      const pDate = (p.posted_at || p.created_at).split('T')[0];
      return pDate <= day;
    });
    return {
      date: day,
      views: postsOnOrBefore.reduce((s, p) => s + (p.tracked_views || 0), 0),
      likes: postsOnOrBefore.reduce((s, p) => s + (p.tracked_likes || 0), 0),
      comments: postsOnOrBefore.reduce((s, p) => s + (p.tracked_comments || 0), 0),
    };
  });
}

function formatChartDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';

function proxyImageUrl(originalUrl: string): string {
  return `${API_BASE}/api/instagram-scraper/image-proxy?url=${encodeURIComponent(originalUrl)}`;
}

function PostThumbnail({ src, alt }: { src?: string; alt: string }) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-muted-foreground">
        <Play className="h-8 w-8" />
      </div>
    );
  }

  const proxiedSrc = proxyImageUrl(src);

  return (
    <img
      src={proxiedSrc}
      alt={alt}
      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
}

export default function InstagramClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSpend, setTotalSpend] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        let { data: campaignData, error: campaignError } = await publicSupabase
          .from('instagram_campaigns')
          .select('id, campaign, name, status, public_access_enabled, public_token, price, created_at')
          .eq('public_token', token)
          .eq('public_access_enabled', true)
          .single();

        if (campaignError || !campaignData) {
          const tokenIsNumeric = /^\d+$/.test(String(token).trim());
          if (tokenIsNumeric) {
            const { data: byIdData, error: byIdError } = await publicSupabase
              .from('instagram_campaigns')
              .select('id, campaign, name, status, public_access_enabled, public_token, price, created_at')
              .eq('id', parseInt(token, 10))
              .single();

            if (!byIdError && byIdData) {
              campaignData = byIdData;
            }
          }
          if (!campaignData) {
            setError('Campaign not found or access denied');
            setLoading(false);
            return;
          }
        }

        setCampaign(campaignData);

        const { data: postsData } = await publicSupabase
          .from('campaign_posts')
          .select('id, post_url, post_type, instagram_handle, status, tracked_views, tracked_likes, tracked_comments, thumbnail_url, posted_at, created_at')
          .eq('campaign_id', campaignData.id)
          .eq('status', 'live')
          .order('created_at', { ascending: false });

        if (postsData) {
          setPosts(postsData);
        }

        const { data: creatorsData } = await publicSupabase
          .from('instagram_campaign_creators')
          .select('rate, posts_count, post_status')
          .eq('campaign_id', String(campaignData.id));

        if (creatorsData) {
          const spend = creatorsData
            .filter((c: any) => c.post_status === 'posted' || c.post_status === 'live')
            .reduce((s: number, c: any) => s + ((c.rate || 0) * (c.posts_count || 1)), 0);
          setTotalSpend(spend);
        }
      } catch (err) {
        setError('Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Instagram className="h-12 w-12 text-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Instagram className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Campaign Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'This campaign link may have expired or the campaign is not publicly accessible.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const campaignName = campaign.campaign || campaign.name || 'Instagram Campaign';
  const totalViews = posts.reduce((s, p) => s + (p.tracked_views || 0), 0);
  const totalLikes = posts.reduce((s, p) => s + (p.tracked_likes || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.tracked_comments || 0), 0);
  const campaignCp1k = totalViews > 0 && totalSpend > 0 ? (totalSpend / (totalViews / 1000)) : 0;
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
  const chartData = buildChartData(posts, campaign.created_at);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto py-3 px-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 px-3 py-1 text-xs font-semibold tracking-wider">
              ARTIST INFLUENCE
            </Badge>
            <div>
              <h1 className="text-lg font-bold">{campaignName}</h1>
              <p className="text-xs text-muted-foreground">Instagram Seeding Campaign</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
        {/* Section: Live Post Analytics */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 tracking-wide uppercase">
            Live Post Analytics
          </h2>

          {/* KPI Row 1 - Primary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3">
            <MetricCard
              title="Total Views"
              value={totalViews > 0 ? totalViews : '—'}
              icon={Eye}
              color="green"
              statusColor="green"
            />
            <MetricCard
              title="Total Likes"
              value={totalLikes > 0 ? totalLikes : '—'}
              icon={Heart}
              statusColor="blue"
            />
            <MetricCard
              title="Total Comments"
              value={totalComments > 0 ? totalComments : '—'}
              icon={MessageCircle}
              statusColor="blue"
            />
            <MetricCard
              title="Campaign CP1K"
              value={campaignCp1k > 0 ? `$${campaignCp1k.toFixed(2)}` : '—'}
              icon={DollarSign}
              color="blue"
            />
            <MetricCard
              title="Engagement Rate"
              value={engagementRate > 0 ? engagementRate.toFixed(2) : '—'}
              icon={TrendingUp}
              suffix={engagementRate > 0 ? '%' : ''}
              color="orange"
              statusColor={engagementRate >= 5 ? 'green' : engagementRate > 0 ? 'orange' : undefined}
            />
          </div>

          {/* KPI Row 2 - Secondary */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard title="Posts Live" value={posts.length} icon={Play} />
            <MetricCard
              title="Avg. Views Per Post"
              value={posts.length > 0 && totalViews > 0 ? Math.round(totalViews / posts.length) : '—'}
              icon={Eye}
            />
          </div>
        </div>

        {/* Section: Performance Chart */}
        {chartData.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                  Performance Over Time
                </CardTitle>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Likes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500" /> Comments
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="commentsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 11, fill: '#888' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatNumber}
                      tick={{ fontSize: 11, fill: '#888' }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelFormatter={formatChartDate}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString(),
                        name.charAt(0).toUpperCase() + name.slice(1),
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#viewsGrad)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="likes"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#likesGrad)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="comments"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fill="url(#commentsGrad)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section: Live Posts Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live Posts ({posts.length})</CardTitle>
            <CardDescription>Tracked Instagram posts from this campaign</CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Instagram className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No posts have been published yet.</p>
                <p className="text-sm mt-1">Check back soon for updates!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {posts.map((post) => (
                  <a
                    key={post.id}
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      <PostThumbnail
                        src={post.thumbnail_url}
                        alt={campaignName}
                      />
                      {(post.post_type === 'reel' || post.post_type === 'video') && (
                        <Badge className="absolute bottom-2 right-2 text-xs">Video</Badge>
                      )}
                    </div>

                    {/* Post info */}
                    <div className="p-3">
                      <p className="text-sm font-medium mb-1 truncate">{campaignName}</p>
                      {post.instagram_handle && post.instagram_handle !== 'pending' && (
                        <p className="text-xs text-muted-foreground mb-1 truncate">
                          @{post.instagram_handle}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {(post.tracked_views ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {(post.tracked_views ?? 0).toLocaleString()}
                          </span>
                        )}
                        {(post.tracked_likes ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {(post.tracked_likes ?? 0).toLocaleString()}
                          </span>
                        )}
                        {(post.tracked_comments ?? 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {(post.tracked_comments ?? 0).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {post.posted_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(post.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>Powered by Artist Influence</p>
        </div>
      </main>
    </div>
  );
}

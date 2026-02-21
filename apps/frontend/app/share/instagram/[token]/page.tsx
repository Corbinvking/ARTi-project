'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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

function MetricCard({
  title,
  value,
  icon: Icon,
  prefix = '',
  suffix = '',
  color = 'default',
  isSelected = false,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
  color?: 'default' | 'green' | 'blue' | 'purple' | 'orange' | 'pink';
  isSelected?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    default: 'text-foreground',
    green: 'text-emerald-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    pink: 'text-pink-500',
  };

  return (
    <Card className={`relative transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{title}</span>
          </div>
          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </div>
      </CardContent>
    </Card>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
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
        </div>
      </header>

      <main className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
        {/* Section: Live Post Analytics */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 tracking-wide uppercase">Live Post Analytics</h2>

          {/* Primary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
            <MetricCard
              title="Total Views"
              value={totalViews > 0 ? totalViews : '—'}
              icon={Eye}
              isSelected
              color="green"
            />
            <MetricCard
              title="Total Likes"
              value={totalLikes > 0 ? totalLikes : '—'}
              icon={Heart}
              isSelected
            />
            <MetricCard
              title="Total Comments"
              value={totalComments > 0 ? totalComments : '—'}
              icon={MessageCircle}
              isSelected
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
            />
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Posts Live</span>
                </div>
                <div className="text-xl font-semibold">{posts.length}</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Avg. Views Per Post</span>
                </div>
                <div className="text-xl font-semibold">
                  {posts.length > 0 && totalViews > 0
                    ? Math.round(totalViews / posts.length).toLocaleString()
                    : '—'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
                      {post.thumbnail_url ? (
                        <img
                          src={post.thumbnail_url}
                          alt={post.instagram_handle ? `@${post.instagram_handle}` : 'Post'}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Play className="h-8 w-8" />
                        </div>
                      )}
                      {(post.post_type === 'reel' || post.post_type === 'video') && (
                        <Badge className="absolute bottom-2 right-2 text-xs">Video</Badge>
                      )}
                    </div>

                    {/* Post info */}
                    <div className="p-3">
                      {post.instagram_handle && post.instagram_handle !== 'pending' && (
                        <p className="text-sm font-medium mb-1 truncate">
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

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from "../../integrations/supabase/client";
import { format } from 'date-fns';
import { Eye, Heart, MessageCircle, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

interface DailyStats {
  date: string;
  views: number;
  likes: number;
  comments: number;
  total_subscribers: number;
  subscribers_gained: number;
  time_of_day: string;
  collected_at: string;
}

interface YouTubeAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

export function YouTubeAnalyticsModal({ open, onOpenChange, campaign }: YouTubeAnalyticsModalProps) {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshingYouTubeData, setRefreshingYouTubeData] = useState(false);

  useEffect(() => {
    if (open && campaign) {
      fetchDailyStats();
    }
  }, [open, campaign]);

  const fetchDailyStats = async () => {
    if (!campaign) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_stats_daily')
        .select('date, views, likes, comments, total_subscribers, subscribers_gained, time_of_day, collected_at')
        .eq('campaign_id', campaign.id)
        .order('date', { ascending: true });

      if (error) throw error;

      setDailyStats(data || []);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  // Helper function to get latest subscriber count
  const getLatestSubscriberCount = () => {
    if (dailyStats.length > 0) {
      // Get the most recent total subscriber count
      return dailyStats[dailyStats.length - 1]?.total_subscribers || 0;
    }
    return campaign.total_subscribers || 0;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const chartData = dailyStats.map((stat, index) => ({
    date: format(new Date(stat.date), 'MMM dd'),
    views: stat.views,
    likes: stat.likes,
    comments: stat.comments,
    subscribers: stat.total_subscribers || 0,
    viewsGrowth: index > 0 ? stat.views - dailyStats[index - 1].views : 0,
    likesGrowth: index > 0 ? stat.likes - dailyStats[index - 1].likes : 0,
    commentsGrowth: index > 0 ? stat.comments - dailyStats[index - 1].comments : 0,
    subscribersGrowth: stat.subscribers_gained || 0,
  }));

  const latestStats = dailyStats[dailyStats.length - 1];
  const previousStats = dailyStats[dailyStats.length - 2];

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            YouTube Analytics: {campaign.campaign_name}
            {campaign.youtube_api_enabled ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                API Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">
                Manual Only
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center">Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            {/* Current Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(latestStats?.views || campaign.current_views || 0)}</div>
                  {latestStats && previousStats && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {getTrendIcon(calculateTrend(latestStats.views, previousStats.views))}
                      <span className="ml-1">
                        {calculateTrend(latestStats.views, previousStats.views).toFixed(1)}% from yesterday
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(latestStats?.likes || campaign.current_likes || 0)}</div>
                  {latestStats && previousStats && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {getTrendIcon(calculateTrend(latestStats.likes, previousStats.likes))}
                      <span className="ml-1">
                        {calculateTrend(latestStats.likes, previousStats.likes).toFixed(1)}% from yesterday
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(latestStats?.comments || campaign.current_comments || 0)}</div>
                  {latestStats && previousStats && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {getTrendIcon(calculateTrend(latestStats.comments, previousStats.comments))}
                      <span className="ml-1">
                        {calculateTrend(latestStats.comments, previousStats.comments).toFixed(1)}% from yesterday
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {campaign.subscribers_hidden ? 'Hidden' : formatNumber(getLatestSubscriberCount())}
                  </div>
                  {!campaign.subscribers_hidden && latestStats && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {latestStats.subscribers_gained > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="ml-1">+{formatNumber(latestStats.subscribers_gained)} today</span>
                        </>
                      ) : latestStats.subscribers_gained < 0 ? (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          <span className="ml-1">{formatNumber(latestStats.subscribers_gained)} today</span>
                        </>
                      ) : (
                        <>
                          <Minus className="w-4 h-4 text-gray-500" />
                          <span className="ml-1">No change today</span>
                        </>
                      )}
                    </div>
                  )}
                  {campaign.subscribers_hidden && (
                    <div className="text-xs text-muted-foreground">
                      Subscriber count hidden by channel
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {dailyStats.length > 0 ? (
              <>
                {/* Cumulative Growth Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cumulative Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: number) => [value.toLocaleString(), '']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="views" 
                            stroke="#3b82f6"
                            strokeWidth={2} 
                            name="Views" 
                            dot={{ r: 3, fill: "#3b82f6" }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="likes" 
                            stroke="#ef4444"
                            strokeWidth={2} 
                            name="Likes" 
                            dot={{ r: 3, fill: "#ef4444" }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="comments" 
                            stroke="#22c55e"
                            strokeWidth={2} 
                            name="Comments" 
                            dot={{ r: 3, fill: "#22c55e" }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="subscribers" 
                            stroke="#a855f7"
                            strokeWidth={2} 
                            name="Subscribers" 
                            dot={{ r: 3, fill: "#a855f7" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

              </>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    {campaign.youtube_api_enabled 
                      ? "No historical data available yet. Data will be collected daily starting tomorrow."
                      : "Enable YouTube API tracking to see historical performance data."
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {campaign.last_youtube_fetch && (
              <div className="text-xs text-muted-foreground text-center">
                Last updated: {format(new Date(campaign.last_youtube_fetch), 'MMM dd, yyyy at h:mm a')}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
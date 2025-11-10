"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Heart, 
  Repeat, 
  MessageCircle, 
  Users, 
  Play,
  ExternalLink,
  Download,
  Calendar,
  Target,
  BarChart3,
  LineChart
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface SubmissionWithAttribution {
  id: string;
  track_name: string;
  artist_name: string;
  status: string;
  support_date: string;
  track_url: string;
  family: string;
  attribution_data: {
    baseline: {
      plays: number;
      likes: number;
      reposts: number;
      comments: number;
    };
    current: {
      plays: number;
      likes: number;
      reposts: number;
      comments: number;
    };
    growth: {
      plays: number;
      likes: number;
      reposts: number;
      comments: number;
    };
  };
  performance_score: number;
}

interface PerformanceMetrics {
  totalReach: number;
  avgGrowthRate: number;
  topPerformingGenre: string;
  bestMonth: string;
}

export const AttributionDashboard = () => {
  const { member } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('6m');
  const [submissions, setSubmissions] = useState<SubmissionWithAttribution[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalReach: 0,
    avgGrowthRate: 0,
    topPerformingGenre: 'N/A',
    bestMonth: 'N/A'
  });

  const fetchAttributionData = async () => {
    if (!member?.id) return;

    setLoading(true);
    try {
      // Fetch submissions with attribution data
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          id,
          track_name,
          artist_name,
          status,
          support_date,
          track_url,
          family,
          expected_reach_min,
          expected_reach_max
        `)
        .eq('member_id', member.id)
        .eq('status', 'approved')
        .order('support_date', { ascending: false })
        .limit(50);

      if (submissionsError) throw submissionsError;

      // Fetch attribution snapshots for each submission
      const submissionsWithAttribution: SubmissionWithAttribution[] = [];
      
      for (const submission of submissionsData || []) {
        const { data: snapshots, error: snapshotsError } = await supabase
          .from('attribution_snapshots')
          .select('*')
          .eq('parent_id', submission.id)
          .eq('parent_type', 'submission')
          .order('snapshot_date', { ascending: true });

        if (snapshotsError) {
          console.error('Error fetching snapshots:', snapshotsError);
          continue;
        }

        // Calculate attribution metrics
        const baseline = snapshots?.[0] || { plays: 0, likes: 0, reposts: 0, comments: 0 };
        const current = snapshots?.[snapshots.length - 1] || baseline;
        
        const growth = {
          plays: current.plays - baseline.plays,
          likes: current.likes - baseline.likes,
          reposts: current.reposts - baseline.reposts,
          comments: current.comments - baseline.comments,
        };

        const performance_score = Math.min(
          (growth.plays * 0.4 + growth.likes * 0.3 + growth.reposts * 0.2 + growth.comments * 0.1) / 100,
          10
        );

        submissionsWithAttribution.push({
          ...submission,
          attribution_data: {
            baseline,
            current,
            growth
          },
          performance_score
        });
      }

      setSubmissions(submissionsWithAttribution);

      // Calculate performance metrics
      const totalReach = submissionsWithAttribution.reduce((sum, sub) => 
        sum + sub.attribution_data.growth.plays, 0
      );
      
      const avgGrowthRate = submissionsWithAttribution.length > 0 
        ? totalReach / submissionsWithAttribution.length 
        : 0;

      // Find top performing genre
      const genrePerformance = submissionsWithAttribution.reduce((acc, sub) => {
        if (!sub.family) return acc;
        acc[sub.family] = (acc[sub.family] || 0) + sub.attribution_data.growth.plays;
        return acc;
      }, {} as Record<string, number>);

      const topPerformingGenre = Object.entries(genrePerformance)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      setMetrics({
        totalReach,
        avgGrowthRate,
        topPerformingGenre,
        bestMonth: 'N/A' // Would need more complex date analysis
      });

    } catch (error: any) {
      console.error('Error fetching attribution data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch attribution data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributionData();
  }, [member?.id, timeframe]);

  const getPerformanceColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 8) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 6) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 4) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Poor', variant: 'destructive' as const };
  };

  // Prepare chart data
  const timelineData = submissions.map((sub, index) => ({
    name: sub.track_name.substring(0, 20) + '...',
    plays: sub.attribution_data.growth.plays,
    likes: sub.attribution_data.growth.likes,
    reposts: sub.attribution_data.growth.reposts,
    date: sub.support_date
  }));

  const genreData = Object.entries(
    submissions.reduce((acc, sub) => {
      if (!sub.family) return acc;
      acc[sub.family] = (acc[sub.family] || 0) + sub.attribution_data.growth.plays;
      return acc;
    }, {} as Record<string, number>)
  ).map(([genre, plays]) => ({ genre, plays }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d'];

  if (!member) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading member data...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Attribution Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track the real-world impact of your supported tracks
          </p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">1 Month</SelectItem>
            <SelectItem value="3m">3 Months</SelectItem>
            <SelectItem value="6m">6 Months</SelectItem>
            <SelectItem value="1y">1 Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            title: "Total Reach",
            value: metrics.totalReach.toLocaleString(),
            icon: TrendingUp,
            color: "text-primary"
          },
          {
            title: "Avg Growth",
            value: Math.round(metrics.avgGrowthRate).toLocaleString(),
            icon: BarChart3,
            color: "text-secondary"
          },
          {
            title: "Top Genre",
            value: metrics.topPerformingGenre,
            icon: Target,
            color: "text-accent"
          },
          {
            title: "Submissions",
            value: submissions.length.toString(),
            icon: Play,
            color: "text-muted-foreground"
          }
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className={`text-2xl font-bold ${metric.color}`}>
                      {metric.value}
                    </p>
                  </div>
                  <metric.icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-6">
          {/* Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Growth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="plays" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="likes" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="reposts" stackId="1" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Submissions List */}
          <Card>
            <CardHeader>
              <CardTitle>Track Performance History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{submission.track_name}</h4>
                          <Badge {...getPerformanceBadge(submission.performance_score)}>
                            {getPerformanceBadge(submission.performance_score).label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {submission.artist_name} • {submission.family} • {new Date(submission.support_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-medium flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            +{submission.attribution_data.growth.plays.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">plays</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            +{submission.attribution_data.growth.likes.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">likes</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium flex items-center gap-1">
                            <Repeat className="h-3 w-3" />
                            +{submission.attribution_data.growth.reposts.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">reposts</p>
                        </div>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={submission.track_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance by Genre */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Genre</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genreData}
                      dataKey="plays"
                      nameKey="genre"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ genre, percent }) => `${genre} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {genreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performing Tracks */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Tracks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submissions
                    .sort((a, b) => b.performance_score - a.performance_score)
                    .slice(0, 5)
                    .map((track, index) => (
                      <div key={track.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{track.track_name}</p>
                            <p className="text-sm text-muted-foreground">{track.family}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getPerformanceColor(track.performance_score)}`}>
                            {track.performance_score.toFixed(1)}/10
                          </p>
                          <p className="text-sm text-muted-foreground">
                            +{track.attribution_data.growth.plays.toLocaleString()} plays
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          {/* Monthly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="plays" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Export & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Export & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF Report
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
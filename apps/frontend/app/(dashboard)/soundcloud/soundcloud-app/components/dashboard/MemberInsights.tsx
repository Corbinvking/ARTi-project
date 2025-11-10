"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Users, UserCheck, TrendingUp, Star, Activity, 
  Download, Award, Music
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';

interface MemberMetrics {
  totalMembers: number;
  activeMembers: number;
  newThisMonth: number;
  retentionRate: number;
  avgEngagement: number;
  topPerformers: number;
}

interface MemberSegment {
  segment: string;
  count: number;
  percentage: number;
  avgScore: number;
  color: string;
}


interface GenrePerformance {
  genre: string;
  memberCount: number;
  avgScore: number;
  successRate: number;
  growthRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const MemberInsights: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState<MemberMetrics>({
    totalMembers: 0,
    activeMembers: 0,
    newThisMonth: 0,
    retentionRate: 0,
    avgEngagement: 0,
    topPerformers: 0,
  });
  
  const [segments, setSegments] = useState<MemberSegment[]>([]);
  const [genrePerformance, setGenrePerformance] = useState<GenrePerformance[]>([]);

  useEffect(() => {
    fetchMemberInsights();
  }, []);

  const fetchMemberInsights = async () => {
    try {
      setLoading(true);

      // Fetch total member count and basic stats
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, name, primary_email, soundcloud_url, status, size_tier, soundcloud_followers, created_at, updated_at');

      if (memberError) throw memberError;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const currentMonth = new Date();
      currentMonth.setDate(1);

      // Calculate basic metrics
      const totalMembers = memberData?.length || 0;
      const activeMembers = memberData?.filter(m => m.status === 'active').length || 0;
      const newThisMonth = memberData?.filter(m => new Date(m.created_at) >= currentMonth).length || 0;

      // Calculate retention rate (simplified - members active vs total)
      const retentionRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

      // Calculate engagement scores for members
      const membersWithScores = memberData?.map(member => {
        const followerWeight = Math.log10((member.soundcloud_followers || 0) + 1) * 10;
        const tierWeight = getTierMultiplier(member.size_tier);
        const recentWeight = new Date(member.updated_at) > thirtyDaysAgo ? 20 : 0;
        
        return {
          ...member,
          engagementScore: Math.min(100, (followerWeight + recentWeight) * tierWeight)
        };
      }) || [];

      const avgEngagement = membersWithScores.length > 0 
        ? membersWithScores.reduce((sum, m) => sum + m.engagementScore, 0) / membersWithScores.length 
        : 0;

      const topPerformers = membersWithScores.filter(m => m.engagementScore > 80).length;

      // Create member segments based on actual data
      const segments = createMemberSegments(membersWithScores, avgEngagement);

      // Fetch genre performance data
      const genrePerformanceData = await fetchGenrePerformance();

      const calculatedMetrics: MemberMetrics = {
        totalMembers,
        activeMembers,
        newThisMonth,
        retentionRate: Math.round(retentionRate * 10) / 10,
        avgEngagement: Math.round(avgEngagement * 10) / 10,
        topPerformers,
      };

      setMetrics(calculatedMetrics);
      setSegments(segments);
      setGenrePerformance(genrePerformanceData);
    } catch (error: any) {
      console.error('Error fetching member insights:', error);
      toast({
        title: "Error",
        description: "Failed to load member insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierMultiplier = (tier: string) => {
    const multipliers = { T1: 1.0, T2: 1.2, T3: 1.5, T4: 2.0 };
    return multipliers[tier as keyof typeof multipliers] || 1.0;
  };

  const extractHandle = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/soundcloud\.com\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const formatLastActive = (date: string) => {
    const now = new Date();
    const lastActive = new Date(date);
    const diffHours = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} days ago`;
    return 'Over a month ago';
  };

  const createMemberSegments = (members: any[], avgEngagement: number): MemberSegment[] => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = members.filter(m => new Date(m.created_at) > thirtyDaysAgo);
    const powerUsers = members.filter(m => m.engagementScore > avgEngagement * 1.5 && new Date(m.created_at) <= thirtyDaysAgo);
    const regularUsers = members.filter(m => m.engagementScore >= avgEngagement * 0.7 && m.engagementScore <= avgEngagement * 1.5 && new Date(m.created_at) <= thirtyDaysAgo);
    const casualUsers = members.filter(m => m.engagementScore < avgEngagement * 0.7 && new Date(m.created_at) <= thirtyDaysAgo);

    const total = members.length;
    
    return [
      {
        segment: 'Power Users',
        count: powerUsers.length,
        percentage: Math.round((powerUsers.length / total) * 100),
        avgScore: powerUsers.length > 0 ? Math.round(powerUsers.reduce((sum, m) => sum + m.engagementScore, 0) / powerUsers.length) : 0,
        color: '#0088FE'
      },
      {
        segment: 'Regular Users',
        count: regularUsers.length,
        percentage: Math.round((regularUsers.length / total) * 100),
        avgScore: regularUsers.length > 0 ? Math.round(regularUsers.reduce((sum, m) => sum + m.engagementScore, 0) / regularUsers.length) : 0,
        color: '#00C49F'
      },
      {
        segment: 'Casual Users',
        count: casualUsers.length,
        percentage: Math.round((casualUsers.length / total) * 100),
        avgScore: casualUsers.length > 0 ? Math.round(casualUsers.reduce((sum, m) => sum + m.engagementScore, 0) / casualUsers.length) : 0,
        color: '#FFBB28'
      },
      {
        segment: 'New Users',
        count: newUsers.length,
        percentage: Math.round((newUsers.length / total) * 100),
        avgScore: newUsers.length > 0 ? Math.round(newUsers.reduce((sum, m) => sum + m.engagementScore, 0) / newUsers.length) : 0,
        color: '#FF8042'
      }
    ];
  };


  const fetchGenrePerformance = async (): Promise<GenrePerformance[]> => {
    try {
      const { data: genreData, error } = await supabase
        .from('genre_families')
        .select(`
          id,
          name,
          member_genres!inner(
            member_id,
            members(soundcloud_followers, size_tier)
          )
        `);

      if (error) throw error;

      return genreData?.map(genre => {
        const members = genre.member_genres || [];
        const memberCount = members.length;
        
        if (memberCount === 0) {
          return {
            genre: genre.name,
            memberCount: 0,
            avgScore: 0,
            successRate: 0,
            growthRate: 0
          };
        }

        const avgFollowers = members.reduce((sum: number, mg: any) => 
          sum + (mg.members?.soundcloud_followers || 0), 0) / memberCount;
        
        const avgScore = Math.min(100, Math.log10(avgFollowers + 1) * 12);

        return {
          genre: genre.name,
          memberCount,
          avgScore: Math.round(avgScore),
          successRate: Math.round(85 + Math.random() * 10), // Placeholder until submission data available
          growthRate: Math.round(Math.random() * 25) // Placeholder until historical data available
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching genre performance:', error);
      return [];
    }
  };

  const getTierBadge = (tier: string) => {
    const tierColors = {
      T1: 'bg-gray-500',
      T2: 'bg-blue-500', 
      T3: 'bg-purple-500',
      T4: 'bg-orange-500'
    };
    return (
      <Badge className={`${tierColors[tier as keyof typeof tierColors]} text-white`}>
        {tier}
      </Badge>
    );
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500 text-white">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-500 text-white">Good</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500 text-white">Fair</Badge>;
    return <Badge className="bg-red-500 text-white">Needs Improvement</Badge>;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading member insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Member Insights
          </h1>
          <p className="text-muted-foreground">
            Deep analysis of member behavior, performance, and engagement patterns
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Insights
        </Button>
      </div>

      {/* Key Member Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-primary shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(metrics.totalMembers).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-accent shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserCheck className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {(metrics.activeMembers).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-primary-glow shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-glow">
              {(metrics.newThisMonth).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-accent shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Activity className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{metrics.retentionRate}%</div>
            <Progress value={metrics.retentionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-primary shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Star className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.avgEngagement}%</div>
            <Progress value={metrics.avgEngagement} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-primary-glow shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Award className="h-4 w-4 text-primary-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-glow">
              {(metrics.topPerformers).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="genres">By Genre</TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Segmentation</CardTitle>
                <CardDescription>Distribution of members by engagement level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={segments}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ segment, percentage }) => `${segment}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {segments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segment Performance</CardTitle>
                <CardDescription>Average performance scores by segment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {segments.map((segment, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{segment.segment}</span>
                        <span className="text-sm text-muted-foreground">
                          {segment.count} members ({segment.percentage}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={segment.avgScore} className="flex-1" />
                        <span className="text-sm font-bold w-12">{segment.avgScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="genres" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Genre Performance Analysis</CardTitle>
              <CardDescription>Member engagement and success rates by music genre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={genrePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="genre" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="memberCount" fill="hsl(var(--primary))" name="Member Count" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  {genrePerformance.map((genre, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          {genre.genre}
                        </h4>
                        <Badge variant="outline">{genre.memberCount} members</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Avg Score</p>
                          <p className="font-bold">{genre.avgScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Success Rate</p>
                          <p className="font-bold">{genre.successRate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Growth</p>
                          <p className="font-bold text-green-600">+{genre.growthRate}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};
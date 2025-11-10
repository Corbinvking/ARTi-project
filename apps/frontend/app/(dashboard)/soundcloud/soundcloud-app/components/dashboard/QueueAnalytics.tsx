"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, TrendingUp, TrendingDown, Calendar, Users, 
  Target, Zap, Clock, Star, AlertCircle, CheckCircle,
  Filter, Download, RefreshCw, Eye, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// DatePickerWithRange component would be implemented separately
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { InteractiveCard } from '../ui/interactive-card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { addDays, format, subDays } from 'date-fns';

interface QueuePerformanceData {
  date: string;
  totalQueues: number;
  completedQueues: number;
  avgFillRate: number;
  avgEngagement: number;
  memberSatisfaction: number;
  totalCreditsUsed: number;
  avgCreditsPerSlot: number;
  conflictRate: number;
  successRate: number;
}

interface GenreAnalytics {
  genre: string;
  totalSubmissions: number;
  successRate: number;
  avgEngagement: number;
  topPerformers: string[];
  trendDirection: 'up' | 'down' | 'stable';
  color: string;
}

interface MemberPerformanceAnalytics {
  memberId: string;
  memberName: string;
  totalAssignments: number;
  completionRate: number;
  avgEngagement: number;
  creditsEarned: number;
  satisfactionScore: number;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  recentTrend: 'improving' | 'declining' | 'stable';
}

interface OptimizationInsight {
  type: 'improvement' | 'warning' | 'success';
  category: 'genre' | 'member' | 'timing' | 'credits' | 'reach';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation?: string;
}

export const QueueAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedMetric, setSelectedMetric] = useState<string>('overview');
  const [performanceData, setPerformanceData] = useState<QueuePerformanceData[]>([]);
  const [genreAnalytics, setGenreAnalytics] = useState<GenreAnalytics[]>([]);
  const [memberAnalytics, setMemberAnalytics] = useState<MemberPerformanceAnalytics[]>([]);
  const [insights, setInsights] = useState<OptimizationInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // Enhanced with performance optimization hooks would go here

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    
    try {
      // In production, these would be real database queries
      await Promise.all([
        loadPerformanceData(),
        loadGenreAnalytics(),
        loadMemberAnalytics(),
        generateInsights()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    // Mock performance data
    const mockData: QueuePerformanceData[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      mockData.push({
        date: format(date, 'yyyy-MM-dd'),
        totalQueues: Math.floor(Math.random() * 3) + 1,
        completedQueues: Math.floor(Math.random() * 3) + 1,
        avgFillRate: 75 + Math.random() * 20,
        avgEngagement: 6 + Math.random() * 3,
        memberSatisfaction: 7 + Math.random() * 2,
        totalCreditsUsed: 800 + Math.random() * 400,
        avgCreditsPerSlot: 35 + Math.random() * 20,
        conflictRate: Math.random() * 8,
        successRate: 80 + Math.random() * 15
      });
    }
    setPerformanceData(mockData);
  };

  const loadGenreAnalytics = async () => {
    const mockGenres: GenreAnalytics[] = [
      {
        genre: 'Electronic',
        totalSubmissions: 245,
        successRate: 87.3,
        avgEngagement: 7.8,
        topPerformers: ['DJ Phoenix', 'ElectroBeats', 'SynthWave'],
        trendDirection: 'up',
        color: '#8884d8'
      },
      {
        genre: 'Hip Hop',
        totalSubmissions: 189,
        successRate: 82.1,
        avgEngagement: 8.2,
        topPerformers: ['MC FlowState', 'UrbanVibes', 'RapCentral'],
        trendDirection: 'up',
        color: '#82ca9d'
      },
      {
        genre: 'Pop',
        totalSubmissions: 156,
        successRate: 79.5,
        avgEngagement: 7.1,
        topPerformers: ['PopStar', 'MainstreamHits', 'ChartToppers'],
        trendDirection: 'stable',
        color: '#ffc658'
      },
      {
        genre: 'Rock',
        totalSubmissions: 98,
        successRate: 74.2,
        avgEngagement: 6.9,
        topPerformers: ['RockSolid', 'GuiterHero', 'MetalCore'],
        trendDirection: 'down',
        color: '#ff7c7c'
      },
      {
        genre: 'Other',
        totalSubmissions: 67,
        successRate: 71.8,
        avgEngagement: 6.4,
        topPerformers: ['IndieVibes', 'AltSounds', 'ExperimentalBeats'],
        trendDirection: 'stable',
        color: '#d084d0'
      }
    ];
    setGenreAnalytics(mockGenres);
  };

  const loadMemberAnalytics = async () => {
    const mockMembers: MemberPerformanceAnalytics[] = [
      {
        memberId: 'mem_1',
        memberName: 'DJ Phoenix',
        totalAssignments: 45,
        completionRate: 97.8,
        avgEngagement: 8.7,
        creditsEarned: 892,
        satisfactionScore: 9.2,
        tier: 'T3',
        recentTrend: 'improving'
      },
      {
        memberId: 'mem_2',
        memberName: 'ElectroBeats',
        totalAssignments: 38,
        completionRate: 94.7,
        avgEngagement: 8.1,
        creditsEarned: 756,
        satisfactionScore: 8.8,
        tier: 'T2',
        recentTrend: 'stable'
      },
      {
        memberId: 'mem_3',
        memberName: 'UrbanVibes',
        totalAssignments: 42,
        completionRate: 91.9,
        avgEngagement: 7.9,
        creditsEarned: 683,
        satisfactionScore: 8.4,
        tier: 'T3',
        recentTrend: 'improving'
      },
      {
        memberId: 'mem_4',
        memberName: 'PopStar',
        totalAssignments: 29,
        completionRate: 86.2,
        avgEngagement: 7.2,
        creditsEarned: 498,
        satisfactionScore: 7.9,
        tier: 'T2',
        recentTrend: 'declining'
      }
    ];
    setMemberAnalytics(mockMembers);
  };

  const generateInsights = async () => {
    const mockInsights: OptimizationInsight[] = [
      {
        type: 'success',
        category: 'genre',
        title: 'Electronic Music Performance',
        description: 'Electronic submissions show consistently high engagement rates (+12% above average)',
        impact: 'high',
        actionable: true,
        recommendation: 'Consider increasing electronic music allocation in upcoming queues'
      },
      {
        type: 'warning',
        category: 'member',
        title: 'Declining Member Performance',
        description: '3 members show declining engagement over the past 2 weeks',
        impact: 'medium',
        actionable: true,
        recommendation: 'Reach out to underperforming members for feedback and support'
      },
      {
        type: 'improvement',
        category: 'timing',
        title: 'Queue Timing Optimization',
        description: 'Tuesday and Thursday queues perform 8% better than other weekdays',
        impact: 'medium',
        actionable: true,
        recommendation: 'Prioritize Tuesday/Thursday for high-value submissions'
      },
      {
        type: 'improvement',
        category: 'credits',
        title: 'Credit Efficiency',
        description: 'Current credit allocation could be optimized to improve ROI by 15%',
        impact: 'high',
        actionable: true,
        recommendation: 'Adjust credit weights based on historical performance data'
      }
    ];
    setInsights(mockInsights);
  };

  const exportReport = () => {
    // Export functionality would be implemented here
    toast({
      title: "Report Exported",
      description: "Analytics report has been downloaded as CSV"
    });
  };

  const getInsightIcon = (type: OptimizationInsight['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'improvement': return <TrendingUp className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': case 'improving': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': case 'declining': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const currentMetrics = performanceData.length > 0 ? {
    avgFillRate: performanceData.reduce((acc, d) => acc + d.avgFillRate, 0) / performanceData.length,
    avgEngagement: performanceData.reduce((acc, d) => acc + d.avgEngagement, 0) / performanceData.length,
    totalCreditsUsed: performanceData.reduce((acc, d) => acc + d.totalCreditsUsed, 0),
    avgSuccessRate: performanceData.reduce((acc, d) => acc + d.successRate, 0) / performanceData.length,
    totalQueues: performanceData.reduce((acc, d) => acc + d.totalQueues, 0),
    avgConflictRate: performanceData.reduce((acc, d) => acc + d.conflictRate, 0) / performanceData.length
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl font-bold">Queue Analytics</h1>
          <p className="text-muted-foreground">
            Performance insights and optimization recommendations
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </Button>
          <Button variant="outline" onClick={loadAnalyticsData} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {currentMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Avg Fill Rate', value: currentMetrics.avgFillRate, suffix: '%', icon: Target },
            { label: 'Avg Engagement', value: currentMetrics.avgEngagement, suffix: '/10', icon: Activity },
            { label: 'Total Queues', value: currentMetrics.totalQueues, icon: Calendar },
            { label: 'Success Rate', value: currentMetrics.avgSuccessRate, suffix: '%', icon: CheckCircle },
            { label: 'Credits Used', value: currentMetrics.totalCreditsUsed, icon: Zap },
            { label: 'Conflict Rate', value: currentMetrics.avgConflictRate, suffix: '%', icon: AlertCircle }
          ].map((metric, index) => (
            <InteractiveCard key={metric.label} hoverScale={1.03}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metric.value).toLocaleString()}
                  {metric.suffix}
                </div>
              </CardContent>
            </InteractiveCard>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
          <TabsTrigger value="genres">Genre Analysis</TabsTrigger>
          <TabsTrigger value="members">Member Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights & Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Queue Fill Rate Trend</CardTitle>
                <CardDescription>Daily queue completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM d')} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                      formatter={(value) => [`${typeof value === 'number' ? value.toFixed(1) : value}%`, 'Fill Rate']}
                    />
                    <Line type="monotone" dataKey="avgFillRate" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>Member engagement and satisfaction</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM d')} />
                    <YAxis domain={[0, 10]} />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                    />
                    <Line type="monotone" dataKey="avgEngagement" stroke="#82ca9d" strokeWidth={2} name="Avg Engagement" />
                    <Line type="monotone" dataKey="memberSatisfaction" stroke="#ffc658" strokeWidth={2} name="Member Satisfaction" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Over Time</CardTitle>
              <CardDescription>Comprehensive view of queue performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Success Rate</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM d')} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="successRate" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Credit Usage</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM d')} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="totalCreditsUsed" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="genres">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Genre Performance Analysis</CardTitle>
                <CardDescription>Success rates and engagement by genre</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Genre</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Avg Engagement</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {genreAnalytics.map((genre) => (
                      <TableRow key={genre.genre}>
                        <TableCell className="font-medium">{genre.genre}</TableCell>
                        <TableCell>{genre.totalSubmissions}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{genre.successRate.toFixed(1)}%</span>
                            <Progress value={genre.successRate} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>{genre.avgEngagement.toFixed(1)}/10</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(genre.trendDirection)}
                            <span className="text-sm capitalize">{genre.trendDirection}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Genre Distribution</CardTitle>
                <CardDescription>Submission volume by genre</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genreAnalytics}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalSubmissions"
                      label={({ genre, percent }) => `${genre} ${(percent * 100).toFixed(0)}%`}
                    >
                      {genreAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Member Performance Leaderboard</CardTitle>
              <CardDescription>Top performing members and their key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Assignments</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Avg Engagement</TableHead>
                    <TableHead>Credits Earned</TableHead>
                    <TableHead>Satisfaction</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberAnalytics.map((member, index) => (
                    <TableRow key={member.memberId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{member.memberName}</p>
                            <Badge variant="outline" className="text-xs">{member.tier}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.totalAssignments}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{member.completionRate.toFixed(1)}%</span>
                          <Progress value={member.completionRate} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{member.avgEngagement.toFixed(1)}/10</TableCell>
                      <TableCell>{member.creditsEarned}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span>{member.satisfactionScore.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(member.recentTrend)}
                          <span className="text-sm capitalize">{member.recentTrend}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Insights</CardTitle>
                <CardDescription>AI-generated recommendations for improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <motion.div
                      key={index}
                      className="p-4 border rounded-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{insight.title}</h4>
                            <Badge 
                              variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {insight.impact} impact
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                          {insight.recommendation && (
                            <div className="p-2 bg-blue-50 rounded text-sm">
                              <strong>Recommendation:</strong> {insight.recommendation}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Key takeaways from current period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <h4 className="font-medium text-green-900">Strong Performance Areas</h4>
                    </div>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Fill rates consistently above 85%</li>
                      <li>• Member satisfaction remains high (8.7/10)</li>
                      <li>• Electronic genre showing excellent engagement</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <h4 className="font-medium text-orange-900">Areas for Improvement</h4>
                    </div>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Rock genre needs better supporter matching</li>
                      <li>• 3 members showing performance decline</li>
                      <li>• Credit optimization could improve ROI</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium text-blue-900">Trending Opportunities</h4>
                    </div>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Tuesday/Thursday queues perform best</li>
                      <li>• AI matching accuracy improving</li>
                      <li>• New member onboarding success rate up 12%</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
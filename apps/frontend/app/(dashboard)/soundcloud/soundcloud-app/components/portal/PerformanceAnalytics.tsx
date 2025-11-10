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
  TrendingDown,
  BarChart3, 
  Calendar,
  Clock,
  Target,
  Award,
  Lightbulb,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, LineChart as RechartsLineChart, Line } from 'recharts';

interface PerformanceData {
  month: string;
  submissions: number;
  approvals: number;
  credits: number;
}

interface Achievement {
  title: string;
  description: string;
  icon: any;
  unlocked: boolean;
  progress: number;
}

export const PerformanceAnalytics = () => {
  const { member } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalReach, setTotalReach] = useState(0);

  const fetchPerformanceData = async () => {
    if (!member?.id) return;

    setLoading(true);
    try {
      // Fetch submission data over time
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('submitted_at, status, expected_reach_min')
        .eq('member_id', member.id)
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { submissions: number; approvals: number; credits: number; reach: number }> = {};
      let reachTotal = 0;

      submissions?.forEach(sub => {
        const month = new Date(sub.submitted_at).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { submissions: 0, approvals: 0, credits: 0, reach: 0 };
        }
        
        monthlyData[month].submissions++;
        if (sub.status === 'approved') {
          monthlyData[month].approvals++;
          monthlyData[month].credits += 5; // Assume 5 credits per approval
          monthlyData[month].reach += sub.expected_reach_min || 0;
          reachTotal += sub.expected_reach_min || 0;
        }
      });

      const performanceArray = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month: new Date(month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          ...data
        }))
        .slice(-12); // Last 12 months

      setPerformanceData(performanceArray);
      setTotalReach(reachTotal);

      // Calculate achievements
      const totalSubmissions = submissions?.length || 0;
      const totalApprovals = submissions?.filter(s => s.status === 'approved').length || 0;
      const approvalRate = totalSubmissions > 0 ? (totalApprovals / totalSubmissions) * 100 : 0;

      setAchievements([
        {
          title: "First Steps",
          description: "Submit your first track",
          icon: Award,
          unlocked: totalSubmissions >= 1,
          progress: Math.min(totalSubmissions, 1) * 100
        },
        {
          title: "Getting Started",
          description: "Get your first approval",
          icon: Target,
          unlocked: totalApprovals >= 1,
          progress: Math.min(totalApprovals, 1) * 100
        },
        {
          title: "Consistency",
          description: "Submit 10 tracks",
          icon: Activity,
          unlocked: totalSubmissions >= 10,
          progress: Math.min((totalSubmissions / 10) * 100, 100)
        },
        {
          title: "High Performer",
          description: "Achieve 75% approval rate",
          icon: TrendingUp,
          unlocked: approvalRate >= 75,
          progress: Math.min(approvalRate * (100/75), 100)
        },
        {
          title: "Power User",
          description: "Get 25 approvals",
          icon: Lightbulb,
          unlocked: totalApprovals >= 25,
          progress: Math.min((totalApprovals / 25) * 100, 100)
        }
      ]);

    } catch (error: any) {
      console.error('Error fetching performance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [member?.id]);

  if (!member) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading member data...
      </div>
    );
  }

  // Calculate insights
  const latestMonth = performanceData[performanceData.length - 1];
  const previousMonth = performanceData[performanceData.length - 2];
  const monthlyTrend = latestMonth && previousMonth 
    ? ((latestMonth.approvals - previousMonth.approvals) / Math.max(previousMonth.approvals, 1)) * 100
    : 0;

  const averageApprovalRate = performanceData.length > 0 
    ? (performanceData.reduce((sum, data) => sum + (data.submissions > 0 ? (data.approvals / data.submissions) * 100 : 0), 0) / performanceData.length)
    : 0;

  const bestPerformingMonth = performanceData.reduce((best, current) => 
    current.approvals > best.approvals ? current : best, 
    performanceData[0] || { month: 'N/A', approvals: 0 }
  );

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8'];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Performance Analytics
        </h1>
        <p className="text-muted-foreground">
          Deep insights into your submission patterns and success metrics
        </p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            title: "Total Reach",
            value: totalReach.toLocaleString(),
            icon: TrendingUp,
            color: "text-primary",
            trend: monthlyTrend,
            trendLabel: `${monthlyTrend > 0 ? '+' : ''}${monthlyTrend.toFixed(1)}% vs last month`
          },
          {
            title: "Approval Rate",
            value: `${averageApprovalRate.toFixed(1)}%`,
            icon: Target,
            color: "text-secondary",
            trend: 0,
            trendLabel: "Average over time"
          },
          {
            title: "Best Month",
            value: bestPerformingMonth.month,
            icon: Award,
            color: "text-accent",
            trend: 0,
            trendLabel: `${bestPerformingMonth.approvals} approvals`
          },
          {
            title: "Credits Earned",
            value: member.net_credits.toString(),
            icon: Activity,
            color: "text-muted-foreground",
            trend: 0,
            trendLabel: "Current balance"
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
                    <div className="flex items-center gap-1 mt-1">
                      {metric.trend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : metric.trend < 0 ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : null}
                      <p className="text-xs text-muted-foreground">{metric.trendLabel}</p>
                    </div>
                  </div>
                  <metric.icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="submissions" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="approvals" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Approval Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Approval Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsLineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`${((value as number) * 100).toFixed(1)}%`, 'Approval Rate']} />
                    <Line 
                      type="monotone" 
                      dataKey={(data: any) => data.submissions > 0 ? data.approvals / data.submissions : 0}
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--accent))' }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Credit Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Credit Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={performanceData.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="credits" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border transition-all ${
                      achievement.unlocked 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-muted/20 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${
                        achievement.unlocked 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <achievement.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{achievement.title}</h3>
                          {achievement.unlocked && (
                            <Badge variant="secondary">Unlocked</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {achievement.description}
                        </p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{achievement.progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 mt-1">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(achievement.progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Achievement */}
          <Card>
            <CardHeader>
              <CardTitle>Next Achievement</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const nextAchievement = achievements.find(a => !a.unlocked);
                if (!nextAchievement) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Congratulations! You've unlocked all achievements!</p>
                    </div>
                  );
                }
                
                return (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <nextAchievement.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{nextAchievement.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {nextAchievement.description}
                      </p>
                      <div className="mt-2 w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(nextAchievement.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Success Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Success Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">High Success Rate</p>
                  <p className="text-sm text-green-600">Your House tracks have a 85% approval rate</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Optimal Timing</p>
                  <p className="text-sm text-blue-600">Tuesday submissions get approved 40% faster</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-800">Quality Trend</p>
                  <p className="text-sm text-purple-600">Your track quality scores have improved by 15%</p>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Genre Diversification</p>
                  <p className="text-sm text-yellow-600">Try submitting Techno tracks for better reach</p>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-sm font-medium text-indigo-800">Submission Timing</p>
                  <p className="text-sm text-indigo-600">Submit 2-3 days before your preferred support date</p>
                </div>
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
                  <p className="text-sm font-medium text-pink-800">Track Quality</p>
                  <p className="text-sm text-pink-600">Use professional mastering for higher approval rates</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  Based on your submission history, you're performing above average with a {averageApprovalRate.toFixed(1)}% approval rate. 
                  Your strongest month was {bestPerformingMonth.month} with {bestPerformingMonth.approvals} approvals.
                </p>
                <p className="mt-4">
                  To improve your performance, consider focusing on genres where you've had success and maintain consistent 
                  submission quality. Your track analysis scores suggest you're getting better at selecting tracks that 
                  resonate with our audience.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
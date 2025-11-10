"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { useMemberSubmissions } from '../../hooks/useMemberSubmissions';
import { motion } from 'framer-motion';
import { ScrollReveal } from '../ui/scroll-reveal';
import { InteractiveCard } from '../ui/interactive-card';
import { 
  Music, Upload, TrendingUp, Coins, ArrowRight, Clock, CheckCircle, 
  XCircle, AlertTriangle, Users, Calendar, Target, Trophy, 
  BarChart3, TrendingDown, Zap, Award, Star, Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SimilarArtists } from './SimilarArtists';
import { CreditHistory } from './CreditHistory';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../integrations/supabase/client';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

interface PerformanceData {
  month: string;
  submissions: number;
  approved: number;
  credits: number;
}

export const EnhancedMemberDashboard = () => {
  const { member } = useAuth();
  const { stats, loading } = useMemberSubmissions();
  const navigate = useNavigate();
  
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalReach, setTotalReach] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (member) {
      fetchPerformanceData();
      calculateAchievements();
      fetchReachData();
    }
  }, [member]);

  const fetchPerformanceData = async () => {
    if (!member) return;

    try {
      // Fetch last 6 months of submission data
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('status, submitted_at, expected_reach_planned')
        .eq('member_id', member.id)
        .gte('submitted_at', sixMonthsAgo.toISOString())
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData: { [key: string]: PerformanceData } = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      submissions?.forEach(submission => {
        const date = new Date(submission.submitted_at);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            submissions: 0,
            approved: 0,
            credits: 0
          };
        }
        
        monthlyData[monthKey].submissions++;
        if (submission.status === 'approved') {
          monthlyData[monthKey].approved++;
          monthlyData[monthKey].credits += submission.expected_reach_planned || 0;
        }
      });

      setPerformanceData(Object.values(monthlyData));
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  const fetchReachData = async () => {
    if (!member) return;

    try {
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('expected_reach_planned')
        .eq('member_id', member.id)
        .eq('status', 'approved');

      if (error) throw error;

      const total = submissions?.reduce((sum, sub) => sum + (sub.expected_reach_planned || 0), 0) || 0;
      setTotalReach(total);
    } catch (error) {
      console.error('Error fetching reach data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const calculateAchievements = () => {
    if (!member || !stats) return;

    const newAchievements: Achievement[] = [
      {
        id: 'first-submission',
        title: 'First Steps',
        description: 'Submit your first track',
        icon: Upload,
        unlocked: stats.totalSubmissions >= 1,
        progress: Math.min(stats.totalSubmissions, 1),
        maxProgress: 1
      },
      {
        id: 'ten-submissions',
        title: 'Regular Contributor',
        description: 'Submit 10 tracks',
        icon: Music,
        unlocked: stats.totalSubmissions >= 10,
        progress: Math.min(stats.totalSubmissions, 10),
        maxProgress: 10
      },
      {
        id: 'first-approval',
        title: 'Getting Started',
        description: 'Get your first track approved',
        icon: CheckCircle,
        unlocked: stats.approvedSubmissions >= 1,
        progress: Math.min(stats.approvedSubmissions, 1),
        maxProgress: 1
      },
      {
        id: 'five-approvals',
        title: 'Rising Star',
        description: 'Get 5 tracks approved',
        icon: Star,
        unlocked: stats.approvedSubmissions >= 5,
        progress: Math.min(stats.approvedSubmissions, 5),
        maxProgress: 5
      },
      {
        id: 'twenty-approvals',
        title: 'Chart Climber',
        description: 'Get 20 tracks approved',
        icon: TrendingUp,
        unlocked: stats.approvedSubmissions >= 20,
        progress: Math.min(stats.approvedSubmissions, 20),
        maxProgress: 20
      },
      {
        id: 'high-approval-rate',
        title: 'Quality Creator',
        description: 'Maintain 80%+ approval rate (min 5 submissions)',
        icon: Trophy,
        unlocked: stats.totalSubmissions >= 5 && (stats.approvedSubmissions / stats.totalSubmissions) >= 0.8,
        progress: Math.min((stats.approvedSubmissions / Math.max(stats.totalSubmissions, 1)) * 100, 80),
        maxProgress: 80
      },
      {
        id: 'credit-master',
        title: 'Support Master',
        description: 'Accumulate 1000+ credits',
        icon: Coins,
        unlocked: (member.net_credits || 0) >= 1000,
        progress: Math.min(member.net_credits || 0, 1000),
        maxProgress: 1000
      },
      {
        id: 'monthly-consistent',
        title: 'Consistent Creator',
        description: 'Submit at least one track for 3 consecutive months',
        icon: Calendar,
        unlocked: false, // This would require more complex logic
        progress: 2,
        maxProgress: 3
      }
    ];

    setAchievements(newAchievements);
  };

  if (!member) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading member data...
      </div>
    );
  }

  const submissionProgress = (stats.thisMonthSubmissions / member.monthly_repost_limit) * 100;
  const remainingSubmissions = member.monthly_repost_limit - stats.thisMonthSubmissions;
  const approvalRate = stats.totalSubmissions > 0 ? (stats.approvedSubmissions / stats.totalSubmissions) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'qa_flag': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const nextAchievement = achievements.find(a => !a.unlocked);

  const pieData = [
    { name: 'Approved', value: stats.approvedSubmissions, color: 'hsl(var(--chart-1))' },
    { name: 'Pending', value: stats.pendingSubmissions, color: 'hsl(var(--chart-2))' },
    { name: 'Rejected', value: stats.rejectedSubmissions, color: 'hsl(var(--chart-3))' }
  ];

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Welcome Header with Enhanced Stats */}
      <ScrollReveal>
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {member.name}!
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-muted-foreground">
                Track your submissions and performance
              </p>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">{approvalRate.toFixed(1)}% approval rate</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="px-3 py-1">
              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
            </Badge>
            <Badge variant="outline">Tier {member.size_tier}</Badge>
          </div>
        </motion.div>
      </ScrollReveal>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Key Stats Grid */}
          <ScrollReveal direction="up" delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  title: "This Month",
                  icon: Upload,
                  value: `${stats.thisMonthSubmissions}/${member.monthly_repost_limit}`,
                  description: "submissions used",
                  progress: submissionProgress,
                  color: "hsl(var(--primary))"
                },
                {
                  title: "Pending",
                  icon: Clock,
                  value: stats.pendingSubmissions,
                  description: "awaiting review",
                  color: "hsl(var(--chart-2))"
                },
                {
                  title: "Approved",
                  icon: CheckCircle,
                  value: stats.approvedSubmissions,
                  description: "total approved",
                  color: "hsl(var(--chart-1))"
                },
                {
                  title: "Credits",
                  icon: Coins,
                  value: member.net_credits,
                  description: "available balance",
                  color: "hsl(var(--chart-4))"
                },
                {
                  title: "Total Reach",
                  icon: Target,
                  value: totalReach,
                  description: "potential listeners",
                  color: "hsl(var(--chart-5))",
                  loading: loadingStats
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <InteractiveCard hoverScale={1.03} glowOnHover>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stat.loading ? (
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {(typeof stat.value === 'string' ? parseInt(stat.value.split('/')[0]) : stat.value).toLocaleString()}
                            {typeof stat.value === 'string' && stat.value.includes('/') && 
                              `/${stat.value.split('/')[1]}`
                            }
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                      {stat.progress !== undefined && (
                        <Progress value={stat.progress} className="mt-2" />
                      )}
                    </CardContent>
                  </InteractiveCard>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>

          {/* Quick Actions Enhanced */}
          <ScrollReveal direction="up" delay={0.4}>
            <InteractiveCard hoverScale={1.01} glowOnHover>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      icon: Upload,
                      title: "Submit New Track",
                      description: "Upload your latest SoundCloud link",
                      badge: remainingSubmissions > 0 ? `${remainingSubmissions} left` : 'Limit reached',
                      onClick: () => navigate('/portal/submit'),
                      disabled: remainingSubmissions <= 0,
                      bgColor: "bg-primary/10",
                      iconColor: "text-primary"
                    },
                    {
                      icon: Music,
                      title: "View History",
                      description: "Check your submission status",
                      badge: `${stats.totalSubmissions} total`,
                      onClick: () => navigate('/portal/history'),
                      bgColor: "bg-secondary/10",
                      iconColor: "text-secondary"
                    },
                    {
                      icon: Users,
                      title: "Support Queue",
                      description: "View your support assignments",
                      onClick: () => navigate('/portal/queue'),
                      bgColor: "bg-accent/10",
                      iconColor: "text-accent"
                    }
                  ].map((action, index) => (
                    <Button 
                      key={action.title}
                      variant="outline" 
                      className="h-20 flex flex-col items-center gap-2"
                      onClick={action.onClick}
                      disabled={action.disabled}
                    >
                      <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                      <div className="text-center">
                        <div className="font-medium text-sm">{action.title}</div>
                        {action.badge && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </InteractiveCard>
          </ScrollReveal>

          {/* Credit History and Similar Artists */}
          <ScrollReveal direction="up" delay={0.6}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CreditHistory />
              <SimilarArtists />
            </div>
          </ScrollReveal>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submission Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Submission Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Area 
                      type="monotone" 
                      dataKey="submissions" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.1}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="approved" 
                      stroke="hsl(var(--chart-1))" 
                      fill="hsl(var(--chart-1))" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Submission Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          {/* Achievements Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unlocked Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Unlocked Achievements ({unlockedAchievements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unlockedAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/20">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <achievement.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                    <Award className="h-5 w-5 text-yellow-500" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Next Achievement */}
            {nextAchievement && (
              <Card>
                <CardHeader>
                  <CardTitle>Next Achievement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-4 border border-border rounded-lg">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <nextAchievement.icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{nextAchievement.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{nextAchievement.description}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{nextAchievement.progress} / {nextAchievement.maxProgress}</span>
                        </div>
                        <Progress 
                          value={(nextAchievement.progress / nextAchievement.maxProgress) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Insights and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-medium text-primary">Approval Rate Analysis</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your approval rate of {approvalRate.toFixed(1)}% is {approvalRate >= 70 ? 'excellent' : approvalRate >= 50 ? 'good' : 'needs improvement'}.
                    {approvalRate < 50 && ' Consider reviewing your submission quality and genre targeting.'}
                  </p>
                </div>
                
                <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-lg">
                  <h4 className="font-medium text-secondary">Credit Efficiency</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have {member.net_credits} credits available. 
                    {member.net_credits > 500 ? ' Consider supporting more artists to maximize your network reach.' : ' Focus on earning more credits through consistent submissions.'}
                  </p>
                </div>

                <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                  <h4 className="font-medium text-accent">Monthly Activity</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've used {stats.thisMonthSubmissions} of {member.monthly_repost_limit} submissions this month.
                    {remainingSubmissions > 0 ? ` You have ${remainingSubmissions} submissions remaining.` : ' You\'ve reached your monthly limit.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {remainingSubmissions > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/portal/submit')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Submit your next track
                  </Button>
                )}
                
                {member.net_credits > 100 && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/portal/queue')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Support other artists
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/portal/profile')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Update your profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
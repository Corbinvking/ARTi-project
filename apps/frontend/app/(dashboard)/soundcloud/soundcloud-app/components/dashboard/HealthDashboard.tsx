"use client"

import React, { useState, useEffect } from 'react';
import { Activity, Users, TrendingUp, AlertTriangle, Calendar, Music } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format, subDays, startOfDay } from 'date-fns';

interface HealthMetrics {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  atRiskMembers: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  avgSubmissionsPerMember: number;
  avgCreditsPerMember: number;
  memberEngagementRate: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

interface RecentActivity {
  date: string;
  newMembers: number;
  newSubmissions: number;
  completedSupports: number;
}

export const HealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchHealthMetrics();
    fetchRecentActivity();
  }, []);

  const fetchHealthMetrics = async () => {
    try {
      // Fetch member metrics
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('status, net_credits, last_submission_at, created_at');

      if (membersError) throw membersError;

      // Fetch submission metrics
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('status, submitted_at, member_id');

      if (submissionsError) throw submissionsError;

      // Calculate metrics
      const totalMembers = members?.length || 0;
      const activeMembers = members?.filter(m => m.status === 'active').length || 0;
      const inactiveMembers = members?.filter(m => m.status === 'needs_reconnect').length || 0;
      
      // Members at risk: active but haven't submitted in 30+ days
      const thirtyDaysAgo = subDays(new Date(), 30);
      const atRiskMembers = members?.filter(m => 
        m.status === 'active' && 
        (!m.last_submission_at || new Date(m.last_submission_at) < thirtyDaysAgo)
      ).length || 0;

      const totalSubmissions = submissions?.length || 0;
      const pendingSubmissions = submissions?.filter(s => s.status === 'new').length || 0;
      
      const avgSubmissionsPerMember = totalMembers > 0 ? totalSubmissions / totalMembers : 0;
      const avgCreditsPerMember = totalMembers > 0 
        ? (members?.reduce((sum, m) => sum + (m.net_credits || 0), 0) || 0) / totalMembers 
        : 0;

      const memberEngagementRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

      // Determine system health
      let systemHealth: 'good' | 'warning' | 'critical' = 'good';
      const newAlerts: string[] = [];

      if (memberEngagementRate < 50) {
        systemHealth = 'critical';
        newAlerts.push('Low member engagement rate');
      } else if (memberEngagementRate < 70) {
        systemHealth = 'warning';
        newAlerts.push('Member engagement below optimal');
      }

      if (atRiskMembers > totalMembers * 0.2) {
        systemHealth = systemHealth === 'good' ? 'warning' : 'critical';
        newAlerts.push('High number of at-risk members');
      }

      if (pendingSubmissions > 50) {
        systemHealth = systemHealth === 'good' ? 'warning' : 'critical';
        newAlerts.push('Large submission backlog');
      }

      setMetrics({
        totalMembers,
        activeMembers,
        inactiveMembers,
        atRiskMembers,
        totalSubmissions,
        pendingSubmissions,
        avgSubmissionsPerMember: Math.round(avgSubmissionsPerMember * 10) / 10,
        avgCreditsPerMember: Math.round(avgCreditsPerMember),
        memberEngagementRate: Math.round(memberEngagementRate),
        systemHealth
      });

      setAlerts(newAlerts);

    } catch (error) {
      console.error('Error fetching health metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load health metrics",
        variant: "destructive",
      });
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return {
          date: format(date, 'yyyy-MM-dd'),
          dateObj: startOfDay(date)
        };
      }).reverse();

      const activity: RecentActivity[] = [];

      for (const day of last7Days) {
        const nextDay = format(new Date(day.dateObj.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        // Count new members
        const { data: newMembers } = await supabase
          .from('members')
          .select('id')
          .gte('created_at', day.date)
          .lt('created_at', nextDay);

        // Count new submissions
        const { data: newSubmissions } = await supabase
          .from('submissions')
          .select('id')
          .gte('submitted_at', day.date)
          .lt('submitted_at', nextDay);

        // Count completed supports (placeholder - would need queue_assignments table)
        const completedSupports = 0; // TODO: Implement when queue system is active

        activity.push({
          date: day.date,
          newMembers: newMembers?.length || 0,
          newSubmissions: newSubmissions?.length || 0,
          completedSupports
        });
      }

      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'good':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning':
        return <Badge variant="secondary">Warning</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading health metrics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load health metrics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Monitor member activity, engagement rates, and system performance
          </p>
        </div>
        {getHealthBadge(metrics.systemHealth)}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Members</p>
                <p className="text-2xl font-bold">{metrics.totalMembers}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.activeMembers} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Engagement Rate</p>
                <p className="text-2xl font-bold">{metrics.memberEngagementRate}%</p>
                <Progress value={metrics.memberEngagementRate} className="w-full mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">At Risk Members</p>
                <p className="text-2xl font-bold">{metrics.atRiskMembers}</p>
                <p className="text-xs text-muted-foreground">
                  Need attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Music className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold">{metrics.pendingSubmissions}</p>
                <p className="text-xs text-muted-foreground">
                  Submissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              System Metrics
            </CardTitle>
            <CardDescription>
              Key performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Submissions</span>
              <span className="text-sm">{metrics.totalSubmissions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Avg Submissions/Member</span>
              <span className="text-sm">{metrics.avgSubmissionsPerMember}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Avg Credits/Member</span>
              <span className="text-sm">{metrics.avgCreditsPerMember}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Inactive Members</span>
              <span className="text-sm">{metrics.inactiveMembers}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Last 7 days activity summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {format(new Date(day.date), 'MMM d')}
                  </span>
                  <div className="flex space-x-4 text-muted-foreground">
                    <span>{day.newMembers} members</span>
                    <span>{day.newSubmissions} submissions</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
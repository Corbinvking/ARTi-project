import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, CheckCircle, XCircle, DollarSign, Calendar, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";

interface CampaignHealthMetrics {
  overduePayments: number;
  missingPosts: number;
  approvalBottlenecks: number;
  activeCollab: number;
  totalBudgetAtRisk: number;
  completionRate: number;
}

interface HealthAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  action?: string;
}

export const CampaignHealthDashboard = () => {
  // Fetch campaign creators with their status
  const { data: campaignCreators = [], isLoading } = useQuery({
    queryKey: ['campaign-creators-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_creators')
        .select(`
          *,
          campaign_id,
          campaigns!inner(name, status, budget)
        `)
        .eq('campaigns.status', 'active');
      
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }
  });

  // Ensure campaignCreators is always an array
  const safeCreators = Array.isArray(campaignCreators) ? campaignCreators : [];

  // Calculate health metrics
  const healthMetrics = useMemo((): CampaignHealthMetrics => {
    const now = new Date();
    const overdueThreshold = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago

    const overduePayments = safeCreators.filter(creator => 
      creator.payment_status === 'unpaid' && 
      creator.due_date && new Date(creator.due_date) < now
    ).length;

    const missingPosts = safeCreators.filter(creator => 
      creator.post_status === 'not_posted' && 
      creator.expected_post_date && new Date(creator.expected_post_date) < now
    ).length;

    const approvalBottlenecks = safeCreators.filter(creator => 
      creator.approval_status === 'pending' && 
      creator.created_at && new Date(creator.created_at) < overdueThreshold
    ).length;

    const activeCollab = safeCreators.filter(creator => 
      creator.post_status === 'posted' && creator.approval_status === 'approved'
    ).length;

    const totalBudgetAtRisk = safeCreators
      .filter(creator => 
        creator.payment_status === 'unpaid' || creator.post_status === 'not_posted'
      )
      .reduce((sum, creator) => sum + (creator.rate || 0), 0);

    const completedTasks = safeCreators.filter(creator => 
      creator.payment_status === 'paid' && 
      creator.post_status === 'posted' && 
      creator.approval_status === 'approved'
    ).length;

    const completionRate = safeCreators.length > 0 
      ? (completedTasks / safeCreators.length) * 100 
      : 0;

    return {
      overduePayments,
      missingPosts,
      approvalBottlenecks,
      activeCollab,
      totalBudgetAtRisk,
      completionRate
    };
  }, [safeCreators]);

  // Generate health alerts
  const healthAlerts = useMemo((): HealthAlert[] => {
    const alerts: HealthAlert[] = [];

    if (healthMetrics.overduePayments > 0) {
      alerts.push({
        id: 'overdue-payments',
        type: 'critical',
        title: 'Overdue Payments',
        description: 'Creators waiting for payment past due date',
        count: healthMetrics.overduePayments,
        action: 'Process payments'
      });
    }

    if (healthMetrics.missingPosts > 0) {
      alerts.push({
        id: 'missing-posts',
        type: 'warning',
        title: 'Missing Posts',
        description: 'Expected posts past their scheduled date',
        count: healthMetrics.missingPosts,
        action: 'Follow up with creators'
      });
    }

    if (healthMetrics.approvalBottlenecks > 0) {
      alerts.push({
        id: 'approval-bottlenecks',
        type: 'warning',
        title: 'Approval Bottlenecks',
        description: 'Pending approvals over 7 days old',
        count: healthMetrics.approvalBottlenecks,
        action: 'Review and approve'
      });
    }

    if (healthMetrics.activeCollab > 0) {
      alerts.push({
        id: 'active-collabs',
        type: 'info',
        title: 'Active Collaborations',
        description: 'Successfully running campaigns',
        count: healthMetrics.activeCollab
      });
    }

    return alerts;
  }, [healthMetrics]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Campaign Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  const getAlertBadgeVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'destructive' as const;
      case 'warning':
        return 'secondary' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campaign Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-2">
              {healthMetrics.completionRate.toFixed(1)}%
            </div>
            <Progress value={healthMetrics.completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Overall completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget at Risk
            </CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              ${healthMetrics.totalBudgetAtRisk.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending payments & posts
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Collaborations
            </CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {healthMetrics.activeCollab}
            </div>
            <p className="text-xs text-muted-foreground">
              Running successfully
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {healthMetrics.overduePayments + healthMetrics.missingPosts + healthMetrics.approvalBottlenecks}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Alerts */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Campaign Health Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthAlerts.length > 0 ? (
            <div className="space-y-3">
              {healthAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <div className="font-medium text-foreground">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getAlertBadgeVariant(alert.type)}>
                      {alert.count}
                    </Badge>
                    {alert.action && (
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                        {alert.action}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
              <p className="text-foreground font-medium">All campaigns are running smoothly!</p>
              <p className="text-muted-foreground text-sm">No critical issues detected</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
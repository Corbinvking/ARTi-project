"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  Calendar,
  Users,
  Activity,
  AlertTriangle,
  Music,
  Copy,
  RefreshCw,
  Gauge,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { CampaignIntakeForm } from './CampaignIntakeForm';
import { MemberSubmissionForm } from './MemberSubmissionForm';
import { useToast } from '@/hooks/use-toast';
import { useOperationalDashboard } from '../../hooks/useOperationalDashboard';

function MetricSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

const UnifiedOverview = () => {
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useOperationalDashboard();

  const handleCopyLink = async (formType: 'campaign' | 'member') => {
    const baseUrl = window.location.origin;
    const link = formType === 'campaign'
      ? `${baseUrl}/soundcloud/dashboard/planner?form=${formType}`
      : `${baseUrl}/soundcloud/submit`;

    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copied!",
        description: `${formType === 'campaign' ? 'Campaign intake' : 'Member submission'} form link copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleFormsSuccess = () => {
    refetch();
  };

  const getHealthColor = (rate: number) => {
    if (rate >= 95) return 'text-green-500';
    if (rate >= 85) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthLabel = (rate: number) => {
    if (rate >= 95) return 'Healthy';
    if (rate >= 85) return 'Degraded';
    return 'Critical';
  };

  const getQueueColor = (capacity: number) => {
    if (capacity >= 90) return 'text-red-500';
    if (capacity >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const alertSeverityStyles = {
    critical: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
  };

  const alertIconStyles = {
    critical: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
  };

  const alertTextStyles = {
    critical: 'text-red-800 dark:text-red-200',
    warning: 'text-yellow-800 dark:text-yellow-200',
  };

  const alertDescStyles = {
    critical: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'failed_integration': return <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />;
      case 'disconnected_member': return <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />;
      case 'queue_threshold': return <Gauge className="h-4 w-4 mt-0.5 flex-shrink-0" />;
      case 'stuck_campaign': return <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />;
      default: return <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Operations Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            System health, queue status, revenue, and actionable alerts
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-300">
            Some data failed to load. Displayed values may be incomplete.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TOP ROW — Executive Health Metrics */}
      {/* ============================================================ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            {/* Monthly Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(data?.monthlyRevenue.total ?? 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {(data?.monthlyRevenue.percentChange ?? 0) >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <p className={`text-xs ${(data?.monthlyRevenue.percentChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(data?.monthlyRevenue.percentChange ?? 0) >= 0 ? '+' : ''}
                    {data?.monthlyRevenue.percentChange ?? 0}% from last month
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Active Campaigns */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.activeCampaigns.total ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.activeCampaigns.paid ?? 0} Paid / {data?.activeCampaigns.free ?? 0} Free
                </p>
              </CardContent>
            </Card>

            {/* Active Members */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.activeMembers.total ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.activeMembers.connectedToPlanner ?? 0} on Planner / {data?.activeMembers.notConnectedToPlanner ?? 0} not connected
                </p>
              </CardContent>
            </Card>

            {/* Queue Capacity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Capacity</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getQueueColor(data?.queueCapacity ?? 0)}`}>
                  {data?.queueCapacity ?? 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {(data?.queueCapacity ?? 0) >= 80 ? 'Near capacity — expand targets' : 'Within normal range'}
                </p>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getHealthColor(data?.systemHealth.successRate ?? 0)}`}>
                  {data?.systemHealth.successRate ?? 0}%
                  <span className="text-sm font-normal ml-1">
                    {getHealthLabel(data?.systemHealth.successRate ?? 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.systemHealth.automationFailures24h ?? 0} failures (24h) &middot; {data?.systemHealth.activeWarnings ?? 0} warnings
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* MIDDLE — Intake Section (kept as-is) */}
      {/* ============================================================ */}
      <Card className="bg-gradient-to-br from-card to-muted border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Intake Forms
          </CardTitle>
          <CardDescription>
            Open forms directly or copy links to share with members and clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Campaign Intake Form */}
            <div className="group relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Campaign Intake</h3>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Paid</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Submit new paid campaign requests from clients
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
                      onClick={() => setShowCampaignForm(true)}
                    >
                      Open Form
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary/30 hover:bg-primary/10"
                      onClick={() => handleCopyLink('campaign')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Submission Form */}
            <div className="group relative overflow-hidden rounded-lg border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-4 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold text-foreground">Member Submission</h3>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Free</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Submit tracks for free queue support
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-accent to-accent hover:from-accent/90 hover:to-accent/90"
                      onClick={() => setShowSubmissionForm(true)}
                    >
                      Open Form
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-accent/30 hover:bg-accent/10"
                      onClick={() => handleCopyLink('member')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* BOTTOM ROW — Throughput + Avg Campaign Value + Alerts */}
      {/* ============================================================ */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bottom Left: Today's Throughput + Financial Metric */}
        <div className="space-y-4">
          {/* Today's Throughput */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Today&apos;s Throughput
              </CardTitle>
              <CardDescription>
                Confirms system momentum and queue movement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">
                      {data?.throughput.tracksProcessed ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Tracks Processed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">
                      {data?.throughput.campaignsCompleted ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Campaigns Done</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-foreground">
                      {data?.throughput.newEntries ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">New Entries</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Average Campaign Value */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Campaign Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    ${(data?.avgCampaignValue ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Revenue per active paid campaign
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Right: System Alerts */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              System Alerts
              {data?.alerts && data.alerts.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">
                  {data.alerts.length} action{data.alerts.length > 1 ? 's' : ''} required
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Action required only — intervene now
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : data?.alerts && data.alerts.length > 0 ? (
              <div className="space-y-3">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${alertSeverityStyles[alert.severity]}`}
                  >
                    <div className={alertIconStyles[alert.severity]}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${alertTextStyles[alert.severity]}`}>
                        {alert.title}
                      </p>
                      <p className={`text-xs ${alertDescStyles[alert.severity]}`}>
                        {alert.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-foreground">All clear</p>
                <p className="text-xs text-muted-foreground">No action required right now</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Intake Form Modals */}
      <CampaignIntakeForm
        open={showCampaignForm}
        onOpenChange={setShowCampaignForm}
        onSuccess={handleFormsSuccess}
      />

      <MemberSubmissionForm
        open={showSubmissionForm}
        onOpenChange={setShowSubmissionForm}
        onSuccess={handleFormsSuccess}
      />
    </div>
  );
};

export default UnifiedOverview;

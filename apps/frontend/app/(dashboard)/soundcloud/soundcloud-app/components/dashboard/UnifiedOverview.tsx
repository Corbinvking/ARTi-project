"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign, Calendar, Activity, AlertTriangle, Music,
  Copy, Zap, CheckCircle, ArrowUpRight, ArrowDownRight, Gauge,
} from 'lucide-react';
import { CampaignIntakeForm } from './CampaignIntakeForm';
import { MemberSubmissionForm } from './MemberSubmissionForm';
import { useToast } from '@/hooks/use-toast';
import { useDashboardMetrics, type ActionAlert } from '../../hooks/useDashboardMetrics';
import Link from 'next/link';

function MetricSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function queueColor(percent: number) {
  if (percent > 85) return 'text-red-500';
  if (percent > 70) return 'text-yellow-500';
  return 'text-green-500';
}

function healthColor(rate: number) {
  if (rate < 90) return 'text-red-500';
  if (rate < 95) return 'text-yellow-500';
  return 'text-green-500';
}

function progressColor(percent: number) {
  if (percent > 85) return '[&>div]:bg-red-500';
  if (percent > 70) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-green-500';
}

const UnifiedOverview = () => {
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const { toast } = useToast();
  const { data: metrics, isLoading, error } = useDashboardMetrics();

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
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleFormsSuccess = () => {
    // React Query will auto-refetch via the configured interval
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Operations</h1>
        <p className="text-muted-foreground">
          System status, queue health, and revenue at a glance
        </p>
      </div>

      {/* Top Row — Executive Health Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : error ? (
          <Card className="col-span-full">
            <CardContent className="py-6">
              <p className="text-sm text-destructive">Failed to load dashboard metrics. Try refreshing.</p>
            </CardContent>
          </Card>
        ) : metrics ? (
          <>
            {/* Monthly Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${metrics.monthlyRevenue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {metrics.revenueChangePercent >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={metrics.revenueChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {metrics.revenueChangePercent >= 0 ? '+' : ''}{metrics.revenueChangePercent}%
                  </span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${metrics.avgCampaignValue.toLocaleString()} avg campaign value
                </p>
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
                  {metrics.activeCampaigns.total}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.activeCampaigns.paid} paid / {metrics.activeCampaigns.free} free
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
                <div className={`text-2xl font-bold ${queueColor(metrics.queueCapacityPercent)}`}>
                  {metrics.queueCapacityPercent}%
                </div>
                <Progress
                  value={metrics.queueCapacityPercent}
                  className={`h-2 mt-2 ${progressColor(metrics.queueCapacityPercent)}`}
                />
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${healthColor(metrics.systemHealth.successRate)}`}>
                  {metrics.systemHealth.successRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.systemHealth.activeWarnings === 0
                    ? 'No issues'
                    : `${metrics.systemHealth.activeWarnings} issue${metrics.systemHealth.activeWarnings === 1 ? '' : 's'}`}
                  {metrics.systemHealth.failuresLast24h > 0 &&
                    ` · ${metrics.systemHealth.failuresLast24h} failure${metrics.systemHealth.failuresLast24h === 1 ? '' : 's'} (24h)`}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Intake Forms */}
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

      {/* Bottom Row — Throughput + Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Throughput */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Today&apos;s Throughput
            </CardTitle>
            <CardDescription>
              Confirms system momentum and queue movement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-32" />
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tracks processed</span>
                  <span className="text-lg font-semibold">{metrics.throughputToday.tracksProcessed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Campaigns completed</span>
                  <span className="text-lg font-semibold">{metrics.throughputToday.campaignsCompleted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New entries</span>
                  <span className="text-lg font-semibold">{metrics.throughputToday.newEntries}</span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* System Alerts — Action Only */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Action Required
            </CardTitle>
            <CardDescription>
              Only showing alerts that need intervention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : metrics && metrics.actionAlerts.length > 0 ? (
              <div className="space-y-3">
                {metrics.actionAlerts.map((alert: ActionAlert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-sm text-muted-foreground">All systems operational — no action needed</p>
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

function AlertItem({ alert }: { alert: ActionAlert }) {
  const isCritical = alert.severity === 'critical';
  const bgClass = isCritical
    ? 'bg-red-500/10 border-red-500/30'
    : 'bg-yellow-500/10 border-yellow-500/30';
  const iconClass = isCritical ? 'text-red-500' : 'text-yellow-500';
  const textClass = isCritical ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgClass}`}>
      <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textClass}`}>{alert.title}</p>
        <p className="text-xs text-muted-foreground">{alert.description}</p>
      </div>
      {alert.link && (
        <Link href={alert.link} className="shrink-0">
          <Button size="sm" variant="ghost" className="h-7 px-2">
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        </Link>
      )}
    </div>
  );
}

export default UnifiedOverview;

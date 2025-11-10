"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '../../hooks/use-mobile';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { RevenueAnalytics } from './RevenueAnalytics';
import { MemberInsights } from './MemberInsights';
import { CampaignAnalytics } from './CampaignAnalytics';
import { QueueAnalytics } from './QueueAnalytics';
import { WeeklyCampaignReports } from './WeeklyCampaignReports';
import { DataExportManager } from './DataExportManager';
import { BusinessIntelligence } from './BusinessIntelligence';
import { AnomalyMonitor } from './AnomalyMonitor';
import { MobileDashboard, MobileChart } from '../ui/mobile-analytics';
import { useAnalyticsTracking, useAnalyticsData } from '../../hooks/useAnalyticsTracking';
import { useProgressiveLoading, useAnalyticsCache } from '../../hooks/usePerformanceOptimization';
import { useAnomalyDetection } from '../../hooks/useAnomalyDetection';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  AlertTriangle,
  Download,
  Settings,
  Smartphone,
  Monitor
} from 'lucide-react';

interface UnifiedAnalyticsProps {
  defaultView?: 'desktop' | 'mobile';
  embedded?: boolean;
}

export const IntegratedAnalytics: React.FC<UnifiedAnalyticsProps> = ({ 
  defaultView, 
  embedded = false 
}) => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(
    defaultView || (isMobile ? 'mobile' : 'desktop')
  );
  const [selectedTab, setSelectedTab] = useState('overview');

  // Analytics hooks
  const { trackPageView, trackClick } = useAnalyticsTracking();
  const { fetchMemberPerformance, fetchRevenueData } = useAnalyticsData();
  const { getCachedData, setCachedData } = useAnalyticsCache();
  const { anomalyStats } = useAnomalyDetection();

  // Progressive loading for performance
  const {
    data: memberData,
    loading: memberLoading,
    loadMore: loadMoreMembers
  } = useProgressiveLoading(
    fetchMemberPerformance,
    [],
    { pageSize: 20, cacheKey: 'member_performance', enableCache: true }
  );

  // Mobile metrics data
  const mobileMetrics = [
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      value: 125420,
      change: 12.5,
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-green-500',
      unit: '$'
    },
    {
      id: 'active-members',
      title: 'Active Members',
      value: 1247,
      change: 8.2,
      trend: 'up' as const,
      icon: Users,
      color: 'text-blue-500'
    },
    {
      id: 'campaigns',
      title: 'Active Campaigns',
      value: 23,
      change: -2.1,
      trend: 'down' as const,
      icon: BarChart3,
      color: 'text-orange-500'
    },
    {
      id: 'engagement',
      title: 'Avg Engagement',
      value: 8.7,
      change: 5.3,
      trend: 'up' as const,
      icon: Activity,
      color: 'text-purple-500',
      unit: '/10'
    }
  ];

  // Mobile charts data
  const mobileCharts = [
    {
      title: 'Revenue Trend',
      type: 'line' as const,
      data: [
        { name: 'Jan', value: 45000 },
        { name: 'Feb', value: 52000 },
        { name: 'Mar', value: 48000 },
        { name: 'Apr', value: 61000 },
        { name: 'May', value: 55000 },
        { name: 'Jun', value: 67000 }
      ]
    },
    {
      title: 'Member Distribution',
      type: 'pie' as const,
      data: [
        { name: 'T1', value: 35 },
        { name: 'T2', value: 25 },
        { name: 'T3', value: 25 },
        { name: 'T4', value: 15 }
      ]
    },
    {
      title: 'Campaign Performance',
      type: 'bar' as const,
      data: [
        { name: 'Completed', value: 89 },
        { name: 'Active', value: 23 },
        { name: 'Pending', value: 12 },
        { name: 'Paused', value: 3 }
      ]
    }
  ];

  // Track page views
  useEffect(() => {
    trackPageView('integrated_analytics', {
      view_mode: viewMode,
      tab: selectedTab,
      embedded
    });
  }, [viewMode, selectedTab, embedded, trackPageView]);

  // Alert for anomalies
  const hasAnomalies = anomalyStats.bySeverity.critical > 0 || anomalyStats.bySeverity.high > 0;

  if (viewMode === 'mobile') {
    return (
      <div className="space-y-4">
        {/* View Mode Toggle */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('desktop')}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Desktop View
            </Button>
          </div>
        </div>

        {/* Anomaly Alert */}
        {hasAnomalies && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {anomalyStats.bySeverity.critical} critical anomalies detected
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Tap to view details and take action
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Dashboard */}
        <MobileDashboard 
          metrics={mobileMetrics}
          charts={mobileCharts}
        />
      </div>
    );
  }

  // Desktop View
  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrated Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics dashboard with mobile optimization and real-time insights
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('mobile')}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile View
            </Button>
          )}
          
          {hasAnomalies && (
            <Badge variant="destructive" className="animate-pulse">
              {anomalyStats.bySeverity.critical + anomalyStats.bySeverity.high} Alerts
            </Badge>
          )}
        </div>
      </div>

      {/* Anomaly Alert */}
      {hasAnomalies && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Anomalies Detected - Immediate Attention Required
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {anomalyStats.bySeverity.critical} critical, {anomalyStats.bySeverity.high} high priority
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setSelectedTab('anomalies')}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Tabs with All Analytics */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="anomalies">
            Anomalies
            {hasAnomalies && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {anomalyStats.bySeverity.critical + anomalyStats.bySeverity.high}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueAnalytics />
        </TabsContent>

        <TabsContent value="members">
          <MemberInsights />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignAnalytics />
        </TabsContent>

        <TabsContent value="queue">
          <QueueAnalytics />
        </TabsContent>

        <TabsContent value="reports">
          <WeeklyCampaignReports />
        </TabsContent>

        <TabsContent value="exports">
          <DataExportManager />
        </TabsContent>

        <TabsContent value="intelligence">
          <BusinessIntelligence />
        </TabsContent>

        <TabsContent value="anomalies">
          <AnomalyMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
};
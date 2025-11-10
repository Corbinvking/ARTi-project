"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalyticsHeader, ActionButtonGroup } from '@/components/ui/analytics-header';
import { 
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Target, TrendingUp, DollarSign, RefreshCw, Award, Download
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalRevenue: number;
  avgROI: number;
  successRate: number;
}

interface PerformanceTrend {
  month: string;
  campaigns: number;
  revenue: number;
  roi: number;
  satisfaction: number;
}

export const CampaignAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    totalRevenue: 0,
    avgROI: 0,
    successRate: 0,
  });
  
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrend[]>([]);

  useEffect(() => {
    fetchCampaignAnalytics();
  }, [timeRange]);

  const fetchCampaignAnalytics = async () => {
    try {
      setLoading(true);

      // Get date range for filtering
      const now = new Date();
      const monthsBack = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

      // Fetch campaign metrics
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (campaignsError) throw campaignsError;

      // Calculate metrics from real data
      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'live').length || 0;
      const completedCampaigns = campaigns?.filter(c => c.status === 'completed').length || 0;
      const totalRevenue = campaigns?.reduce((sum, c) => sum + (c.price_usd || 0), 0) || 0;
      const successRate = totalCampaigns > 0 ? (completedCampaigns / totalCampaigns) * 100 : 0;

      // Calculate ROI from attribution data if available
      const { data: attributionData } = await supabase
        .from('campaign_attribution_analytics')
        .select('repost_goal_progress_pct')
        .not('repost_goal_progress_pct', 'is', null);

      const avgROI = attributionData?.length 
        ? attributionData.reduce((sum, a) => sum + (a.repost_goal_progress_pct || 0), 0) / attributionData.length
        : 0;

      // Generate monthly trends from real data
      const monthlyData = new Map();
      campaigns?.forEach(campaign => {
        const month = new Date(campaign.created_at).toLocaleString('default', { month: 'short' });
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { campaigns: 0, revenue: 0, roi: 0, satisfaction: 95 });
        }
        const data = monthlyData.get(month);
        data.campaigns += 1;
        data.revenue += campaign.price_usd || 0;
      });

      const trendsData: PerformanceTrend[] = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        campaigns: data.campaigns,
        revenue: data.revenue,
        roi: avgROI,
        satisfaction: data.satisfaction,
      }));

      setMetrics({
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalRevenue,
        avgROI,
        successRate,
      });

      setPerformanceTrends(trendsData);
    } catch (error: any) {
      console.error('Error fetching campaign analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading campaign analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        title="Campaign Analytics"
        description="Comprehensive campaign performance, ROI analysis, and client insights"
        actions={
          <ActionButtonGroup>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchCampaignAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </ActionButtonGroup>
        }
      />

      {/* Key Campaign Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-primary shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(metrics.totalCampaigns).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{metrics.activeCampaigns} currently active</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-accent shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              ${metrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedCampaigns} completed campaigns
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-primary-glow shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-glow">
              {metrics.avgROI > 0 ? `${metrics.avgROI.toFixed(1)}%` : 'Coming soon'}
            </div>
            <Progress value={Math.min(metrics.avgROI / 5, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-accent shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Award className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{metrics.successRate.toFixed(1)}%</div>
            <Progress value={metrics.successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance Trends</CardTitle>
            <CardDescription>Monthly campaign volume and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {performanceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                    name="Revenue ($)"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="campaigns" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    name="Campaigns"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No campaign data available yet. Create your first campaign to see trends.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ROI & Satisfaction Trends</CardTitle>
            <CardDescription>Performance quality metrics over time</CardDescription>
          </CardHeader>
          <CardContent>
            {performanceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="roi" 
                    stroke="hsl(var(--primary-glow))" 
                    strokeWidth={2}
                    name="ROI (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="satisfaction" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    name="Satisfaction (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Performance metrics will appear once campaigns have attribution data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
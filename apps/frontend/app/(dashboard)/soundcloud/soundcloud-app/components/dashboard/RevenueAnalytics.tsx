"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalyticsHeader, ActionButtonGroup } from '@/components/ui/analytics-header';
import { 
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  DollarSign, TrendingUp, Target, Calendar,
  Download, RefreshCw, Users, Zap
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';

interface RevenueMetrics {
  totalRevenue: number;
  campaignRevenue: number;
  averageOrderValue: number;
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  revenueGrowth: number;
  campaignSuccessRate: number;
}

interface RevenueData {
  date: string;
  revenue: number;
  campaigns: number;
}

export const RevenueAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    campaignRevenue: 0,
    averageOrderValue: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    revenueGrowth: 0,
    campaignSuccessRate: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);

  useEffect(() => {
    fetchRevenueData();
  }, [timeRange]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);

      // Fetch campaigns data
      const { data: campaigns, error: campaignsError } = await supabase
        .from('soundcloud_campaigns')
        .select('*');

      if (campaignsError) throw campaignsError;

      // Calculate metrics from real data
      const totalRevenue = campaigns?.reduce((sum, campaign) => sum + (campaign.sales_price || 0), 0) || 0;
      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'Active').length || 0;
      const completedCampaigns = campaigns?.filter(c => c.status === 'Completed').length || 0;
      const averageOrderValue = totalCampaigns > 0 ? totalRevenue / totalCampaigns : 0;

      // Generate monthly revenue data from campaigns
      const monthlyData: { [key: string]: { revenue: number; campaigns: number } } = {};
      
      campaigns?.forEach(campaign => {
        if (campaign.created_at && campaign.sales_price) {
          const month = new Date(campaign.created_at).toISOString().slice(0, 7); // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, campaigns: 0 };
          }
          monthlyData[month].revenue += campaign.sales_price;
          monthlyData[month].campaigns += 1;
        }
      });

      // Convert to chart data
      const chartData: RevenueData[] = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // Last 6 months
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          campaigns: data.campaigns
        }));

      // Calculate growth rate (last month vs previous month)
      let revenueGrowth = 0;
      if (chartData.length >= 2) {
        const current = chartData[chartData.length - 1].revenue;
        const previous = chartData[chartData.length - 2].revenue;
        if (previous > 0) {
          revenueGrowth = ((current - previous) / previous) * 100;
        }
      }

      // Calculate campaign success rate
      const campaignSuccessRate = totalCampaigns > 0 ? (completedCampaigns / totalCampaigns) * 100 : 0;

      const calculatedMetrics: RevenueMetrics = {
        totalRevenue,
        campaignRevenue: totalRevenue, // All revenue comes from campaigns
        averageOrderValue,
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        revenueGrowth,
        campaignSuccessRate,
      };

      setMetrics(calculatedMetrics);
      setRevenueData(chartData);

    } catch (error: any) {
      console.error('Error fetching revenue data:', error);
      toast({
        title: "Error",
        description: "Failed to load revenue analytics",
        variant: "destructive",
      });
      
      // Set empty state on error
      setMetrics({
        totalRevenue: 0,
        campaignRevenue: 0,
        averageOrderValue: 0,
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        revenueGrowth: 0,
        campaignSuccessRate: 0,
      });
      setRevenueData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    toast({
      title: "Export Started",
      description: "Revenue report is being prepared for download",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading revenue analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        title="Revenue Analytics"
        description="Comprehensive financial performance and forecasting"
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
                <SelectItem value="2years">2 Years</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </ActionButtonGroup>
        }
      />

      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-primary shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${metrics.totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-primary" />
              ) : (
                <TrendingUp className="h-3 w-3 mr-1 text-destructive rotate-180" />
              )}
              {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% growth
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-accent shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Revenue</CardTitle>
            <Zap className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              ${metrics.campaignRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">From repost campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-primary-glow shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Campaign Value</CardTitle>
            <DollarSign className="h-4 w-4 text-primary-glow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-glow">
              ${metrics.averageOrderValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Per campaign</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-accent shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {(metrics.totalCampaigns).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{metrics.activeCampaigns} active</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {revenueData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Monthly campaign revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.2}
                        name="Campaign Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign Volume</CardTitle>
                  <CardDescription>Number of campaigns per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="campaigns" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={3}
                        dot={{ r: 6, fill: 'hsl(var(--accent))' }}
                        name="Campaigns"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Revenue Data</h3>
                <p className="text-muted-foreground text-center">
                  Revenue analytics will appear here once campaigns are created and have pricing data.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>


        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-card border border-border rounded-lg shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="font-semibold text-success">Strong Growth</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Revenue grew {metrics.revenueGrowth >= 0 ? metrics.revenueGrowth.toFixed(1) : 0}% month-over-month, driven by increased campaign volume.</p>
                </div>

                <div className="p-4 bg-card border border-border rounded-lg shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">Campaign Success</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {metrics.totalCampaigns > 0 
                      ? `Campaign completion rate is ${metrics.campaignSuccessRate.toFixed(1)}% with ${metrics.completedCampaigns} of ${metrics.totalCampaigns} campaigns completed.`
                      : 'No completed campaigns to analyze yet.'
                    }
                  </p>
                </div>

                <div className="p-4 bg-card border border-border rounded-lg shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-accent">Campaign Value</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Average campaign value is ${metrics.averageOrderValue.toFixed(0)} across {metrics.totalCampaigns} total campaigns.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Campaigns</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">{metrics.totalCampaigns}</span>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Campaigns</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-accent">{metrics.activeCampaigns}</span>
                    <p className="text-xs text-muted-foreground">Currently running</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Avg Campaign Value</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">
                      ${metrics.averageOrderValue.toFixed(0)}
                    </span>
                    <p className="text-xs text-muted-foreground">Per campaign</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monthly Growth</span>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${metrics.revenueGrowth >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
                    </span>
                    <p className="text-xs text-muted-foreground">vs previous month</p>
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
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useExecutiveDashboardData } from "../hooks/useExecutiveDashboardData";
import { ExecutiveKPICards } from "./ExecutiveKPICards";
import { PerformanceBenchmarkChart } from "./PerformanceBenchmarkChart";
import { ROIAnalyticsDashboard } from "./ROIAnalyticsDashboard";
import { PredictiveAnalyticsPanel } from "./PredictiveAnalyticsPanel";
import { AlertsCenter } from "./AlertsCenter";
import { InteractiveDashboard } from "./InteractiveDashboard";
import { TrendingUp, TrendingDown, Users, Target, DollarSign, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

export const ExecutiveDashboard = () => {
  const { data, isLoading, error } = useExecutiveDashboardData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load executive dashboard data</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatNumber = (value: number) => 
    new Intl.NumberFormat('en-US').format(Math.round(value));

  const formatPercentage = (value: number) => 
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Executive Summary Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive overview of campaign performance and business metrics
        </p>
      </div>

      {/* Main KPI Cards */}
      <ExecutiveKPICards data={data} />


      {/* Top Performing Vendors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topPerformingVendors.map((vendor, index) => (
              <div key={vendor.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {vendor.totalCampaigns} campaigns
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{vendor.efficiency.toFixed(1)}% efficiency</p>
                  <p className="text-sm text-muted-foreground">
                    {vendor.avgPerformance.toFixed(1)}% avg performance
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data.campaignStatusDistribution.map((status) => (
              <div key={status.status} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{status.count}</div>
                <div className="text-sm text-muted-foreground capitalize">{status.status}</div>
                <div className="text-xs text-muted-foreground">
                  {status.percentage.toFixed(1)}% of total
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="interactive">Interactive</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <PerformanceBenchmarkChart />
        </TabsContent>

        <TabsContent value="roi">
          <ROIAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="predictions">
          <PredictiveAnalyticsPanel />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsCenter />
        </TabsContent>

        <TabsContent value="interactive">
          <InteractiveDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};








import { useState } from "react";
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
import { CampaignDetailsModal } from "./CampaignDetailsModal";
import { TrendingUp, TrendingDown, Users, Target, DollarSign, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { supabase } from "../integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const ExecutiveDashboard = () => {
  const { data, isLoading, error } = useExecutiveDashboardData();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  
  // Fetch campaign details when selected
  const { data: selectedCampaign } = useQuery({
    queryKey: ['campaign-details', selectedCampaignId],
    queryFn: async () => {
      if (!selectedCampaignId) return null;
      console.log('🔍 Fetching campaign details for:', selectedCampaignId);
      const { data, error } = await supabase
        .from('campaign_groups')
        .select('*')
        .eq('id', selectedCampaignId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching campaign:', error);
        return null;
      }
      
      console.log('✅ Campaign fetched:', data);
      return data;
    },
    enabled: !!selectedCampaignId,
  });

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
            {data.topPerformingVendors.map((vendor: any, index) => (
              <div key={vendor.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {vendor.totalCampaigns} campaigns • {vendor.totalPlaylists || 0} playlists
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {((vendor.totalStreams12m || 0) / 1000).toFixed(1)}K streams
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(vendor.avgStreamsPerPlaylist || 0).toLocaleString()}/playlist • ${(vendor.costPer1k || 0).toFixed(2)}/1K
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
            {data.campaignStatusDistribution.map((statusItem) => {
              // Status color mapping
              const statusColors: Record<string, string> = {
                'Active': 'text-green-600 border-green-200 bg-green-50',
                'Pending': 'text-yellow-600 border-yellow-200 bg-yellow-50',
                'Draft': 'text-gray-600 border-gray-200 bg-gray-50',
                'Paused': 'text-orange-600 border-orange-200 bg-orange-50',
                'Completed': 'text-blue-600 border-blue-200 bg-blue-50',
              };
              const colorClass = statusColors[statusItem.status] || 'border-gray-200';
              
              return (
                <div key={statusItem.status} className={`text-center p-4 border rounded-lg ${colorClass}`}>
                  <div className="text-2xl font-bold">{statusItem.count}</div>
                  <div className="text-sm font-medium">{statusItem.status}</div>
                  <div className="text-xs opacity-70">
                    {statusItem.percentage.toFixed(1)}% of total
                  </div>
                </div>
              );
            })}
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
          <AlertsCenter onCampaignClick={(campaignId) => {
            console.log('🎯 Alert campaign clicked in ExecutiveDashboard:', campaignId);
            setSelectedCampaignId(campaignId);
          }} />
        </TabsContent>

        <TabsContent value="interactive">
          <InteractiveDashboard onCampaignClick={(campaignId) => setSelectedCampaignId(campaignId)} />
        </TabsContent>
      </Tabs>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <>
          {console.log('📋 Opening modal for campaign:', selectedCampaign.name, selectedCampaign.id)}
          <CampaignDetailsModal
            campaign={selectedCampaign}
            open={!!selectedCampaignId}
            onClose={() => {
              console.log('❌ Closing campaign modal');
              setSelectedCampaignId(null);
            }}
          />
        </>
      )}
    </div>
  );
};








import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useExecutiveDashboardData } from "../hooks/useExecutiveDashboardData";
import { ExecutiveKPICards } from "./ExecutiveKPICards";
import { PerformanceBenchmarkChart } from "./PerformanceBenchmarkChart";
import { AlertsCenter } from "./AlertsCenter";
import { VendorScatterPlot } from "./VendorScatterPlot";
import { AttentionRequiredPanel } from "./AttentionRequiredPanel";
import { CampaignDetailsModal } from "./CampaignDetailsModal";
import { Skeleton } from "./ui/skeleton";
import { supabase } from "../integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const ExecutiveDashboard = () => {
  const { data, isLoading, error } = useExecutiveDashboardData();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const { data: selectedCampaign } = useQuery({
    queryKey: ["campaign-details", selectedCampaignId],
    queryFn: async () => {
      if (!selectedCampaignId) return null;
      const { data, error } = await supabase
        .from("campaign_groups" as any)
        .select("*")
        .eq("id", selectedCampaignId)
        .single();
      if (error) return null;
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

  const getPayoutBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Partial</Badge>;
      case "unpaid":
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Unpaid</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">N/A</Badge>;
    }
  };

  const getCpmColor = (costPer1k: number) => {
    const avg = data.averageCostPer1kStreams;
    if (costPer1k <= avg * 0.85) return "text-green-600";
    if (costPer1k <= avg * 1.15) return "text-yellow-600";
    return "text-red-600";
  };

  const statusColors: Record<string, string> = {
    "Active": "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30",
    "Pending Approval": "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30",
    "Awaiting Playlist Adds": "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30",
    "Completed": "text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-950/30",
    "Flagged": "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Operations Dashboard</h1>
        <p className="text-muted-foreground">
          Campaign delivery, vendor performance, and financial health
        </p>
      </div>

      {/* KPI Cards */}
      <ExecutiveKPICards data={data} />

      {/* Top Performing Vendors — Actionable Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Vendor Name</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Active Campaigns</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Streams Delivered</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Avg Cost/1K</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Approval Rate</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Payout Status</th>
                </tr>
              </thead>
              <tbody>
                {data.topPerformingVendors.map((vendor, index) => (
                  <tr key={vendor.id || index} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold p-0">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{vendor.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">{vendor.activeCampaignCount}</td>
                    <td className="py-3 text-right font-medium">
                      {((vendor.totalStreams12m || 0) / 1000).toFixed(1)}K
                    </td>
                    <td className={`py-3 text-right font-medium ${getCpmColor(vendor.costPer1k)}`}>
                      ${(vendor.costPer1k || 0).toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          vendor.approvalRate >= 80
                            ? "text-green-700 border-green-300"
                            : vendor.approvalRate >= 50
                            ? "text-yellow-700 border-yellow-300"
                            : "text-red-700 border-red-300"
                        }`}
                      >
                        {vendor.approvalRate.toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="py-3 text-center">{getPayoutBadge(vendor.payoutStatus)}</td>
                  </tr>
                ))}
                {data.topPerformingVendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No vendor data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {data.campaignStatusDistribution.map((statusItem) => {
              const colorClass = statusColors[statusItem.status] || "border-gray-200 bg-gray-50 dark:bg-gray-950/30";
              return (
                <div key={statusItem.status} className={`text-center p-4 border rounded-lg ${colorClass}`}>
                  <div className="text-2xl font-bold">{statusItem.count}</div>
                  <div className="text-sm font-medium">{statusItem.status}</div>
                  <div className="text-xs opacity-70">
                    {statusItem.percentage.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Vendor Performance Chart */}
      <VendorScatterPlot
        vendors={data.topPerformingVendors.map(v => ({
          name: v.name,
          costPer1k: v.costPer1k,
          totalStreams12m: v.totalStreams12m,
          activeCampaignCount: v.activeCampaignCount,
          approvalRate: v.approvalRate,
          totalPlaylists: v.totalPlaylists,
        }))}
      />

      {/* Performance & Alerts Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <PerformanceBenchmarkChart />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsCenter
            onCampaignClick={(campaignId) => setSelectedCampaignId(campaignId)}
          />
        </TabsContent>
      </Tabs>

      {/* Attention Required Panel */}
      <AttentionRequiredPanel />

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          open={!!selectedCampaignId}
          onClose={() => setSelectedCampaignId(null)}
        />
      )}
    </div>
  );
};

"use client"

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignTableEnhanced } from "../components/dashboard/CampaignTableEnhanced";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download } from "lucide-react";
import { CreateCampaignModal } from "../components/campaigns/CreateCampaignModal";
import { useCampaigns } from "../hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";

export default function Campaigns() {
  const [searchParams] = useSearchParams();
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { refreshData, campaigns, loading } = useCampaigns();
  const { toast } = useToast();
  const { isAdmin, isManager } = useAuth();

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'pending') {
      setActiveTab('pending');
    } else {
      setActiveTab('all');
    }
  }, [searchParams]);

  const handleRefresh = async () => {
    await refreshData();
    toast({
      title: "Data Refreshed",
      description: "All campaign data has been updated.",
    });
  };

  const handleExport = () => {
    const headers = ['Campaign Name', 'Client', 'Status', 'Views', 'Goal', 'Revenue'];
    const rows = campaigns.map(campaign => [
      campaign.campaign_name,
      campaign.clients?.name || 'N/A',
      campaign.status,
      campaign.current_views || 0,
      campaign.goal_views || 0,
      '$' + (campaign.sale_price || 0).toLocaleString()
    ]);

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `campaigns_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: "Campaign data exported successfully.",
    });
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const pendingCampaigns = campaigns.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Managing {campaigns.length} campaigns with {activeCampaigns} active and {pendingCampaigns} pending.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {(isAdmin || isManager) && (
            <Button onClick={() => setCreateCampaignOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
          <TabsTrigger value="pending">Pending Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          <CampaignTableEnhanced />
        </TabsContent>
        <TabsContent value="pending" className="space-y-4">
          <CampaignTableEnhanced filterType="pending" />
        </TabsContent>
      </Tabs>

      <CreateCampaignModal
        isOpen={createCampaignOpen}
        onClose={() => setCreateCampaignOpen(false)}
      />
    </div>
  );
}
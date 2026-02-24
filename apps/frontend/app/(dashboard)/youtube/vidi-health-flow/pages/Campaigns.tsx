"use client"

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignTableEnhanced } from "../components/dashboard/CampaignTableEnhanced";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download, Upload } from "lucide-react";
import { CreateCampaignModal } from "../components/campaigns/CreateCampaignModal";
import { CampaignImportModal } from "../components/CampaignImportModal";
import { useCampaigns } from "../hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";

export default function Campaigns() {
  const [searchParams] = useSearchParams();
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
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
    const headers = ['Campaign Name', 'Client', 'Salesperson', 'Status', 'Views', 'Goal', 'Revenue', 'Service Types'];
    const rows = campaigns.map(campaign => [
      campaign.campaign_name,
      campaign.youtube_clients?.name || 'N/A',
      campaign.youtube_salespersons?.name || 'N/A',
      campaign.status,
      campaign.current_views || 0,
      campaign.goal_views || 0,
      '$' + (campaign.sale_price || 0).toLocaleString(),
      Array.isArray(campaign.service_types) ? campaign.service_types.map((s: any) => s.service_type).join(', ') : 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `youtube_campaigns_export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: "YouTube campaign data exported successfully.",
    });
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const pendingCampaigns = campaigns.filter(c => c.status === 'pending').length;
  const readyCampaigns = campaigns.filter(c => c.status === 'ready').length;
  const onHoldCampaigns = campaigns.filter(c => c.status === 'on_hold').length;

  return (
    <div className="space-y-8">
      <section className="text-center pt-8 pb-4">
        <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
          CAMPAIGNS
        </h1>
        <p className="text-muted-foreground mt-2">
          Managing {campaigns.length} campaigns with {activeCampaigns} active, {readyCampaigns} ready, {pendingCampaigns} pending, and {onHoldCampaigns} on hold.
        </p>
      </section>

      <div className="flex gap-2 items-center justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
        {(isAdmin || isManager) && (
          <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        )}
        {(isAdmin || isManager) && (
          <Button onClick={() => setCreateCampaignOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
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

      <CampaignImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />
    </div>
  );
}
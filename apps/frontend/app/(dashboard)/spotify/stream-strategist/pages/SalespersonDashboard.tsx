"use client"

import { useState } from "react";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { SalespersonCommissionCard } from "../components/SalespersonCommissionCard";
import { SalespersonCampaignTable } from "../components/SalespersonCampaignTable";
import { ReadOnlyCampaignDetailsModal } from "../components/ReadOnlyCampaignDetailsModal";
import { useSalespersonCampaigns } from "../hooks/useSalespersonCampaigns";


export default function SalespersonDashboard() {
  const { user } = useAuth();
  const { data: campaigns = [] } = useSalespersonCampaigns();
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; campaign?: any }>({ open: false });

  const handleViewDetails = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    setDetailsModal({ open: true, campaign });
  };

  return (
    <Layout>
      <div className="space-y-6 -mt-6" data-tour="salesperson-dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Salesperson Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>
          <Button 
            onClick={() => window.location.href = '/campaign-intake'}
            data-tour="submit-campaign"
          >
            <Plus className="h-4 w-4 mr-2" />
            Submit Campaign
          </Button>
        </div>


        {/* Commission Card - Most Important */}
        <div data-tour="commission-tracking">
          <SalespersonCommissionCard />
        </div>

        {/* Campaign Table - Comprehensive View */}
        <SalespersonCampaignTable onViewDetails={handleViewDetails} />
      </div>

      {/* Read-Only Campaign Details Modal */}
      <ReadOnlyCampaignDetailsModal
        campaign={detailsModal.campaign}
        open={detailsModal.open}
        onClose={() => setDetailsModal({ open: false })}
      />
    </Layout>
  );
}









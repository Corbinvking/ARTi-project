import React, { useState } from 'react';
import { useAuth } from "../contexts/AuthContext";
import { useCampaigns } from "../hooks/useCampaigns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';
import { SalespersonCampaignTable } from "../components/dashboard/SalespersonCampaignTable";

const SalespersonDashboard = () => {
  const { profile } = useAuth();
  const { campaigns, loading } = useCampaigns();
  const [healthFilter, setHealthFilter] = useState<'healthy' | 'at-risk' | 'critical' | null>(null);

  // Filter campaigns for this salesperson based on user linkage in salesperson table
  const myCampaigns = campaigns.filter(campaign => {
    // For now, show all campaigns until proper user linkage is implemented in database
    // TODO: Add user_id field to salespersons table and link properly
    return true;
  });

  // Calculate metrics
  const totalRevenue = myCampaigns.reduce((sum, campaign) => sum + (campaign.sale_price || 0), 0);
  const activeCampaigns = myCampaigns.filter(c => c.status === 'active').length;
  const completedCampaigns = myCampaigns.filter(c => c.status === 'complete').length;
  
  // Calculate total views based on goal views for all campaigns
  const totalGoalViews = myCampaigns.reduce((sum, campaign) => {
    // Handle both new service_types structure and legacy goal_views
    if (campaign.service_types) {
      const serviceTypes = typeof campaign.service_types === 'string' 
        ? JSON.parse(campaign.service_types) 
        : campaign.service_types;
      return sum + serviceTypes.reduce((serviceSum: number, st: any) => serviceSum + (st.goal_views || 0), 0);
    }
    return sum + (campaign.goal_views || 0);
  }, 0);
  
  // Calculate total commission (default 20% of sale price)
  const totalCommission = myCampaigns.reduce((sum, campaign) => {
    const salePrice = campaign.sale_price || 0;
    const commissionRate = 20; // Default 20%, could be enhanced with salesperson.commission_rate
    return sum + (salePrice * commissionRate / 100);
  }, 0);

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCampaigns}</div>
                <p className="text-xs text-muted-foreground">
                  {completedCampaigns} completed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalGoalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  View goals across campaigns
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  From {myCampaigns.length} campaigns
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCommission.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  20% of total revenue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>My Campaigns</CardTitle>
              <CardDescription>
                Monitor the performance of your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading campaigns...</p>
                </div>
              ) : myCampaigns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No campaigns found</p>
                </div>
              ) : (
                <SalespersonCampaignTable 
                  campaigns={myCampaigns}
                  loading={loading}
                  healthFilter={healthFilter}
                />
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default SalespersonDashboard;
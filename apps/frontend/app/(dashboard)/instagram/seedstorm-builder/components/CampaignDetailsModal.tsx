import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Users, Eye, Calendar, Tag, Target, CheckCircle } from "lucide-react";
import { Campaign } from "../lib/types";
import { formatNumber, formatCurrency } from "../lib/localStorage";
import { toast } from "../hooks/use-toast";
import { CreatorManagementTable } from "./CreatorManagementTable";
import { useCampaignCreators } from "../hooks/useCampaignCreators";
import CampaignPostsManager from "./CampaignPostsManager";

interface CampaignDetailsModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (campaignId: string, newStatus: Campaign['status']) => void;
}

export const CampaignDetailsModal = ({ 
  campaign, 
  isOpen, 
  onOpenChange, 
  onStatusUpdate 
}: CampaignDetailsModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<Campaign['status']>(campaign?.status || 'Draft');
  const { creators, loading, updateCreatorStatus, bulkUpdateStatus, syncCampaignCreators } = useCampaignCreators(campaign?.id);

  // Helper functions for actual metrics
  const calculateTotalActualViews = (campaign: Campaign): number => {
    if (!campaign.actual_results?.creator_results) return 0;
    return campaign.actual_results.creator_results.reduce((sum, result) => 
      sum + result.total_actual_views, 0);
  };

  const calculateActualCPM = (campaign: Campaign): number => {
    const totalActualViews = calculateTotalActualViews(campaign);
    if (totalActualViews === 0) return 0;
    return ((campaign.totals?.total_cost || 0) / totalActualViews) * 1000;
  };

  // Sync campaign creators when modal opens
  useEffect(() => {
    if (isOpen && campaign?.selected_creators && creators.length === 0) {
      syncCampaignCreators(campaign.id, campaign.selected_creators);
    }
  }, [isOpen, campaign?.id, campaign?.selected_creators, creators.length, syncCampaignCreators]);

  if (!campaign) return null;

  const handleStatusChange = async (newStatus: Campaign['status']) => {
    setSelectedStatus(newStatus);
    await onStatusUpdate(campaign.id, newStatus);
    toast({
      title: "Status Updated",
      description: `Campaign status changed to ${newStatus}`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Active': return 'default';
      case 'Completed': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{campaign.campaign_name}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created Date
              </div>
              <div className="font-semibold">{formatDate(campaign.date_created)}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                Music Genre
              </div>
              <div className="flex flex-wrap gap-1">
                {campaign.form_data.selected_genres?.map(genre => (
                  <Badge key={genre} variant="outline">{genre}</Badge>
                )) || <Badge variant="outline">No genres</Badge>}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Campaign Metrics</h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Total Budget
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(campaign.form_data.total_budget)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Total Creators
                </div>
                <div className="text-2xl font-bold">
                  {campaign.totals?.total_creators || 0}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Total Posts
                </div>
                <div className="text-2xl font-bold">
                  {campaign.totals?.total_posts || campaign.totals?.total_creators || 0}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Performance</h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Total Reach (Median Views)
                </div>
                <div className="text-2xl font-bold text-accent">
                  {formatNumber(campaign.totals?.total_median_views || 0)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Total Spend
                </div>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(campaign.totals?.total_cost || 0)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  Average CPM
                </div>
                <div className="text-2xl font-bold text-primary">
                  ${(campaign.totals?.average_cpv || 0).toFixed(2)}
                </div>
              </div>

              {/* Actual Metrics - Only show if campaign has actual results */}
              {campaign.actual_results?.creator_results && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Total Actual Views
                    </div>
                    <div className="text-2xl font-bold text-success">
                      {formatNumber(calculateTotalActualViews(campaign))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Actual CPM
                    </div>
                    <div className="text-2xl font-bold text-success">
                      ${calculateActualCPM(campaign).toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Update */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Campaign Status</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Update status:</span>
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft" className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                      Draft
                    </div>
                  </SelectItem>
                  <SelectItem value="Active" className="text-primary">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="Completed" className="text-success">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success"></div>
                      Completed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Territory and Post Type Preferences */}
          <div className="grid grid-cols-2 gap-6 border-t pt-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Territory Preferences</h4>
              <div className="flex flex-wrap gap-2">
                {campaign.form_data.territory_preferences?.length > 0 ? (
                  campaign.form_data.territory_preferences.map((territory, index) => (
                    <Badge key={index} variant="secondary">{territory}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No territories specified</span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Post Types</h4>
              <div className="flex flex-wrap gap-2">
                {campaign.form_data.post_type_preference?.length > 0 ? (
                  campaign.form_data.post_type_preference.map((postType, index) => (
                    <Badge key={index} variant="secondary">{postType}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No post types specified</span>
                )}
              </div>
            </div>
          </div>

          {/* Creator Management */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-lg font-semibold">Creator Management</h3>
            <CreatorManagementTable 
              campaign={campaign}
              creators={creators}
              loading={loading}
              onStatusUpdate={updateCreatorStatus}
              onBulkUpdate={bulkUpdateStatus}
            />
          </div>


        {/* Campaign Posts Management */}
        <div className="border-t pt-6">
          <CampaignPostsManager campaignId={campaign.id} />
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
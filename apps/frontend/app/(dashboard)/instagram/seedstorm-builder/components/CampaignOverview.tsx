import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicCampaignData } from '../hooks/usePublicCampaign';

interface CampaignOverviewProps {
  campaign: PublicCampaignData;
}

const CampaignOverview = ({ campaign }: CampaignOverviewProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-700 hover:bg-green-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20';
    }
  };

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Campaign Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {campaign.name}
            </h1>
            {campaign.brand_name && campaign.brand_name !== campaign.name && (
              <p className="text-muted-foreground text-lg">
                Brand: {campaign.brand_name}
              </p>
            )}
          </div>

          {/* Status and Budget Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className={getStatusColor(campaign.status)}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
              <span className="text-lg font-semibold text-foreground">
                Budget: {formatCurrency(campaign.budget)}
              </span>
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{campaign.creator_count}</div>
              <div className="text-sm text-muted-foreground">Creators</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {campaign.posts_live}/{campaign.total_posts}
              </div>
              <div className="text-sm text-muted-foreground">Posts Live</div>
            </div>
            <div className="text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((campaign.posts_live / campaign.total_posts) * 100) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Completion</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignOverview;
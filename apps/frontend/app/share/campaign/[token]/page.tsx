'use client';

import { useParams } from 'next/navigation';
import CampaignAnalyticsDashboard from '@/app/(dashboard)/instagram/campaigns/[id]/analytics/CampaignAnalyticsDashboard';

// This is the public-facing page that doesn't require authentication
// Accessed via: /share/campaign/{campaign-id}
// The token is currently the campaign ID, but could be replaced with
// a secure public_token field in the future

export default function PublicCampaignSharePage() {
  const params = useParams();
  const token = params.token as string;

  // Pass the token as campaignId - the dashboard component will handle
  // fetching the campaign data and displaying it
  // isPublic=true hides the back button since this is a standalone view
  return (
    <CampaignAnalyticsDashboard 
      campaignId={token}
      isPublic={true}
    />
  );
}


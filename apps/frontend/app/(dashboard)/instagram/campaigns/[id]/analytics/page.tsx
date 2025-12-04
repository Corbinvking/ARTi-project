'use client';

import { useParams } from 'next/navigation';
import CampaignAnalyticsDashboard from './CampaignAnalyticsDashboard';

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const campaignId = params.id as string;

  return <CampaignAnalyticsDashboard campaignId={campaignId} />;
}


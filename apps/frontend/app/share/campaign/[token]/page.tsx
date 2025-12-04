'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import CampaignAnalyticsDashboard from '@/app/(dashboard)/instagram/campaigns/[id]/analytics/CampaignAnalyticsDashboard';

// This is the public-facing page that doesn't require authentication
// Accessed via: /share/campaign/{token}

export default function PublicCampaignSharePage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<any>(null);

  useEffect(() => {
    async function fetchCampaignByToken() {
      try {
        setLoading(true);
        // TODO: Implement API call to fetch campaign data by public token
        // For now, we'll use mock data
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data - in production, this would be fetched from the API
        // using the token to lookup the campaign
        setCampaignData(null); // Will use default mock data in component
        setLoading(false);
      } catch (err) {
        setError('Campaign not found or link has expired');
        setLoading(false);
      }
    }

    if (token) {
      fetchCampaignByToken();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold mb-2">Link Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <CampaignAnalyticsDashboard 
      data={campaignData} 
      isPublic={true}
    />
  );
}


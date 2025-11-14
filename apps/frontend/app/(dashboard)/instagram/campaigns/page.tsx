"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function InstagramCampaignsPage() {
  // Fetch campaigns from Supabase
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['instagram-campaigns'],
    queryFn: async () => {
      console.log('📡 Fetching Instagram campaigns...');
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching campaigns:', error);
        throw error;
      }
      
      console.log(`✅ Fetched ${data?.length || 0} campaigns:`, data?.[0]);
      return data || [];
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'draft': return 'bg-gray-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Campaign History</h1>
          <p className="text-muted-foreground">
            View and manage all Instagram campaigns
          </p>
        </div>
        <Link href="/instagram/campaign-builder">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No campaigns yet. Create your first Instagram campaign to get started.
            </p>
            <Link href="/instagram/campaign-builder">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign: any) => {
            // Parse price from TEXT to number
            const priceStr = campaign.price || '$0';
            const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
            
            return (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{campaign.campaign || 'Untitled Campaign'}</CardTitle>
                    <Badge className={getStatusColor(campaign.status || 'draft')}>
                      {campaign.status || 'draft'}
                    </Badge>
                  </div>
                  <CardDescription>{campaign.clients || 'No client'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{campaign.price || '$0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spend:</span>
                      <span className="font-medium">{campaign.spend || '$0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className="font-medium">{campaign.remaining || '$0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salesperson:</span>
                      <span className="font-medium">{campaign.salespeople || 'N/A'}</span>
                    </div>
                    {campaign.start_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span className="font-medium">{campaign.start_date}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


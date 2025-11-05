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
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
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
          {campaigns.map((campaign: any) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{campaign.name}</CardTitle>
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
                <CardDescription>{campaign.brand_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="font-medium">${campaign.budget?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creators:</span>
                    <span className="font-medium">{campaign.creator_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


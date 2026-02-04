"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Plus, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Users,
  Music,
  DollarSign,
  Target
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from "../lib/constants";
import { useAuth } from "../hooks/useAuth";

export function QuickActions() {
  const { currentRole } = useAuth();

  const { data: quickStats } = useQuery({
    queryKey: ['quick-stats'],
    queryFn: async () => {
      // Query spotify_campaigns as primary source (this is where real campaign data lives)
      const [spotifyCampaignsRes, campaignGroupsRes, vendorsRes, clientsRes] = await Promise.all([
        supabase
          .from('spotify_campaigns')
          .select('status, created_at'),
        supabase
          .from('campaign_groups')
          .select('status, created_at'),
        supabase
          .from('vendors')
          .select('id, is_active'),
        supabase
          .from('clients')
          .select('id, created_at')
      ]);

      // Combine both sources, preferring spotify_campaigns
      const spotifyCampaigns = spotifyCampaignsRes.data || [];
      const campaignGroups = campaignGroupsRes.data || [];
      const vendors = vendorsRes.data || [];
      const clients = clientsRes.data || [];

      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Use spotify_campaigns as primary if it has data, otherwise fall back to campaign_groups
      const campaigns = spotifyCampaigns.length > 0 ? spotifyCampaigns : campaignGroups;

      // Case-insensitive status matching
      const normalizeStatus = (status: string | null) => (status || '').toLowerCase().trim();
      
      const pendingStatuses = ['draft', 'pending'];
      const activeStatuses = ['active', 'in_progress', 'running'];
      const completedStatuses = ['complete', 'completed', 'done', 'finished'];

      return {
        pendingCampaigns: campaigns.filter(c => pendingStatuses.includes(normalizeStatus(c.status))).length,
        activeCampaigns: campaigns.filter(c => activeStatuses.includes(normalizeStatus(c.status))).length,
        completedCampaigns: campaigns.filter(c => completedStatuses.includes(normalizeStatus(c.status))).length,
        recentCampaigns: campaigns.filter(c => new Date(c.created_at) > weekAgo).length,
        totalCampaigns: campaigns.length,
        activeVendors: vendors.filter(v => v.is_active).length,
        totalClients: clients.length,
        recentClients: clients.filter(c => new Date(c.created_at) > weekAgo).length
      };
    }
  });

  const renderAdminActions = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Campaign Overview */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Campaign Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active</span>
            <Badge variant="default" className="bg-green-500">{quickStats?.activeCampaigns || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending</span>
            <Badge variant="secondary" className="bg-yellow-500 text-white">{quickStats?.pendingCampaigns || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Completed</span>
            <Badge variant="outline">{quickStats?.completedCampaigns || 0}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t">
            <span className="text-muted-foreground">Total Campaigns</span>
            <span className="font-medium">{quickStats?.totalCampaigns || 0}</span>
          </div>
          <Button size="sm" className="w-full" asChild>
            <Link href="/spotify/campaigns">View All</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" className="w-full justify-start" asChild>
            <Link href="/spotify/campaign/new">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start" asChild>
            <Link href="/spotify/clients">
              <Users className="h-4 w-4 mr-2" />
              Add Client
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start" asChild>
            <Link href="/spotify/playlists">
              <Music className="h-4 w-4 mr-2" />
              Manage Vendors
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Vendors</span>
            <Badge variant="default">{quickStats?.activeVendors || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Clients</span>
            <Badge variant="secondary">{quickStats?.totalClients || 0}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">All Systems Operational</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderVendorActions = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            My Playlists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" className="w-full justify-start" asChild>
            <Link href="/spotify/vendor/playlists">
              <Plus className="h-4 w-4 mr-2" />
              Add Playlist
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start" asChild>
            <Link href="/spotify/vendor/requests">
              <Clock className="h-4 w-4 mr-2" />
              Campaign Requests
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Earnings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" className="w-full justify-start" asChild>
            <Link href="/spotify/vendor/payments">
              <DollarSign className="h-4 w-4 mr-2" />
              Payment History
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderSalespersonActions = () => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" className="w-full justify-start" asChild>
          <Link href="/spotify/campaign-intake">
            <Plus className="h-4 w-4 mr-2" />
            Submit Campaign
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  if (currentRole === 'vendor') {
    return renderVendorActions();
  }

  if (currentRole === 'salesperson') {
    return renderSalespersonActions();
  }

  // Admin/Manager view
  return renderAdminActions();
}









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
      const [campaignsRes, vendorsRes, clientsRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('status, created_at')
          .eq('source', APP_CAMPAIGN_SOURCE)
          .eq('campaign_type', APP_CAMPAIGN_TYPE),
        supabase
          .from('vendors')
          .select('id, is_active'),
        supabase
          .from('clients')
          .select('id, created_at')
      ]);

      const campaigns = campaignsRes.data || [];
      const vendors = vendorsRes.data || [];
      const clients = clientsRes.data || [];

      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      return {
        pendingCampaigns: campaigns.filter(c => c.status === 'draft').length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        recentCampaigns: campaigns.filter(c => new Date(c.created_at) > weekAgo).length,
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
            <Badge variant="default">{quickStats?.activeCampaigns || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending</span>
            <Badge variant="secondary">{quickStats?.pendingCampaigns || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">This Week</span>
            <Badge variant="outline">{quickStats?.recentCampaigns || 0}</Badge>
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









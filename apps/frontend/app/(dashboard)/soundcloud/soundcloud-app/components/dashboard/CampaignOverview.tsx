"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Music,
  Play,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

interface Campaign {
  id: string;
  track_name: string;
  artist_name: string;
  campaign_type: string;
  status: string;
  goals: number;
  remaining_metrics: number;
  sales_price: number;
  invoice_status: string;
  start_date: string;
  client: {
    name: string;
    email: string;
  };
}

export default function CampaignOverview() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({
    total_revenue: 0,
    active_campaigns: 0,
    completed_campaigns: 0,
    pending_invoices: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('soundcloud_campaigns')
        .select(`
          *,
          client:soundcloud_clients(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    }
  };

  const fetchStats = async () => {
    try {
      const { data: campaignsData, error } = await supabase
        .from('soundcloud_campaigns')
        .select('status, sales_price, invoice_status');

      if (error) throw error;

      const stats = {
        total_revenue: campaignsData?.reduce((sum, c) => sum + (c.sales_price || 0), 0) || 0,
        active_campaigns: campaignsData?.filter(c => c.status === 'Active').length || 0,
        completed_campaigns: campaignsData?.filter(c => c.status === 'Complete').length || 0,
        pending_invoices: campaignsData?.filter(c => c.invoice_status === 'Pending').length || 0
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <Play className="h-4 w-4" />;
      case 'Complete': return <CheckCircle className="h-4 w-4" />;
      case 'Pending': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Complete': return 'bg-blue-500';
      case 'Pending': return 'bg-yellow-500';
      case 'Cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateProgress = (goals: number, remaining: number) => {
    if (!goals) return 0;
    return Math.max(0, Math.min(100, ((goals - remaining) / goals) * 100));
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Campaign Overview</h1>
        <p className="text-muted-foreground">Monitor your SoundCloud promotional campaigns</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_campaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed_campaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_invoices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>Latest promotional campaigns and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(campaign.status)}
                    <Badge variant="secondary" className={`${getStatusColor(campaign.status)} text-white`}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold">{campaign.track_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      by {campaign.artist_name} • {campaign.client.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.campaign_type} Campaign
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {campaign.goals > 0 && (
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{Math.round(calculateProgress(campaign.goals, campaign.remaining_metrics))}%</span>
                      </div>
                      <Progress 
                        value={calculateProgress(campaign.goals, campaign.remaining_metrics)} 
                        className="h-2"
                      />
                    </div>
                  )}
                  
                  <div className="text-right">
                    <p className="font-semibold">${campaign.sales_price || 0}</p>
                    <Badge 
                      variant={campaign.invoice_status === 'Paid' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {campaign.invoice_status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {campaigns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No campaigns found. Create your first campaign to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
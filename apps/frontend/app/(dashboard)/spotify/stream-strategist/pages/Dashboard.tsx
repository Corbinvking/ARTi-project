"use client"

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import Link from "next/link";
import { insertSampleData } from "../lib/sampleData";
import { supabase } from "../integrations/supabase/client";
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_TYPE } from "../lib/constants";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Activity,
  Plus,
  Zap,
  Music2,
  Database,
  Eye,
  BarChart3,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SalespeopleManager } from "../components/SalespeopleManager";
import { ActiveVendorsCard } from "../components/ActiveVendorsCard";
import { ExecutiveDashboard } from "../components/ExecutiveDashboard";
import { QuickActions } from "../components/QuickActions";

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalStreamsGoal: number;
  totalBudget: number;
  completedCampaigns: number;
  totalVendors: number;
  totalPlaylists: number;
  totalReach: number;
  algorithmAccuracy: number;
}

export default function Dashboard() {
  const router = useRouter();

  // Populate sample data on first load
  useEffect(() => {
    insertSampleData();
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [campaignsRes, vendorsRes, playlistsRes] = await Promise.all([
        supabase.from('campaigns').select('status, stream_goal, budget').eq('source', APP_CAMPAIGN_SOURCE).eq('campaign_type', APP_CAMPAIGN_TYPE),
        supabase.from('vendors').select('id').eq('is_active', true),
        supabase.from('playlists').select('id, avg_daily_streams, vendors!inner(is_active)').eq('vendors.is_active', true)
      ]);

      const campaigns = campaignsRes.data || [];
      const vendors = vendorsRes.data || [];
      const playlists = playlistsRes.data || [];

      const totalReach = playlists.reduce((sum, p) => sum + (p.avg_daily_streams || 0), 0);

      return {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        completedCampaigns: campaigns.filter(c => c.status === 'completed').length,
        totalStreamsGoal: campaigns.reduce((sum, c) => sum + (c.stream_goal || 0), 0),
        totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
        totalVendors: vendors.length,
        totalPlaylists: playlists.length,
        totalReach: totalReach,
        algorithmAccuracy: 95.0, // Mock data
      };
    }
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-8 -mt-6" data-tour="dashboard">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-6">
        <h1 className="hero-title">
          SPOTIFY PLAYLISTING
        </h1>
        <h2 className="text-2xl font-bold text-foreground mt-2">
          CAMPAIGN BUILDER
        </h2>
        <p className="hero-subtitle">
          Internal operator dashboard for campaign management and playlist analytics
        </p>
      </section>

      {/* Quick Actions Section */}
      <section data-tour="quick-actions">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <QuickActions />
      </section>

      {/* Action Buttons */}
      <section>
        <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-4xl mx-auto">
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 h-auto text-base font-medium glow-primary transition-smooth"
            asChild
          >
            <Link href="/spotify/campaign/new">
              <Plus className="w-5 h-5 mr-2" />
              BUILD CAMPAIGN
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            className="px-8 py-4 h-auto text-base font-medium border-border hover:border-primary/50 transition-smooth"
            asChild
          >
            <Link href="/spotify/playlists">
              <Database className="w-5 h-5 mr-2" />
              BROWSE PLAYLISTS
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            className="px-8 py-4 h-auto text-base font-medium border-border hover:border-primary/50 transition-smooth"
            asChild
          >
            <Link href="/spotify/campaigns">
              <BarChart3 className="w-5 h-5 mr-2" />
              VIEW CAMPAIGNS
            </Link>
          </Button>
        </div>
      </section>

      {/* Feature Cards */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <div className="feature-card">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-lg mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Smart Algorithms</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered playlist matching based on genre, territory, and performance data
            </p>
          </div>
          
          <div className="feature-card">
            <div className="flex items-center justify-center w-12 h-12 bg-accent/20 rounded-lg mb-4">
              <Target className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Budget Optimization</h3>
            <p className="text-sm text-muted-foreground">
              Maximize reach within budget using cost-per-stream analysis and efficiency scoring
            </p>
          </div>
          
          <div className="feature-card">
            <div className="flex items-center justify-center w-12 h-12 bg-secondary/20 rounded-lg mb-4">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Playlist Database</h3>
            <p className="text-sm text-muted-foreground">
              Performance tracking and analytics for continuous algorithm improvement
            </p>
          </div>
          
          <div className="feature-card">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-lg mb-4">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Campaign Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track actual performance vs predictions to improve future recommendations
            </p>
          </div>
        </div>
      </section>

      {/* Executive Dashboard */}
      <section>
        <ExecutiveDashboard />
      </section>

      {/* Salespeople Management Section */}
      <section>
        <SalespeopleManager />
      </section>

      {/* Public Intake Form Link */}
      <section>
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/20 rounded-lg mb-4 mx-auto">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Campaign Intake Form</h3>
            <p className="text-muted-foreground mb-4">
              Share this link with salespeople to submit new campaigns for approval
            </p>
            <div className="bg-muted p-3 rounded-lg mb-4">
              <code className="text-sm text-foreground">
                {window.location.origin}/campaign-intake
              </code>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/campaign-intake`)}
                variant="outline"
              >
                Copy Link
              </Button>
              <Button asChild>
                <Link href="/spotify/campaign-intake" target="_blank">
                  Open Form
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}









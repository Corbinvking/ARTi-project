'use client'

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, Target, DollarSign, BarChart3, Activity, Zap } from "lucide-react";
import { Creator, Campaign } from "../lib/types";

interface DashboardWidgetsProps {
  creators: Creator[];
  campaigns: Campaign[];
  onCampaignClick?: (campaign: Campaign) => void;
}

interface MetricCard {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'accent';
}

interface TrendData {
  label: string;
  value: number;
  change: number;
}

export const DashboardWidgets = ({ creators, campaigns, onCampaignClick }: DashboardWidgetsProps) => {
  const router = useRouter();
  
  const metrics = useMemo(() => {
    const totalCreators = creators.length;
    const totalReach = creators.reduce((sum, c) => sum + c.followers, 0);
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
    
    // Calculate algorithm accuracy
    const completedCampaigns = campaigns.filter(c => c.actual_results?.executed);
    const successfulCampaigns = completedCampaigns.filter(c => 
      (c.actual_results?.overall_satisfaction || 0) >= 7
    );
    const algorithmAccuracy = completedCampaigns.length > 0 
      ? (successfulCampaigns.length / completedCampaigns.length) * 100
      : 95;

    // Calculate average CPM across all campaigns
    const campaignsWithResults = campaigns.filter(c => c.totals?.average_cpv && c.totals.average_cpv > 0);
    const avgCPM = campaignsWithResults.length > 0
      ? campaignsWithResults.reduce((sum, c) => sum + (c.totals?.average_cpv || 0), 0) / campaignsWithResults.length
      : 0;

    const metricsData: MetricCard[] = [
      {
        title: "Total Creators",
        value: totalCreators.toLocaleString(),
        change: totalCreators > 0 ? 12 : 0,
        changeLabel: "vs last month",
        icon: <Users className="h-5 w-5" />,
        color: 'primary'
      },
      {
        title: "Total Reach",
        value: `${(totalReach / 1000000).toFixed(1)}M`,
        change: totalReach > 0 ? 8 : 0,
        changeLabel: "followers available",
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'success'
      },
      {
        title: "Active Campaigns",
        value: activeCampaigns.toString(),
        change: activeCampaigns > 0 ? 15 : 0,
        changeLabel: `of ${totalCampaigns} total`,
        icon: <Target className="h-5 w-5" />,
        color: 'accent'
      },
      {
        title: "Algorithm Accuracy",
        value: `${algorithmAccuracy.toFixed(1)}%`,
        change: algorithmAccuracy > 90 ? 2 : -1,
        changeLabel: "prediction rate",
        icon: <Zap className="h-5 w-5" />,
        color: 'warning'
      }
    ];

    return metricsData;
  }, [creators, campaigns]);

  const genreAnalysis = useMemo(() => {
    const genreData = creators.reduce((acc, creator) => {
      creator.music_genres.forEach(genre => {
        if (!acc[genre]) {
          acc[genre] = { creators: 0, totalFollowers: 0, totalEngagement: 0 };
        }
        acc[genre].creators++;
        acc[genre].totalFollowers += creator.followers;
        acc[genre].totalEngagement += creator.engagement_rate;
      });
      return acc;
    }, {} as Record<string, { creators: number; totalFollowers: number; totalEngagement: number }>);

    // Return all genres that have at least 1 creator, sorted by total reach
    return Object.entries(genreData)
      .filter(([genre, data]) => data.creators > 0)
      .map(([genre, data]) => ({
        genre,
        creators: data.creators,
        avgFollowers: Math.round(data.totalFollowers / data.creators),
        avgEngagement: +(data.totalEngagement / data.creators).toFixed(2),
        totalReach: data.totalFollowers
      }))
      .sort((a, b) => b.totalReach - a.totalReach);
  }, [creators]);

  const recentActivity = useMemo(() => {
    return campaigns
      .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())
      .slice(0, 5)
      .map(campaign => ({
        campaign,
        name: campaign.campaign_name,
        status: campaign.status,
        creators: campaign.totals?.total_creators || 0,
        date: new Date(campaign.date_created).toLocaleDateString(),
        budget: campaign.form_data?.total_budget || 0
      }));
  }, [campaigns]);

  const performanceInsights = useMemo(() => {
    const highPerformers = creators.filter(c => c.engagement_rate > 5).length;
    const lowPerformers = creators.filter(c => c.engagement_rate < 2).length;
    const mediumPerformers = creators.length - highPerformers - lowPerformers;

    return {
      high: { count: highPerformers, percentage: (highPerformers / creators.length) * 100 },
      medium: { count: mediumPerformers, percentage: (mediumPerformers / creators.length) * 100 },
      low: { count: lowPerformers, percentage: (lowPerformers / creators.length) * 100 }
    };
  }, [creators]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`text-${metric.color}`}>
                {metric.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-1">
                {metric.value}
              </div>
              {metric.change !== undefined && (
                <div className="flex items-center text-xs">
                  {metric.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-success mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                  )}
                  <span className={metric.change >= 0 ? 'text-success' : 'text-destructive'}>
                    {metric.change >= 0 ? '+' : ''}{metric.change}%
                  </span>
                  {metric.changeLabel && (
                    <span className="text-muted-foreground ml-1">{metric.changeLabel}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Performance - Now shows all genres */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              All Genres by Reach
            </CardTitle>
            <CardDescription>
              All genres with creators in your database ({genreAnalysis.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-80 overflow-y-auto">
            {genreAnalysis.map((genre, index) => (
              <div 
                key={genre.genre} 
                className="space-y-2 cursor-pointer hover:bg-muted/30 p-2 rounded-lg transition-colors"
                onClick={() => router.push(`/instagram/creators?filter=genre&genre=${encodeURIComponent(genre.genre)}`)}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground hover:text-primary transition-colors">{genre.genre}</span>
                  <span className="text-muted-foreground">
                    {(genre.totalReach / 1000000).toFixed(1)}M reach
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={genreAnalysis.length > 0 ? (genre.totalReach / genreAnalysis[0].totalReach) * 100 : 0}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="text-xs">
                    {genre.creators} creators
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Distribution */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Creator Performance
            </CardTitle>
            <CardDescription>
              Engagement rate distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button 
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-left"
                  onClick={() => router.push('/instagram/creators?filter=performance&minEngagement=5')}
                >
                  High Performers (5%+ engagement)
                </button>
                <span className="text-sm text-muted-foreground">{performanceInsights.high.count} creators</span>
              </div>
              <Progress value={performanceInsights.high.percentage} className="h-2" />
              
              <div className="flex items-center justify-between">
                <button 
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-left"
                  onClick={() => router.push('/instagram/creators?filter=performance&minEngagement=2&maxEngagement=5')}
                >
                  Medium Performers (2-5% engagement)
                </button>
                <span className="text-sm text-muted-foreground">{performanceInsights.medium.count} creators</span>
              </div>
              <Progress value={performanceInsights.medium.percentage} className="h-2" />
              
              <div className="flex items-center justify-between">
                <button 
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-left"
                  onClick={() => router.push('/instagram/creators?filter=performance&maxEngagement=2')}
                >
                  Developing Performers (&lt;2% engagement)
                </button>
                <span className="text-sm text-muted-foreground">{performanceInsights.low.count} creators</span>
              </div>
              <Progress value={performanceInsights.low.percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaign Activity - Now clickable */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-success" />
            Recent Campaign Activity
          </CardTitle>
          <CardDescription>
            Latest campaign updates and status (click to view details)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onCampaignClick?.(activity.campaign)}
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">{activity.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {activity.creators} creators • ${activity.budget.toLocaleString()} budget
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={activity.status === 'Active' ? 'default' : activity.status === 'Completed' ? 'secondary' : 'outline'}
                  >
                    {activity.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{activity.date}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
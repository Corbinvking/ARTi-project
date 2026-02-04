import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Video, 
  Target, 
  DollarSign, 
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['youtube_campaigns']['Row'];
type Client = Database['public']['Tables']['youtube_clients']['Row'];

interface ClientDetailCardProps {
  client: Client;
  campaigns: Campaign[];
  onCampaignClick?: (campaign: Campaign) => void;
}

export function ClientDetailCard({ client, campaigns, onCampaignClick }: ClientDetailCardProps) {
  // Calculate client-level statistics
  const clientStats = React.useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const complete = campaigns.filter(c => c.status === 'complete').length;
    const totalViews = campaigns.reduce((sum, c) => sum + (c.current_views || 0), 0);
    const totalGoal = campaigns.reduce((sum, c) => sum + (c.goal_views || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.sale_price || 0), 0);
    const inRatioFixer = campaigns.filter(c => c.in_fixer).length;
    const overallProgress = totalGoal > 0 ? (totalViews / totalGoal) * 100 : 0;
    
    // Health score: average of all campaign progresses
    const healthScores = campaigns.map(c => {
      const campaignGoal = c.goal_views || 0;
      const campaignViews = c.current_views || 0;
      return campaignGoal > 0 ? Math.min((campaignViews / campaignGoal) * 100, 100) : 0;
    });
    const avgHealth = healthScores.length > 0 
      ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length 
      : 0;

    return {
      total,
      active,
      complete,
      totalViews,
      totalGoal,
      totalRevenue,
      inRatioFixer,
      overallProgress,
      avgHealth
    };
  }, [campaigns]);

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-green-600 bg-green-50';
    if (health >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4 text-green-600" />;
      case 'complete': return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'on_hold': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{client.name}</CardTitle>
            {client.company && (
              <CardDescription className="text-base">{client.company}</CardDescription>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{client.email}</span>
              {client.email2 && <span>• {client.email2}</span>}
            </div>
          </div>
          
          {/* Health Badge */}
          <Badge 
            variant="outline" 
            className={`${getHealthColor(clientStats.avgHealth)} font-semibold text-lg px-3 py-1`}
          >
            {clientStats.avgHealth.toFixed(0)}% Health
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Client-Level Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Campaigns</div>
            <div className="text-2xl font-bold">{clientStats.total}</div>
            <div className="text-xs text-muted-foreground">
              {clientStats.active} active • {clientStats.complete} complete
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Overall Progress
            </div>
            <div className="text-2xl font-bold">{clientStats.overallProgress.toFixed(1)}%</div>
            <Progress value={clientStats.overallProgress} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Video className="h-3 w-3" />
              Total Views
            </div>
            <div className="text-2xl font-bold">{formatNumber(clientStats.totalViews)}</div>
            <div className="text-xs text-muted-foreground">
              of {formatNumber(clientStats.totalGoal)} goal
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Revenue
            </div>
            <div className="text-2xl font-bold">${clientStats.totalRevenue.toLocaleString()}</div>
            {clientStats.inRatioFixer > 0 && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {clientStats.inRatioFixer} in fixer
              </div>
            )}
          </div>
        </div>

        {/* Campaign List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Campaigns</h4>
            {campaigns.length === 0 && (
              <span className="text-sm text-muted-foreground">No campaigns yet</span>
            )}
          </div>

          {campaigns.length > 0 && (
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const progress = campaign.goal_views 
                  ? ((campaign.current_views || 0) / campaign.goal_views) * 100 
                  : 0;
                const isComplete = progress >= 100;
                const viewsRemaining = (campaign.goal_views || 0) - (campaign.current_views || 0);

                return (
                  <div
                    key={campaign.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onCampaignClick?.(campaign)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        {/* Campaign Header */}
                        <div className="flex items-center gap-2">
                          {getStatusIcon(campaign.status)}
                          <span className="font-medium">{campaign.campaign_name}</span>
                          {campaign.in_fixer && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Ratio Fixer
                            </Badge>
                          )}
                          {campaign.youtube_url && (
                            <a
                              href={campaign.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {formatNumber(campaign.current_views || 0)}
                              </span>
                              <span className="text-muted-foreground">
                                / {formatNumber(campaign.goal_views || 0)} views
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isComplete ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : (
                                <span className={`font-medium ${
                                  progress >= 80 ? 'text-green-600' :
                                  progress >= 50 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {progress.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(progress, 100)} 
                            className="h-2"
                          />
                          {!isComplete && viewsRemaining > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {formatNumber(viewsRemaining)} views remaining
                            </div>
                          )}
                        </div>

                        {/* Campaign Meta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {campaign.start_date && (
                            <span>Started {format(new Date(campaign.start_date), 'MMM d, yyyy')}</span>
                          )}
                          {campaign.sale_price && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${campaign.sale_price.toLocaleString()}
                            </span>
                          )}
                          {campaign.status === 'active' && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {campaigns.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="flex-1">
              View All Campaigns
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Email Client
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Video, 
  Target, 
  DollarSign, 
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
  Mail,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['youtube_campaigns']['Row'];
type Client = Database['public']['Tables']['youtube_clients']['Row'];

interface ClientDetailModalProps {
  client: Client | null;
  campaigns: Campaign[];
  isOpen: boolean;
  onClose: () => void;
  onCampaignClick?: (campaign: Campaign) => void;
}

export function ClientDetailModal({ 
  client, 
  campaigns, 
  isOpen, 
  onClose, 
  onCampaignClick 
}: ClientDetailModalProps) {
  // Calculate client-level statistics
  const stats = React.useMemo(() => {
    if (!client) {
      return { total: 0, active: 0, complete: 0, totalViews: 0, totalGoal: 0, totalRevenue: 0, inRatioFixer: 0, overallProgress: 0, avgHealthScore: 0 };
    }
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
  }, [client, campaigns]);

  if (!client) return null;

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (health >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            {client.name}
            <Badge 
              variant="outline" 
              className={`${getHealthColor(stats.avgHealth)} font-semibold`}
            >
              {stats.avgHealth.toFixed(0)}% Health
            </Badge>
          </DialogTitle>
          <DialogDescription className="space-y-1">
            {client.company && (
              <div className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                {client.company}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {client.email}
              {client.email2 && <span>• {client.email2}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Client-Level Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          <div className="space-y-1 p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Total Campaigns</div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">
              {stats.active} active • {stats.complete} complete
            </div>
          </div>

          <div className="space-y-1 p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Progress
            </div>
            <div className="text-2xl font-bold">{stats.overallProgress.toFixed(1)}%</div>
            <Progress value={stats.overallProgress} className="h-2" />
          </div>

          <div className="space-y-1 p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Video className="h-3 w-3" />
              Total Views
            </div>
            <div className="text-2xl font-bold">{formatNumber(stats.totalViews)}</div>
            <div className="text-xs text-muted-foreground">
              of {formatNumber(stats.totalGoal)} goal
            </div>
          </div>

          <div className="space-y-1 p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Revenue
            </div>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            {stats.inRatioFixer > 0 && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {stats.inRatioFixer} in fixer
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Campaign List */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">Campaigns ({campaigns.length})</h4>

          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No campaigns yet
            </div>
          ) : (
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
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
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
                          <Badge variant="outline" className="text-xs capitalize">
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" asChild>
            <a href={`mailto:${client.email}`}>
              <Mail className="h-4 w-4 mr-2" />
              Email Client
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


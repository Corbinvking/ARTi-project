import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ExternalLink, 
  Settings, 
  Play, 
  Pause,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sliders
} from "lucide-react";
import { useCampaigns } from "../../hooks/useCampaigns";
import { notifyOpsStatusChange } from "@/lib/status-notify";
import { notifySlack } from "@/lib/slack-notify";
import { useAuth } from "../../contexts/AuthContext";
import { RatioFixerModal } from "../campaigns/RatioFixerModal";
import { CampaignSettingsModal } from "../campaigns/CampaignSettingsModal";
import { getCanonicalYouTubeUrl } from "../../lib/youtube";
import { calculateHealthScore } from "../../lib/healthScore";
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

const getHealthColor = (score: number) => {
  if (score >= 90) return "text-health-excellent";
  if (score >= 75) return "text-health-good";
  if (score >= 60) return "text-health-moderate";
  if (score >= 40) return "text-health-poor";
  return "text-health-critical";
};

const getHealthBadgeVariant = (score: number) => {
  if (score >= 90) return "default";
  if (score >= 75) return "secondary";
  if (score >= 60) return "outline";
  return "destructive";
};

const getTrendIcon = (views7Days: number, currentViews: number) => {
  const trend = views7Days > (currentViews * 0.1) ? "up" : views7Days < (currentViews * 0.05) ? "down" : "stable";
  switch (trend) {
    case "up": return <TrendingUp className="h-4 w-4 text-success" />;
    case "down": return <TrendingDown className="h-4 w-4 text-destructive" />;
    case "stable": return <Minus className="h-4 w-4 text-muted-foreground" />;
    default: return null;
  }
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};

// Health score calculation imported from ../../lib/healthScore

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'default';
    case 'ready': return 'secondary';
    case 'pending': return 'secondary';
    case 'on_hold': return 'outline';
    case 'complete': return 'default';
    default: return 'secondary';
  }
};

interface CampaignTableProps {
  onConfigureTable?: () => void;
}

export const CampaignTable = ({ onConfigureTable }: CampaignTableProps) => {
  const { campaigns, loading, updateCampaign } = useCampaigns();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [ratioModalOpen, setRatioModalOpen] = useState(false);
  const [campaignSettingsOpen, setCampaignSettingsOpen] = useState(false);
  const { user } = useAuth();

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    const previousStatus = campaigns.find(c => c.id === campaignId)?.status;
    await updateCampaign(campaignId, { status: newStatus as any });
    await notifyOpsStatusChange({
      service: "youtube",
      campaignId,
      status: newStatus,
      previousStatus: previousStatus || null,
      actorEmail: user?.email || null,
    });
    notifySlack("youtube", "campaign_status_change", {
      campaignId,
      campaignName: campaigns.find(c => c.id === campaignId)?.campaign_name || campaignId,
      status: newStatus,
      previousStatus: previousStatus || null,
      actorEmail: user?.email || null,
    });
  };

  const handleRatioFixerClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setRatioModalOpen(true);
  };

  const handleCampaignSettingsClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setCampaignSettingsOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading campaigns...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            Campaign Performance Overview
          </div>
          {onConfigureTable && (
            <Button variant="outline" size="sm" onClick={onConfigureTable}>
              <Sliders className="h-4 w-4 mr-2" />
              Configure
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => {
              const healthScore = calculateHealthScore(campaign);
              const progress = campaign.goal_views > 0 ? (campaign.current_views || 0) / campaign.goal_views * 100 : 0;
              const engagementRatio = campaign.current_views > 0 ? 
                ((campaign.current_likes || 0) + (campaign.current_comments || 0)) / campaign.current_views * 100 : 0;

              return (
                <TableRow key={campaign.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{campaign.campaign_name}</span>
                        {getTrendIcon(campaign.views_7_days || 0, campaign.current_views || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">{campaign.genre || 'No genre'}</div>
                      {campaign.views_stalled && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-warning" />
                          <span className="text-xs text-warning">Stalled</span>
                        </div>
                      )}
                      {campaign.in_fixer && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-purple-400" />
                          <span className="text-xs text-purple-400">
                            {(campaign as any).ratio_fixer_status === 'running' ? 'Fixer Running' : 'In Fixer'}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{campaign.clients?.name || 'No client'}</div>
                      <div className="text-xs text-muted-foreground">{campaign.clients?.company || ''}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div 
                      className="flex items-center gap-2 cursor-pointer hover:opacity-80" 
                      onClick={() => handleRatioFixerClick(campaign)}
                    >
                      <Badge variant={getHealthBadgeVariant(healthScore)}>
                        {healthScore}%
                      </Badge>
                      {campaign.in_fixer && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Fixing
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {campaign.status === "pending" && <Clock className="h-4 w-4 text-muted-foreground" />}
                      {campaign.status === "ready" && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                      {campaign.status === "active" && <Play className="h-4 w-4 text-success" />}
                      {campaign.status === "on_hold" && <Pause className="h-4 w-4 text-warning" />}
                      {campaign.status === "complete" && <CheckCircle2 className="h-4 w-4 text-success" />}
                      <span className="text-foreground">
                        {campaign.status.replace('_', ' ')}
                      </span>
                      {campaign.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-1"
                          onClick={() => handleStatusChange(campaign.id, 'on_hold')}
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                      {campaign.status === 'on_hold' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-1"
                          onClick={() => handleStatusChange(campaign.id, 'active')}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      {campaign.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-1"
                          onClick={() => handleStatusChange(campaign.id, 'ready')}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                      {campaign.status === 'ready' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-1"
                          onClick={() => handleStatusChange(campaign.id, 'active')}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 min-w-[120px]">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{formatNumber(campaign.current_views || 0)}</span>
                        <span className="text-muted-foreground">/ {formatNumber(campaign.goal_views || 0)}</span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      <div className="text-xs text-muted-foreground">{progress.toFixed(0)}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`font-medium cursor-pointer hover:opacity-80 ${
                        engagementRatio >= 4 ? "text-success" : 
                        engagementRatio >= 3 ? "text-warning" : "text-destructive"
                      }`}
                      onClick={() => handleRatioFixerClick(campaign)}
                    >
                      {engagementRatio.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">
                      ${(campaign.sale_price || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(campaign.views_7_days || 0, campaign.current_views || 0)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(getCanonicalYouTubeUrl(campaign.youtube_url), '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleCampaignSettingsClick(campaign)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <RatioFixerModal
        campaign={selectedCampaign}
        isOpen={ratioModalOpen}
        onClose={() => {
          setRatioModalOpen(false);
          setSelectedCampaign(null);
        }}
      />

      {selectedCampaign && (
        <CampaignSettingsModal
          isOpen={campaignSettingsOpen}
          onClose={() => {
            setCampaignSettingsOpen(false);
            setSelectedCampaign(null);
          }}
          campaignId={selectedCampaign.id}
        />
      )}
    </Card>
  );
};
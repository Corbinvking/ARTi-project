import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { SERVICE_TYPES } from "../../lib/constants";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import { getCanonicalYouTubeUrl } from "../../lib/youtube";
import { YouTubePlayerDialog } from "../youtube/YouTubePlayerDialog";
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
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Calendar,
  Trash2,
  Mail,
  MailCheck,
  Info,
  Edit2,
  RotateCcw,
  CheckCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCampaigns } from "../../hooks/useCampaigns";
import { notifyOpsStatusChange } from "@/lib/status-notify";
import { notifySlack } from "@/lib/slack-notify";
import { useAuth } from "../../contexts/AuthContext";
import { CampaignSettingsModal } from "../campaigns/CampaignSettingsModal";
import { getApiUrl } from "../../lib/getApiUrl";
import { calculateHealthScore, getHealthBadgeColor } from "../../lib/healthScore";

import type { Database } from "../../integrations/supabase/types";
type Campaign = Database['public']['Tables']['youtube_campaigns']['Row'] & {
  youtube_clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  youtube_salespersons?: { id: string; name: string; email: string | null } | null;
};

type SortField = 'campaign_name' | 'client' | 'health' | 'status' | 'service_types' | 'views' | 'wow_change' | 'likes_comments' | 'start_date';
type SortDirection = 'asc' | 'desc';

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
    case 'on_hold': return 'destructive';
    case 'complete': return 'default';
    default: return 'secondary';
  }
};

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface CampaignTableEnhancedProps {
  filterType?: string;
  healthFilter?: 'healthy' | 'at-risk' | 'critical' | null;
}

export const CampaignTableEnhanced = ({ filterType: propFilterType, healthFilter }: CampaignTableEnhancedProps = {}) => {
  const { campaigns, loading, updateCampaign, deleteCampaign, refreshData } = useCampaigns();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [campaignSettingsOpen, setCampaignSettingsOpen] = useState(false);
  const [campaignSettingsTab, setCampaignSettingsTab] = useState<'basic' | 'metrics' | 'ratio-fixer' | 'results'>('basic');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(propFilterType || "all");
  const [sortField, setSortField] = useState<SortField>('campaign_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [emailSendingLoading, setEmailSendingLoading] = useState<string | null>(null);
  const [editingManualProgress, setEditingManualProgress] = useState<string | null>(null);
  const [manualProgressInput, setManualProgressInput] = useState<string>('');
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState<string>("");
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");
  const [fixerToggleLoading, setFixerToggleLoading] = useState<string | null>(null);

  const handleRatioFixerToggle = async (campaignId: string, inFixer: boolean) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const apiUrl = getApiUrl();
    setFixerToggleLoading(campaignId);

    try {
      if (inFixer) {
        if (!campaign.video_id || !campaign.genre) {
          toast({
            title: "Missing campaign data",
            description: "Campaign needs a video ID and genre before the ratio fixer can start. Open campaign settings to configure.",
            variant: "destructive",
          });
          return;
        }

        const response = await fetch(`${apiUrl}/api/ratio-fixer/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            videoUrl: campaign.youtube_url,
            videoId: campaign.video_id,
            genre: campaign.genre,
            commentsSheetUrl: campaign.comments_sheet_url || '',
            waitTime: campaign.wait_time_seconds || 36,
            minimumEngagement: campaign.minimum_engagement || 500,
            commentServerId: campaign.comment_server ? parseInt(campaign.comment_server) : undefined,
            likeServerId: campaign.like_server ? parseInt(campaign.like_server) : undefined,
            sheetTier: campaign.sheet_tier || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          toast({
            title: "Failed to start ratio fixer",
            description: data.error || data.message || 'Unknown error',
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Ratio Fixer Started",
          description: `Fixer is now running for "${campaign.campaign_name}"`,
        });

        await refreshData();
      } else {
        const ratioFixerCampaignId = (campaign as any).ratio_fixer_campaign_id;

        if (ratioFixerCampaignId) {
          try {
            const response = await fetch(`${apiUrl}/api/ratio-fixer/stop/${ratioFixerCampaignId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
              toast({
                title: "Warning",
                description: "Could not stop remote fixer — it may already be stopped. Local state updated.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Ratio Fixer Stopped",
                description: `Fixer stopped for "${campaign.campaign_name}"`,
              });
            }
          } catch {
            toast({
              title: "Warning",
              description: "Could not reach ratio fixer service. Local state updated.",
              variant: "destructive",
            });
          }
        }

        await updateCampaign(campaignId, {
          in_fixer: false,
          ratio_fixer_status: 'stopped',
          ratio_fixer_stopped_at: new Date().toISOString(),
        } as any);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to toggle ratio fixer',
        variant: "destructive",
      });
    } finally {
      setFixerToggleLoading(null);
    }
  };

  const handleWeeklyUpdatesToggle = async (campaignId: string, enabled: boolean) => {
    if (!enabled) {
      // If turning off, just update the flag
      await updateCampaign(campaignId, { weekly_updates_enabled: false });
      return;
    }

    // If turning on, trigger immediate email send
    setEmailSendingLoading(campaignId);
    
    try {
      // First update the campaign to enabled
      await updateCampaign(campaignId, { weekly_updates_enabled: true });
      
      // Then trigger the email send via API route
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/weekly-updates/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'manual', 
          campaign_id: campaignId
        }),
      });

      const data = await response.json();
      console.log('Weekly update response:', data);

      if (!response.ok || !data.ok) {
        console.error('Failed to send weekly update:', data);
        toast({
          title: "Email Send Failed",
          description: data.message || "Failed to send weekly update email. Please try again.",
          variant: "destructive",
        });
        // Revert the toggle
        await updateCampaign(campaignId, { weekly_updates_enabled: false });
      } else {
        toast({
          title: "Weekly Update Sent",
          description: `Weekly update email has been sent to ${data.recipient || 'client'}!`,
        });
      }
    } catch (error) {
      console.error('Error sending weekly update:', error);
      toast({
        title: "Email Send Failed",
        description: "Failed to send weekly update email. Please try again.",
        variant: "destructive",
      });
      // Revert the toggle
      await updateCampaign(campaignId, { weekly_updates_enabled: false });
    } finally {
      setEmailSendingLoading(null);
    }
  };

  const handleYouTubeClick = (youtubeUrl: string, campaignName: string) => {
    setSelectedYoutubeUrl(youtubeUrl);
    setSelectedVideoTitle(campaignName);
    setYoutubeDialogOpen(true);
  };

  const handleOpenCampaignModal = (campaign: Campaign, tab: 'basic' | 'metrics' | 'ratio-fixer' | 'results' = 'basic') => {
    setSelectedCampaign(campaign);
    setCampaignSettingsTab(tab);
    setCampaignSettingsOpen(true);
  };

  const handleCloseCampaignModal = () => {
    setCampaignSettingsOpen(false);
    setCampaignSettingsTab('basic');
    setSelectedCampaign(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(filteredAndSortedCampaigns.map(c => c.id));
    } else {
      setSelectedCampaigns([]);
    }
  };

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(prev => [...prev, campaignId]);
    } else {
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId));
    }
  };

  const handleBulkDelete = async () => {
    const promises = selectedCampaigns.map(campaignId => deleteCampaign(campaignId));
    await Promise.all(promises);
    setSelectedCampaigns([]);
    setDeleteDialogOpen(false);
  };

  const handleManualProgressEdit = (campaignId: string, currentValue: number) => {
    setEditingManualProgress(campaignId);
    setManualProgressInput(currentValue.toString());
  };

  const handleManualProgressSave = async (campaignId: string) => {
    const value = Math.max(0, parseInt(manualProgressInput) || 0);
    await updateCampaign(campaignId, { manual_progress: value });
    setManualOverrides((prev) => ({ ...prev, [campaignId]: value }));
    setEditingManualProgress(null);
    setManualProgressInput('');
    toast({
      title: "Manual Progress Updated",
      description: `Manual progress set to ${formatNumber(value)} views.`,
    });
  };
  const handleManualProgressCancel = () => {
    setEditingManualProgress(null);
    setManualProgressInput('');
  };

  const handleManualProgressReset = async (campaignId: string) => {
    try {
      // Optimistic update
      setManualOverrides((prev) => ({ ...prev, [campaignId]: 0 }));
      
      // Update database
      await updateCampaign(campaignId, { manual_progress: 0 });
      
      toast({
        title: "Manual Progress Reset",
        description: "Campaign reverted to YouTube API view tracking.",
      });
    } catch (error) {
      // Revert optimistic update on error
      const campaign = campaigns.find(c => c.id === campaignId);
      const originalValue = (campaign as any)?.manual_progress || 0;
      setManualOverrides((prev) => ({ ...prev, [campaignId]: originalValue }));
      
      toast({
        title: "Reset Failed",
        description: "Failed to reset manual progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns.filter(campaign => {
      // Search filter
      const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.youtube_clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.genre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.status.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Health filter
      if (healthFilter) {
        const healthScore = calculateHealthScore(campaign, manualOverrides[campaign.id] ?? ((campaign as any).manual_progress || 0));
        switch (healthFilter) {
          case 'healthy':
            if (healthScore < 75) return false;
            break;
          case 'at-risk':
            if (healthScore < 60 || healthScore >= 75) return false;
            break;
          case 'critical':
            if (healthScore >= 60) return false;
            break;
        }
      }

      // Status filter
      switch (filterType) {
        case 'pending':
          return campaign.status === 'pending';
        case 'ready':
          return campaign.status === 'ready';
        case 'active':
          return campaign.status === 'active';
        case 'on_hold':
          return campaign.status === 'on_hold';
        case 'stalling':
          return campaign.views_stalled === true;
        case 'upcoming':
          return campaign.start_date && new Date(campaign.start_date) > new Date();
        case 'complete':
          return campaign.status === 'complete';
        case 'no_comment_csv':
          return !campaign.comments_sheet_url;
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'campaign_name':
          aValue = a.campaign_name.toLowerCase();
          bValue = b.campaign_name.toLowerCase();
          break;
        case 'client':
          aValue = (a.youtube_clients?.name || '').toLowerCase();
          bValue = (b.youtube_clients?.name || '').toLowerCase();
          break;
        case 'health':
          aValue = calculateHealthScore(a, manualOverrides[a.id] ?? ((a as any).manual_progress || 0));
          bValue = calculateHealthScore(b, manualOverrides[b.id] ?? ((b as any).manual_progress || 0));
          break;
                case 'status':
                  aValue = a.status;
                  bValue = b.status;
                  break;
                case 'service_types':
                  const aServiceType = SERVICE_TYPES.find(type => type.value === a.service_type)?.label || a.custom_service_type || '';
                  const bServiceType = SERVICE_TYPES.find(type => type.value === b.service_type)?.label || b.custom_service_type || '';
                  aValue = aServiceType.toLowerCase();
                  bValue = bServiceType.toLowerCase();
                  break;
                case 'views':
          aValue = a.current_views || 0;
          bValue = b.current_views || 0;
          break;
        case 'wow_change':
          // Weekly growth rate: what percentage of total views came in the last 7 days
          aValue = (a.current_views || 0) > 0 ? ((a.views_7_days || 0) / (a.current_views || 1)) * 100 : 0;
          bValue = (b.current_views || 0) > 0 ? ((b.views_7_days || 0) / (b.current_views || 1)) * 100 : 0;
          break;
        case 'likes_comments':
          aValue = (a.current_likes || 0) + (a.current_comments || 0);
          bValue = (b.current_likes || 0) + (b.current_comments || 0);
          break;
        case 'start_date':
          aValue = new Date(a.start_date || '').getTime();
          bValue = new Date(b.start_date || '').getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [campaigns, searchTerm, filterType, healthFilter, sortField, sortDirection]);

  const allSelected = selectedCampaigns.length === filteredAndSortedCampaigns.length && filteredAndSortedCampaigns.length > 0;
  const someSelected = selectedCampaigns.length > 0;

  // Calculate queue stats for embedded ratio fixer
  const queueStats = {
    waiting: campaigns.filter(c => c.views_stalled && !c.in_fixer).length,
    processing: campaigns.filter(c => c.in_fixer).length,
    completed: campaigns.filter(c => c.status === 'complete').length
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
    <div className="space-y-4">
      {/* Ratio Fixer Queue Stats */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Ratio Fixer Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="font-semibold text-lg">{queueStats.waiting}</div>
                <div className="text-muted-foreground">Waiting</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-warning">{queueStats.processing}</div>
                <div className="text-muted-foreground">Processing</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-success">{queueStats.completed}</div>
                <div className="text-muted-foreground">Completed</div>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {((queueStats.completed / (queueStats.completed + queueStats.processing + queueStats.waiting)) * 100 || 0).toFixed(0)}% Success Rate
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[400px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              <SelectItem value="pending">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Pending Campaigns
                </span>
              </SelectItem>
              <SelectItem value="ready">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Ready Campaigns
                </span>
              </SelectItem>
              <SelectItem value="active">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Active Campaigns
                </span>
              </SelectItem>
              <SelectItem value="on_hold">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  On Hold Campaigns
                </span>
              </SelectItem>
              <SelectItem value="stalling">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Stalling Campaigns
                </span>
              </SelectItem>
              <SelectItem value="upcoming">Upcoming Campaigns</SelectItem>
              <SelectItem value="complete">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Complete Campaigns
                </span>
              </SelectItem>
              <SelectItem value="no_comment_csv">No Comment CSV</SelectItem>
            </SelectContent>
          </Select>
          {someSelected && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedCampaigns.length})
            </Button>
          )}
        </div>
      </div>

      {/* Campaign Table */}
      <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all campaigns"
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('campaign_name')}
                >
                  <div className="flex items-center gap-2">
                    Campaign
                    {getSortIcon('campaign_name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('client')}
                >
                  <div className="flex items-center gap-2">
                    Client
                    {getSortIcon('client')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('health')}
                >
                  <div className="flex items-center gap-2">
                    Health
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2">
                            <div className="font-semibold">Health Score (Pacing-based)</div>
                            <div className="text-sm space-y-1">
                              <div>• Pacing vs plan: up to 70 pts (expected views by today vs actual, incl. manual override)</div>
                              <div>• Ratio Fixer active: +15 pts when campaign is active and in fixer</div>
                              <div>• Stalling penalty: −25 pts if stalling detected</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Clamped to 0–100. Manual overrides replace YouTube API views when set.
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {getSortIcon('health')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                 <TableHead 
                   className="cursor-pointer hover:bg-muted/50"
                   onClick={() => handleSort('service_types')}
                 >
                   <div className="flex items-center gap-2">
                     Service Type
                     {getSortIcon('service_types')}
                   </div>
                 </TableHead>
                 <TableHead>Ratio Fixer</TableHead>
                 <TableHead>Weekly Updates</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('views')}
                >
                  <div className="flex items-center gap-2">
                    Current Views vs Goal
                    {getSortIcon('views')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('wow_change')}
                  title="Percentage of total views gained in the last 7 days"
                >
                  <div className="flex items-center gap-2">
                    7-Day %
                    {getSortIcon('wow_change')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('likes_comments')}
                >
                  <div className="flex items-center gap-2">
                    👍💬
                    {getSortIcon('likes_comments')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('start_date')}
                >
                  <div className="flex items-center gap-2">
                    Start Date
                    {getSortIcon('start_date')}
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCampaigns.map((campaign) => {
                // Get service types from new structure or fallback to legacy single service type
                const serviceTypes = (campaign as any).service_types ? 
                  (typeof (campaign as any).service_types === 'string' ? 
                    JSON.parse((campaign as any).service_types) : 
                    (campaign as any).service_types) : 
                  [{
                    service_type: campaign.service_type,
                    custom_service_type: (campaign as any).custom_service_type,
                    goal_views: campaign.goal_views || 0
                  }];
                
                // Calculate total goal views from all service types
                const totalGoalViews = serviceTypes.reduce((sum: number, st: any) => sum + (st.goal_views || 0), 0);
                
                // Calculate weekly growth rate: what percentage of total views came in the last 7 days
                const wowChange = (campaign.current_views || 0) > 0 ? 
                  ((campaign.views_7_days || 0) / (campaign.current_views || 1)) * 100 : 0;
                // Include manual overrides (typed when editing or saved value)
                const typedOverride = editingManualProgress === campaign.id ? parseInt(manualProgressInput) : undefined;
                const manualOverrideSafe = (typeof typedOverride === 'number' && !isNaN(typedOverride) && typedOverride >= 0)
                  ? typedOverride
                  : (manualOverrides[campaign.id] ?? ((campaign as any).manual_progress || 0));
                const healthScore = calculateHealthScore(campaign, manualOverrideSafe);
                const totalViewsWithManual = manualOverrideSafe > 0 ? manualOverrideSafe : (campaign.current_views || 0);
                const progress = totalGoalViews > 0 ? (totalViewsWithManual / totalGoalViews) * 100 : 0;

                const rowPerformanceColor = campaign.status === 'active'
                  ? healthScore >= 80 ? 'bg-green-500/5 border-l-2 border-l-green-500/40'
                    : healthScore >= 50 ? 'bg-blue-500/5 border-l-2 border-l-blue-500/40'
                    : 'bg-red-500/5 border-l-2 border-l-red-500/40'
                  : '';

                return (
                  <TableRow 
                    key={campaign.id} 
                    className={`hover:bg-muted/50 cursor-pointer transition-colors ${rowPerformanceColor}${
                      selectedCampaigns.includes(campaign.id) ? ' bg-muted/30' : ''
                    }`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('[role="checkbox"]')) {
                        return;
                      }
                      handleOpenCampaignModal(campaign, 'basic');
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedCampaigns.includes(campaign.id)}
                        onCheckedChange={(checked) => handleSelectCampaign(campaign.id, !!checked)}
                        aria-label={`Select ${campaign.campaign_name}`}
                      />
                    </TableCell>
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
                       <div className="font-medium text-sm">
                         {campaign.youtube_clients?.company || campaign.youtube_clients?.name || 'No client'}
                       </div>
                     </TableCell>
                    <TableCell>
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCampaignModal(campaign, 'ratio-fixer');
                        }}
                      >
                        <Badge className={getHealthBadgeColor(healthScore)}>
                          {healthScore}%
                        </Badge>
                        {campaign.in_fixer && (
                          <Badge className={`text-xs border ${(campaign as any).ratio_fixer_status === 'running' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-purple-500/10 text-purple-400 border-purple-500/30'}`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {(campaign as any).ratio_fixer_status === 'running' ? 'Fixer Active' : 'In Fixer'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                     <TableCell>
                       <div className="flex flex-col gap-1">
                        <Select
                          value={campaign.status}
                          onValueChange={async (value) => {
                            const previousStatus = campaign.status;
                            await updateCampaign(campaign.id, { status: value as Campaign['status'] });
                            await notifyOpsStatusChange({
                              service: "youtube",
                              campaignId: campaign.id,
                              status: value,
                              previousStatus,
                              actorEmail: user?.email || null,
                            });
                            notifySlack("youtube", "campaign_status_change", {
                              campaignId: campaign.id,
                              campaignName: campaign.campaign_name,
                              status: value,
                              previousStatus,
                              actorEmail: user?.email || null,
                            });
                          }}
                        >
                           <SelectTrigger 
                             className={`w-[130px] ${
                               campaign.status === 'active' ? 'border-green-500/30' :
                               campaign.status === 'pending' ? 'border-yellow-500/30' :
                               campaign.status === 'ready' ? 'border-blue-500/30' :
                               campaign.status === 'on_hold' ? 'border-red-500/30' :
                               campaign.status === 'complete' ? 'border-blue-500/30' : ''
                             }`}
                             onClick={(e) => e.stopPropagation()}
                           >
                              <div className="flex items-center gap-2">
                               {campaign.status === "pending" && <Clock className="h-4 w-4 text-yellow-400" />}
                               {campaign.status === "ready" && <CheckCircle className="h-4 w-4 text-blue-400" />}
                               {campaign.status === "active" && <Play className="h-4 w-4 text-green-400" />}
                               {campaign.status === "on_hold" && <Pause className="h-4 w-4 text-red-400" />}
                               {campaign.status === "complete" && <CheckCircle2 className="h-4 w-4 text-blue-400" />}
                               <SelectValue />
                             </div>
                           </SelectTrigger>
                           <SelectContent>
                            <SelectItem value="pending">
                              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" />Pending</span>
                            </SelectItem>
                            <SelectItem value="ready">
                              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />Ready</span>
                            </SelectItem>
                            <SelectItem value="active">
                              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" />Active</span>
                            </SelectItem>
                            <SelectItem value="on_hold">
                              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />On Hold</span>
                            </SelectItem>
                            <SelectItem value="complete">
                              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />Complete</span>
                            </SelectItem>
                           </SelectContent>
                         </Select>
                           {campaign.views_stalled && (
                             <div className="flex items-center gap-1">
                               <Badge className="text-xs bg-red-500/10 text-red-400 border border-red-500/30" title={campaign.stalling_detected_at ? `Detected ${new Date(campaign.stalling_detected_at).toLocaleDateString()}` : 'Views growth below threshold'}>
                                 <AlertTriangle className="w-3 h-3 mr-1" />
                                 Stalling
                               </Badge>
                             </div>
                           )}
                          {campaign.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              {!(campaign as any).technical_setup_complete ? (
                                <Badge className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                                  <Settings className="w-3 h-3 mr-1" />
                                  Needs Setup
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-green-500/10 text-green-400 border border-green-500/30">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Ready
                                </Badge>
                              )}
                            </div>
                          )}
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="flex flex-wrap gap-1">
                         {serviceTypes.map((st: any, index: number) => {
                           const label = SERVICE_TYPES.find(type => type.value === st.service_type)?.label || 
                             st.custom_service_type || 'Unknown';
                           return (
                             <Badge key={index} variant="outline" className="text-xs">
                               {label}
                             </Badge>
                           );
                         })}
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Switch
                           checked={campaign.in_fixer || false}
                           disabled={fixerToggleLoading === campaign.id}
                           onCheckedChange={(checked) => handleRatioFixerToggle(campaign.id, checked)}
                         />
                         {fixerToggleLoading === campaign.id && (
                           <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" title="Starting/stopping ratio fixer..." />
                         )}
                         {fixerToggleLoading !== campaign.id && (campaign as any).ratio_fixer_status === 'running' && (
                           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Ratio fixer is actively running" />
                         )}
                       </div>
                     </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={campaign.weekly_updates_enabled || false}
                            onCheckedChange={(checked) => handleWeeklyUpdatesToggle(campaign.id, checked)}
                            disabled={emailSendingLoading === campaign.id}
                          />
                          {emailSendingLoading === campaign.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : campaign.weekly_updates_enabled ? (
                            <MailCheck className="h-4 w-4 text-success" />
                          ) : (
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          )}
                          {campaign.weekly_update_ready && (
                            <Badge variant="secondary" className="text-xs">
                              Ready
                            </Badge>
                          )}
                        </div>
                        {campaign.last_weekly_update_sent && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last sent: {format(new Date(campaign.last_weekly_update_sent), 'MM/dd HH:mm')}
                          </div>
                        )}
                      </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1 min-w-[180px]">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-foreground">{formatNumber(totalViewsWithManual)}</span>
                            {(manualOverrideSafe || 0) > 0 && (
                              <span className="text-xs text-blue-600">
                                (Override: {formatNumber(manualOverrideSafe || 0)})
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground">/ {formatNumber(totalGoalViews || 0)}</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">{progress.toFixed(0)}% complete</div>
                          {editingManualProgress === campaign.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={manualProgressInput}
                                onChange={(e) => setManualProgressInput(e.target.value)}
                                className="h-6 w-16 text-xs"
                                placeholder="0"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleManualProgressSave(campaign.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={handleManualProgressCancel}
                              >
                                ×
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                onClick={() => handleManualProgressEdit(campaign.id, (campaign as any).manual_progress || 0)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              {manualOverrideSafe > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                        onClick={() => handleManualProgressReset(campaign.id)}
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Reset to YouTube API tracking</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          )}
                        </div>
                          {(manualOverrideSafe || 0) > 0 && (
                            <div className="text-xs text-blue-600">
                              Manual override: {formatNumber(manualOverrideSafe || 0)} total views
                            </div>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${
                        wowChange > 0 ? 'text-success' : 
                        wowChange < 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {wowChange > 0 && <TrendingUp className="h-4 w-4" />}
                        {wowChange < 0 && <TrendingDown className="h-4 w-4" />}
                        {wowChange === 0 && <Minus className="h-4 w-4" />}
                        <span className="font-medium">
                          {wowChange > 0 ? '+' : ''}{wowChange.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium text-foreground">
                          {formatNumber((campaign.current_likes || 0) + (campaign.current_comments || 0))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(campaign.current_likes || 0)} likes + {formatNumber(campaign.current_comments || 0)} comments
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {campaign.start_date ? format(new Date(campaign.start_date), 'MM/dd/yy') : 'Not set'}
                        </span>
                      </div>
                    </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1">
                         {campaign.status === 'pending' && (
                           <>
                             {!(campaign as any).technical_setup_complete ? (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleOpenCampaignModal(campaign, 'basic');
                                 }}
                               >
                                 <Settings className="h-4 w-4 mr-1" />
                                 Setup
                               </Button>
                             ) : (
                               <Button
                                 variant="default"
                                 size="sm"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   updateCampaign(campaign.id, { status: 'active' });
                                 }}
                               >
                                 <Play className="h-4 w-4 mr-1" />
                                 Activate
                               </Button>
                             )}
                           </>
                         )}
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleYouTubeClick(campaign.youtube_url, campaign.campaign_name);
                                 }}
                               >
                                 <Play className="h-4 w-4" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Watch video</TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleOpenCampaignModal(campaign, 'basic');
                                 }}
                               >
                                 <Settings className="h-4 w-4" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Edit campaign</TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSelectedCampaign(campaign);
                                   setSelectedCampaigns([campaign.id]);
                                   setDeleteDialogOpen(true);
                                 }}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent>Delete campaign</TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                       </div>
                     </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
      </div>

      {selectedCampaign && (
        <CampaignSettingsModal
          isOpen={campaignSettingsOpen}
          onClose={handleCloseCampaignModal}
          campaignId={selectedCampaign.id}
          initialTab={campaignSettingsTab}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaigns</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCampaigns.length} campaign(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <YouTubePlayerDialog
        isOpen={youtubeDialogOpen}
        onClose={() => setYoutubeDialogOpen(false)}
        youtubeUrl={selectedYoutubeUrl}
        title={selectedVideoTitle}
      />
    </div>
  );
};

"use client"

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
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { SERVICE_TYPES } from "../../lib/constants";
import { getCanonicalYouTubeUrl } from "../../lib/youtube";
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
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Play,
} from "lucide-react";
import { useCampaigns } from "../../hooks/useCampaigns";
import { SalespersonCampaignDetailsModal } from "./SalespersonCampaignDetailsModal";
import { YouTubePlayerDialog } from "../youtube/YouTubePlayerDialog";
import { calculateHealthScore } from "../../lib/healthScore";
import { useRouter } from 'next/navigation';

import type { Database } from "../../integrations/supabase/types";
type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

type SortField = 'campaign_name' | 'client' | 'health' | 'status' | 'service_types' | 'views' | 'wow_change' | 'likes_comments' | 'start_date';
type SortDirection = 'asc' | 'desc';

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

interface SalespersonCampaignTableProps {
  campaigns: Campaign[];
  loading: boolean;
  healthFilter?: 'healthy' | 'at-risk' | 'critical' | null;
}

export const SalespersonCampaignTable = ({ campaigns, loading, healthFilter }: SalespersonCampaignTableProps) => {
  const navigate = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState<SortField>('campaign_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState<string>("");
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("");

  const handleCampaignClick = (campaign: Campaign) => {
    navigate(`/campaigns/${campaign.id}`);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleYouTubeClick = (youtubeUrl: string, campaignName: string) => {
    setSelectedYoutubeUrl(youtubeUrl);
    setSelectedVideoTitle(campaignName);
    setYoutubeDialogOpen(true);
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

  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns.filter(campaign => {
      // Search filter
      const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.genre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.status.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Health filter
      if (healthFilter) {
        const healthScore = calculateHealthScore(campaign);
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
        case 'active':
          return campaign.status === 'active';
        case 'upcoming':
          return campaign.start_date && new Date(campaign.start_date) > new Date();
        case 'completed':
          return campaign.status === 'complete';
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
          aValue = (a.clients?.name || '').toLowerCase();
          bValue = (b.clients?.name || '').toLowerCase();
          break;
        case 'health':
          aValue = calculateHealthScore(a);
          bValue = calculateHealthScore(b);
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
            My Campaign Performance
          </div>
          <div className="flex items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="pending">Pending Campaigns</SelectItem>
                <SelectItem value="active">Active Campaigns</SelectItem>
                <SelectItem value="upcoming">Upcoming Campaigns</SelectItem>
                <SelectItem value="completed">Completed Campaigns</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="pl-8 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('campaign_name')}
              >
                <div className="flex items-center gap-2">
                  Campaign
                  {getSortIcon('campaign_name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('client')}
              >
                <div className="flex items-center gap-2">
                  Client
                  {getSortIcon('client')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none text-center"
                onClick={() => handleSort('health')}
              >
                <div className="flex items-center justify-center gap-2">
                  Health
                  {getSortIcon('health')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('service_types')}
              >
                <div className="flex items-center gap-2">
                  Service Type
                  {getSortIcon('service_types')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none text-center"
                onClick={() => handleSort('views')}
              >
                <div className="flex items-center justify-center gap-2">
                  Current Views vs Goal
                  {getSortIcon('views')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none text-center"
                onClick={() => handleSort('wow_change')}
                title="Percentage of total views gained in the last 7 days"
              >
                <div className="flex items-center justify-center gap-2">
                  7-Day %
                  {getSortIcon('wow_change')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none text-center"
                onClick={() => handleSort('likes_comments')}
              >
                <div className="flex items-center justify-center gap-2">
                  👍💬
                  {getSortIcon('likes_comments')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('start_date')}
              >
                <div className="flex items-center gap-2">
                  Start Date
                  {getSortIcon('start_date')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No campaigns found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedCampaigns.map((campaign) => {
                const healthScore = calculateHealthScore(campaign);
                
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
                const viewsProgress = totalGoalViews > 0 ? (campaign.current_views || 0) / totalGoalViews * 100 : 0;
                
                // Weekly growth rate: what percentage of total views came in the last 7 days
                const wowChange = (campaign.current_views || 0) > 0 ? 
                  ((campaign.views_7_days || 0) / (campaign.current_views || 1)) * 100 : 0;

                return (
                  <TableRow 
                    key={campaign.id} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleCampaignClick(campaign)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]" title={campaign.campaign_name}>
                          {campaign.campaign_name}
                        </span>
                        {campaign.youtube_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleYouTubeClick(campaign.youtube_url, campaign.campaign_name);
                            }}
                            className="text-primary hover:text-primary/80 flex-shrink-0 p-1 rounded-sm hover:bg-muted/50 transition-colors"
                            title="Watch video"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="truncate max-w-[150px] block" title={campaign.clients?.name}>
                        {campaign.clients?.name || 'No client'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={getHealthBadgeVariant(healthScore)}
                        className={`${getHealthColor(healthScore)} font-medium`}
                      >
                        {healthScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {serviceTypes.map((st: any, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {SERVICE_TYPES.find(type => type.value === st.service_type)?.label || st.custom_service_type || 'Custom'}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <div className="text-sm">
                          {formatNumber(campaign.current_views || 0)} / {formatNumber(totalGoalViews)}
                        </div>
                        <Progress value={Math.min(viewsProgress, 100)} className="h-2 w-20 mx-auto" />
                        <div className="text-xs text-muted-foreground">
                          {viewsProgress.toFixed(1)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(campaign.views_7_days || 0, campaign.current_views || 0)}
                        <span className={`text-sm ${
                          wowChange > 5 ? 'text-success' : 
                          wowChange < -5 ? 'text-destructive' : 
                          'text-muted-foreground'
                        }`}>
                          {wowChange > 0 ? '+' : ''}{wowChange.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">
                        {formatNumber(campaign.current_likes || 0)} / {formatNumber(campaign.current_comments || 0)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {campaign.start_date ? format(new Date(campaign.start_date), 'MMM dd, yyyy') : 'Not set'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      {selectedCampaign && (
        <SalespersonCampaignDetailsModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          campaign={selectedCampaign}
        />
      )}
      
      <YouTubePlayerDialog
        isOpen={youtubeDialogOpen}
        onClose={() => setYoutubeDialogOpen(false)}
        youtubeUrl={selectedYoutubeUrl}
        title={selectedVideoTitle}
      />
    </Card>
  );
};
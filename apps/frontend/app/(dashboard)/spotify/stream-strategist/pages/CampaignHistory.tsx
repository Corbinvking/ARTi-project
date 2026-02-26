"use client"

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Checkbox } from "../components/ui/checkbox";
import { useToast } from "../hooks/use-toast";
import { APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_SOURCE_INTAKE, APP_CAMPAIGN_TYPE } from "../lib/constants";
import { StatusBadge } from "../components/ui/status-badge";
import { InteractiveStatusBadge } from "../components/ui/interactive-status-badge";
import { notifyOpsStatusChange } from "@/lib/status-notify";
import { notifySlack } from "@/lib/slack-notify";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { Label } from "../components/ui/label";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Copy,
  Pause,
  Play,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  DollarSign,
  Target,
  ExternalLink,
  Download,
  Upload,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Activity,
  Music,
  List,
  X
} from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { EditCampaignModal } from "../components/EditCampaignModal";
import CampaignImportModal from "../components/CampaignImportModal";
import { CampaignDetailsModal } from "../components/CampaignDetailsModal";
import { DraftCampaignReviewModal } from "../components/DraftCampaignReviewModal";
import { CreateCampaignWizard } from "../components/CreateCampaignWizard";
import { CampaignSubmissionsManager } from "../components/CampaignSubmissionsManager";
import { VendorPayoutManager } from "../components/VendorPayoutManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

interface Campaign {
  id: string;
  name: string;
  artist_name?: string;
  client: string;
  client_name?: string;
  track_url: string;
  track_name?: string;
  stream_goal: number;
  remaining_streams: number;
  budget: number;
  sub_genre: string;
  start_date: string;
  duration_days: number;
  status: string;
  selected_playlists: any;
  vendor_allocations: any;
  totals: any;
  created_at: string;
  updated_at: string;
  daily_streams?: number;
  weekly_streams?: number;
  playlists?: Array<{ name: string; url?: string; vendor_name?: string }>;
  music_genres: string[];
  territory_preferences: string[];
  content_types: string[];
  algorithm_recommendations: any;
  salesperson: string;
  pending_operator_review?: boolean;
  // Enhanced fields
  invoice_status?: string;
  performance_status?: string;
  progress_percentage?: number;
  sfa_status?: 'connected' | 'no_access' | 'pending' | 'active' | 'stale' | 'no_url';
  playlist_status?: 'has_playlists' | 'no_playlists' | 'pending';
  // Scraped real data fields (NEW from Spotify for Artists scraper)
  streams_24h?: number;
  streams_7d?: number;
  streams_12m?: number;
  playlists_24h_count?: number;
  playlists_7d_count?: number;
  streams_24h_trend?: number;
  streams_7d_trend?: number;
  has_sfa_url?: boolean;
  last_scraped_at?: string | null;
  hours_since_scrape?: number;
  // Legacy scraped fields
  plays_last_7d?: number;
  plays_last_3m?: number;
  plays_last_12m?: number;
  playlist_adds?: number;
  saves?: number;
}

type SortField = 'name' | 'client' | 'budget' | 'stream_goal' | 'daily_streams' | 'weekly_streams' | 'remaining_streams' | 'start_date' | 'progress' | 'status' | 'invoice_status' | 'performance_status' | 'schedule_status';
type SortDirection = 'asc' | 'desc';

// Calculate schedule status based on start date, duration, and current progress
function calculateScheduleStatus(campaign: Campaign): {
  status: 'ahead' | 'on_track' | 'behind' | 'not_started' | 'completed';
  expectedProgress: number;
  actualProgress: number;
  daysElapsed: number;
  totalDays: number;
  dailyRequired: number;
  progressDiff: number;
} {
  const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
  const totalGoal = campaign.stream_goal || 0;
  const currentProgress = campaign.progress_percentage || 0;
  const totalRemaining = campaign.remaining_streams || totalGoal;
  const durationDays = campaign.duration_days || 90;
  
  // If no start date, can't calculate
  if (!startDate) {
    return {
      status: 'not_started',
      expectedProgress: 0,
      actualProgress: currentProgress,
      daysElapsed: 0,
      totalDays: durationDays,
      dailyRequired: 0,
      progressDiff: 0
    };
  }
  
  const now = new Date();
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // If campaign hasn't started yet
  if (daysElapsed <= 0) {
    return {
      status: 'not_started',
      expectedProgress: 0,
      actualProgress: currentProgress,
      daysElapsed: 0,
      totalDays: durationDays,
      dailyRequired: totalGoal / durationDays,
      progressDiff: 0
    };
  }
  
  // If campaign is complete
  if (currentProgress >= 100 || totalRemaining <= 0) {
    return {
      status: 'completed',
      expectedProgress: 100,
      actualProgress: currentProgress,
      daysElapsed,
      totalDays: durationDays,
      dailyRequired: 0,
      progressDiff: 0
    };
  }
  
  const expectedProgress = Math.min(100, (daysElapsed / durationDays) * 100);
  const remainingDays = Math.max(1, durationDays - daysElapsed);
  const delivered = totalGoal - totalRemaining;
  const avgDailyRate = daysElapsed > 0 ? delivered / daysElapsed : 0;
  const projectedAtEnd = delivered + avgDailyRate * remainingDays;
  const dailyRequired = totalRemaining / remainingDays;
  const progressDiff = currentProgress - expectedProgress;

  let status: 'ahead' | 'on_track' | 'behind';
  if (projectedAtEnd >= totalGoal * 1.1) {
    status = 'ahead';
  } else if (projectedAtEnd >= totalGoal) {
    status = 'on_track';
  } else {
    status = 'behind';
  }

  return {
    status,
    expectedProgress: Math.round(expectedProgress),
    actualProgress: currentProgress,
    daysElapsed,
    totalDays: durationDays,
    dailyRequired: Math.round(dailyRequired),
    progressDiff: Math.round(progressDiff)
  };
}

export default function CampaignHistory() {
  const [searchParams] = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams?.get('tab') || 'campaigns';
  });
  
  const submissionId = searchParams?.get('submissionId');
  const highlightCampaignId = searchParams?.get('highlight');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<string>("all");
  const [sfaFilter, setSfaFilter] = useState<string>("all");
  const [playlistFilter, setPlaylistFilter] = useState<string>("all");
  const [enhancedPerformanceFilter, setEnhancedPerformanceFilter] = useState<string>("all");

  // Initialize filter from URL parameters
  useEffect(() => {
    const performanceParam = searchParams?.get('performance');
    if (performanceParam) {
      setPerformanceFilter(performanceParam);
      setStatusFilter('active'); // Focus on active campaigns for performance filtering
    }
  }, [searchParams]);
  
  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [detailsModal, setDetailsModal] = useState<{ open: boolean; campaign?: Campaign }>({ open: false });
  const [editModal, setEditModal] = useState<{ open: boolean; campaign?: Campaign }>({ open: false });
  const [draftReviewModal, setDraftReviewModal] = useState<{ open: boolean; campaign?: Campaign }>({ open: false });
  const { user } = useAuth();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('start_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns with enhanced data - Now using campaign_groups
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns-enhanced'],
    queryFn: async (): Promise<Campaign[]> => {
      // Fetch campaign groups
      const { data: campaignGroups, error } = await supabase
        .from('campaign_groups')
        .select(`
          *,
          clients:client_id (
            id,
            name,
            emails
          )
        `)
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaign groups:', error);
        throw error;
      }
      
          // For each campaign group, fetch songs and calculate metrics
          const enhancedCampaigns = await Promise.all(
            (campaignGroups || []).map(async (group: any) => {
              const { data: songs, error: songsError } = await supabase
                .from('spotify_campaigns')
                .select('*')
                .eq('campaign_group_id', group.id)
                .order('last_scraped_at', { ascending: false, nullsFirst: false });

              if (songsError) {
                console.error(`Error fetching songs for campaign ${group.id}:`, songsError);
              }

              // Calculate totals from songs (promised metrics)
              const total_remaining = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.remaining) || 0), 0);
              const total_daily = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.daily) || 0), 0);
              const total_weekly = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.weekly) || 0), 0);
              
              // Calculate REAL metrics from scraped data (NEW: from our scraper)
              const real_streams_24h = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.streams_24h) || 0), 0);
              const real_streams_7d = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.streams_7d) || 0), 0);
              const real_streams_12m = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.streams_12m) || 0), 0);
              const total_playlists_24h = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.playlists_24h_count) || 0), 0);
              const total_playlists_7d = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.playlists_7d_count) || 0), 0);
              
              // Legacy metrics (for backward compatibility)
              const real_plays_7d = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.plays_last_7d) || 0), 0);
              const real_plays_3m = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.plays_last_3m) || 0), 0);
              const real_plays_12m = (songs || []).reduce((sum: number, song: any) => sum + (parseInt(song.plays_last_12m) || 0), 0);
              const total_playlists = (songs || []).reduce((sum: number, song: any) => Math.max(sum, parseInt(song.playlist_adds) || 0), 0);
              
              // SFA URL Status: Check if any song has valid SFA URL and recent scrape
              const hasSfaUrl = (songs || []).some((song: any) => song.sfa && song.sfa.trim() !== '');
              const lastScrapedDate = (songs || [])
                .map((song: any) => song.last_scraped_at ? new Date(song.last_scraped_at).getTime() : 0)
                .reduce((max: number, date: number) => Math.max(max, date), 0);
              const hoursSinceLastScrape = lastScrapedDate ? (Date.now() - lastScrapedDate) / (1000 * 60 * 60) : Infinity;
              
              // Calculate trend: compare current vs previous streams (stored in scrape_data history)
              let streams_24h_trend = 0;
              let streams_7d_trend = 0;
              const mostRecentSong = songs && songs[0]; // Already sorted by last_scraped_at desc
              if (mostRecentSong && mostRecentSong.scrape_data && mostRecentSong.scrape_data.previous) {
                const prev_24h = parseInt(mostRecentSong.scrape_data.previous.streams_24h) || 0;
                const prev_7d = parseInt(mostRecentSong.scrape_data.previous.streams_7d) || 0;
                const curr_24h = parseInt(mostRecentSong.streams_24h) || 0;
                const curr_7d = parseInt(mostRecentSong.streams_7d) || 0;
                streams_24h_trend = curr_24h - prev_24h;
                streams_7d_trend = curr_7d - prev_7d;
              }
          
          const progress_percentage = group.total_goal > 0 
            ? Math.round(((group.total_goal - total_remaining) / group.total_goal) * 100)
            : 0;

              // Map to Campaign interface expected by the UI
              return {
                id: group.id,
                name: group.name,
                artist_name: group.artist_name,
                client: group.clients?.name || group.client_id,
                client_name: group.clients?.name || group.client_id,
                client_id: group.client_id,
                track_url: (songs && songs[0]?.url) || '',
                track_name: group.name,
                stream_goal: group.total_goal,
                remaining_streams: total_remaining,
                budget: group.total_budget,
                sub_genre: '',
                start_date: group.start_date,
                duration_days: 90,
                status: group.status,
                created_at: group.created_at,
                updated_at: group.updated_at,
                // Promised metrics (from vendor promises) - DEPRECATED, use scraped data
                daily_streams: total_daily,
                weekly_streams: total_weekly,
                // REAL metrics from our Spotify for Artists scraper (PRIORITY for display)
                streams_24h: real_streams_24h,
                streams_7d: real_streams_7d,
                streams_12m: real_streams_12m,
                playlists_24h_count: total_playlists_24h,
                playlists_7d_count: total_playlists_7d,
                streams_24h_trend,
                streams_7d_trend,
                // Legacy metrics (backward compatibility)
                plays_last_7d: real_plays_7d,
                plays_last_3m: real_plays_3m,
                plays_last_12m: real_plays_12m,
                playlist_adds: total_playlists,
                // SFA Status
                has_sfa_url: hasSfaUrl,
                last_scraped_at: lastScrapedDate ? new Date(lastScrapedDate).toISOString() : null,
                sfa_status: !hasSfaUrl ? 'no_url' : (hoursSinceLastScrape < 48 ? 'active' : 'stale'),
                hours_since_scrape: hoursSinceLastScrape,
                progress_percentage,
                invoice_status: group.invoice_status || 'not_invoiced',
                performance_status: 'pending',
                salesperson: group.salesperson || '',
                music_genres: [],
                territory_preferences: [],
                content_types: [],
                selected_playlists: null,
                vendor_allocations: null,
                totals: null,
                algorithm_recommendations: null,
                songs: songs || []
              };
        })
      );
      
      return enhancedCampaigns;
    }
  });

  // Mutations for campaign actions
  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Campaign> }) => {
      const { data, error } = await supabase
        .from('campaign_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaign_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been successfully removed.",
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (campaignIds: string[]) => {
      console.log('🗑️ Attempting to delete campaigns:', campaignIds.length, 'campaigns');
      
      // Process in batches of 50 to avoid URL length limits
      const BATCH_SIZE = 50;
      let totalDeleted = 0;
      let totalErrors = 0;
      
      for (let i = 0; i < campaignIds.length; i += BATCH_SIZE) {
        const batch = campaignIds.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(campaignIds.length / BATCH_SIZE)} (${batch.length} items)`);
        
        // First, delete associated spotify_campaigns (songs) that reference these campaign_groups
        const { error: songsError } = await supabase
          .from('spotify_campaigns')
          .delete()
          .in('campaign_group_id', batch);
        
        if (songsError) {
          console.error(`❌ Error deleting spotify_campaigns in batch ${i / BATCH_SIZE + 1}:`, songsError);
          // Continue anyway
        }
        
        // Now delete the campaign_groups
        const { error } = await supabase
          .from('campaign_groups')
          .delete()
          .in('id', batch);

        if (error) {
          console.error(`❌ Error deleting campaign_groups in batch ${i / BATCH_SIZE + 1}:`, error);
          totalErrors += batch.length;
        } else {
          totalDeleted += batch.length;
        }
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < campaignIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Bulk delete complete: ${totalDeleted} deleted, ${totalErrors} errors`);
      
      if (totalErrors > 0 && totalDeleted === 0) {
        throw new Error(`Failed to delete any campaigns (${totalErrors} errors)`);
      }
      
      return { deleted: totalDeleted, errors: totalErrors };
    },
    onSuccess: (result, campaignIds) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectedCampaigns(new Set());
      toast({
        title: "Campaigns Deleted",
        description: `${result.deleted} campaigns removed${result.errors > 0 ? ` (${result.errors} failed)` : ''}.`,
      });
    },
    onError: (error: any) => {
      console.error('❌ Bulk delete failed:', error);
      toast({
        title: "Delete Failed",
        description: error?.message || "Failed to delete campaigns. Check console for details.",
        variant: "destructive",
      });
    }
  });

  // Helper functions for status determination (must be defined before sorting/filtering)
  const getSFAStatus = (campaign: Campaign): 'active' | 'stale' | 'no_url' | 'connected' | 'no_access' | 'pending' => {
    // NEW: Use actual scraper status if available
    if (campaign.sfa_status) {
      return campaign.sfa_status;
    }
    
    // LEGACY: Check if campaign has valid playlists with Spotify URLs that can be monitored
    if (!campaign.selected_playlists || Array.isArray(campaign.selected_playlists) && campaign.selected_playlists.length === 0) {
      return 'no_access';
    }
    
    // For now, assume campaigns with playlists have SFA access
    const hasSpotifyUrls = Array.isArray(campaign.selected_playlists) && campaign.selected_playlists.length > 0;
    return hasSpotifyUrls ? 'connected' : 'pending';
  };

  const getPlaylistStatus = (campaign: Campaign): 'has_playlists' | 'no_playlists' | 'pending' => {
    try {
      // Handle null, undefined, or falsy values
      if (!campaign.selected_playlists) return 'no_playlists';
      
      // Handle array format
      if (Array.isArray(campaign.selected_playlists)) {
        return campaign.selected_playlists.length > 0 ? 'has_playlists' : 'no_playlists';
      }
      
      // Handle object format (ensure it's actually an object)
      if (typeof campaign.selected_playlists === 'object' && campaign.selected_playlists !== null) {
        return Object.keys(campaign.selected_playlists).length > 0 ? 'has_playlists' : 'no_playlists';
      }
      
      // Handle string format (might be JSON string)
      if (typeof campaign.selected_playlists === 'string') {
        try {
          const parsed = JSON.parse(campaign.selected_playlists);
          if (Array.isArray(parsed)) {
            return parsed.length > 0 ? 'has_playlists' : 'no_playlists';
          }
          if (typeof parsed === 'object' && parsed !== null) {
            return Object.keys(parsed).length > 0 ? 'has_playlists' : 'no_playlists';
          }
        } catch {
          // If JSON parse fails, treat as single playlist
          return campaign.selected_playlists.length > 0 ? 'has_playlists' : 'no_playlists';
        }
      }
      
      // Default fallback
      return 'no_playlists';
    } catch (error) {
      console.error('Error in getPlaylistStatus:', error, campaign);
      return 'no_playlists';
    }
  };

  const getEnhancedPerformanceStatus = (campaign: Campaign): 'underperforming' | 'on_track' | 'overperforming' | 'pending' => {
    // Case-insensitive status check
    const campaignStatus = (campaign.status || '').toLowerCase();
    if (campaignStatus !== 'active') return 'pending';
    if (!campaign.start_date) return 'pending';
    
    const startDate = new Date(campaign.start_date);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysElapsed <= 0) return 'pending';
    
    const streamGoal = campaign.stream_goal || 0;
    const remainingStreams = campaign.remaining_streams || 0;
    if (streamGoal === 0) return 'pending';
    
    const streamsCompleted = streamGoal - remainingStreams;
    const progressPercent = (streamsCompleted / streamGoal) * 100;
    const expectedProgressPercent = (daysElapsed / (campaign.duration_days || 90)) * 100;
    const performanceRatio = progressPercent / Math.max(expectedProgressPercent, 1);
    
    if (performanceRatio >= 1.2) return 'overperforming';
    if (performanceRatio >= 0.8) return 'on_track';
    return 'underperforming';
  };

  // Status aliases for filtering
  const statusAliases: Record<string, string[]> = {
    pending: ['pending', 'pending_approval', 'draft', 'new'],
    ready: ['ready', 'approved'],
    active: ['active', 'in_progress', 'running'],
    on_hold: ['on_hold', 'paused', 'rejected', 'cancelled'],
    complete: ['complete', 'completed', 'done', 'finished'],
  };

  // Sort and filter campaigns
  const sortedAndFilteredCampaigns = (() => {
    let filtered = campaigns?.filter(campaign => {
      const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.salesperson?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status matching with aliases
      let matchesStatus = false;
      if (statusFilter === "all") {
        matchesStatus = true;
      } else {
        const campaignStatus = (campaign.status || '').toLowerCase().trim();
        const targetStatuses = statusAliases[statusFilter.toLowerCase()] || [statusFilter.toLowerCase()];
        matchesStatus = targetStatuses.includes(campaignStatus);
      }
      
      // SFA Status filtering
      const matchesSFA = sfaFilter === "all" || getSFAStatus(campaign) === sfaFilter;
      
      // Playlist Status filtering
      const matchesPlaylist = playlistFilter === "all" || getPlaylistStatus(campaign) === playlistFilter;
      
      // Enhanced Performance filtering
      const matchesEnhancedPerformance = enhancedPerformanceFilter === "all" || 
                                       getEnhancedPerformanceStatus(campaign) === enhancedPerformanceFilter;
      
      // Legacy Performance filtering (keeping for backward compatibility)
      let matchesPerformance = true;
      const legacyCampaignStatus = (campaign.status || '').toLowerCase();
      if (performanceFilter !== "all" && legacyCampaignStatus === 'active') {
        if (!campaign.start_date || !campaign.stream_goal) {
          matchesPerformance = performanceFilter === 'all';
        } else {
          const startDate = new Date(campaign.start_date);
          const today = new Date();
          const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const streamGoal = campaign.stream_goal || 1;
          const remainingStreams = campaign.remaining_streams || 0;
          const streamsCompleted = streamGoal - remainingStreams;
          const progressPercent = (streamsCompleted / streamGoal) * 100;
          const expectedProgressPercent = (daysElapsed / 90) * 100;
          const performanceRatio = progressPercent / Math.max(expectedProgressPercent, 1);
          
          if (performanceFilter === 'high' && performanceRatio < 1.2) matchesPerformance = false;
          if (performanceFilter === 'on-track' && (performanceRatio < 0.8 || performanceRatio >= 1.2)) matchesPerformance = false;
          if (performanceFilter === 'under-performing' && performanceRatio >= 0.8) matchesPerformance = false;
        }
      } else if (performanceFilter !== "all" && legacyCampaignStatus !== 'active') {
        matchesPerformance = false; // Only active campaigns can have performance metrics
      }
      
      return matchesSearch && matchesStatus && matchesSFA && matchesPlaylist && 
             matchesEnhancedPerformance && matchesPerformance;
    }) || [];

    // Sort campaigns
    return filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle special cases
      if (sortField === 'progress') {
        aValue = a.progress_percentage || 0;
        bValue = b.progress_percentage || 0;
      } else if (sortField === 'remaining_streams') {
        aValue = a.remaining_streams || 0;
        bValue = b.remaining_streams || 0;
      } else if (sortField === 'start_date') {
        aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
        bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
      } else if (sortField === 'schedule_status') {
        // Sort by behind first (worst), then on_track, then ahead (best)
        const statusOrder = { 'behind': 0, 'on_track': 1, 'ahead': 2, 'not_started': 3, 'completed': 4 };
        aValue = statusOrder[calculateScheduleStatus(a).status] || 0;
        bValue = statusOrder[calculateScheduleStatus(b).status] || 0;
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = 0;
      if (bValue === null || bValue === undefined) bValue = 0;

      // Convert to comparable types
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  })();

  // Helper function for status counts (with null safety and case-insensitive matching)
  const getStatusCount = (status: string) => {
    if (!campaigns || !Array.isArray(campaigns)) return 0;
    if (status === 'all') return campaigns.length;
    
    // Map common status variations to match database values
    const statusAliases: Record<string, string[]> = {
      pending: ['pending', 'pending_approval', 'draft', 'new'],
      ready: ['ready', 'approved'],
      active: ['active', 'in_progress', 'running'],
      on_hold: ['on_hold', 'paused', 'rejected', 'cancelled'],
      complete: ['complete', 'completed', 'done', 'finished'],
    };
    
    const targetStatuses = statusAliases[status.toLowerCase()] || [status.toLowerCase()];
    
    return campaigns.filter(c => {
      const campaignStatus = (c.status || '').toLowerCase().trim();
      return targetStatuses.includes(campaignStatus);
    }).length;
  };

  const getSFACount = (status: string) => {
    if (!campaigns || !Array.isArray(campaigns)) return 0;
    if (status === 'all') return campaigns.length;
    return campaigns.filter(c => getSFAStatus(c) === status).length;
  };

  const getPlaylistCount = (status: string) => {
    if (!campaigns || !Array.isArray(campaigns)) return 0;
    if (status === 'all') return campaigns.length;
    return campaigns.filter(c => getPlaylistStatus(c) === status).length;
  };

  const getEnhancedPerformanceCount = (status: string) => {
    if (!campaigns || !Array.isArray(campaigns)) return 0;
    // Case-insensitive check for active campaigns
    if (status === 'all') return campaigns.filter(c => 
      (c.status || '').toLowerCase() === 'active'
    ).length;
    return campaigns.filter(c => getEnhancedPerformanceStatus(c) === status).length;
  };

  const handleStatusChange = (campaignId: string, newStatus: Campaign['status']) => {
    updateCampaignMutation.mutate({
      id: campaignId,
      updates: { status: newStatus }
    });

    toast({
      title: "Status Updated",
      description: `Campaign status changed to ${newStatus}.`,
    });

    notifyOpsStatusChange({
      service: "spotify",
      campaignId,
      status: newStatus,
      actorEmail: user?.email || null,
    });
    notifySlack("spotify", "campaign_status_change", {
      campaignId,
      status: newStatus,
      actorEmail: user?.email || null,
    });
  };

  const handleDelete = (campaignId: string) => {
    if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      deleteCampaignMutation.mutate(campaignId, {
        onSuccess: () => {
          setDetailsModal({ open: false });
          setSelectedCampaigns(prev => {
            const updated = new Set(prev);
            updated.delete(campaignId);
            return updated;
          });
        }
      });
    }
  };

  const handleViewDetails = (campaignId: string) => {
    const campaign = campaigns?.find(c => c.id === campaignId);
    setDetailsModal({ open: true, campaign });
  };

  const handleEditCampaign = (campaignId: string) => {
    const campaign = campaigns?.find(c => c.id === campaignId);
    setEditModal({ open: true, campaign });
  };

  const handleRowClick = (campaignId: string, event: React.MouseEvent) => {
    // Don't trigger row click if clicking on action buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    handleViewDetails(campaignId);
  };

  const exportCampaigns = async () => {
    try {
      if (!campaigns || campaigns.length === 0) return;
      
      // Export all songs/tracks from all campaigns (more detailed data)
      const csvData: any[] = [];
      
      campaigns.forEach(campaign => {
        const songs = (campaign as any).songs || [];
        
        if (songs.length === 0) {
          // Campaign has no songs - export just the campaign group info
          csvData.push({
            'Campaign Name': campaign.name,
            'Artist': campaign.artist_name || '',
            'Track': '',
            'Client': campaign.client_name || '',
            'Status': campaign.status,
            'Budget': campaign.budget || '',
            'Sale Price': '',
            'Stream Goal': campaign.stream_goal || '',
            'Remaining': campaign.remaining_streams || '',
            'Daily Streams': campaign.daily_streams || '',
            'Weekly Streams': campaign.weekly_streams || '',
            'SFA Link': '',
            'Track URL': campaign.track_url || '',
            'Vendor': '',
            'Start Date': campaign.start_date || '',
            'Invoice Status': campaign.invoice_status || 'not_invoiced',
            'Salesperson': campaign.salesperson || '',
            'Playlists': '',
            'Notes': '',
            'Last Scraped': campaign.last_scraped_at ? new Date(campaign.last_scraped_at).toLocaleString() : 'Never',
          });
        } else {
          // Export each song with full detail
          songs.forEach((song: any) => {
            csvData.push({
              'Campaign Name': song.campaign || campaign.name,
              'Artist': campaign.artist_name || '',
              'Track': song.track_name || '',
              'Client': song.client || campaign.client_name || '',
              'Status': song.status || campaign.status,
              'Budget': campaign.budget || '',
              'Sale Price': song.sale_price || '',
              'Stream Goal': song.goal || campaign.stream_goal || '',
              'Remaining': song.remaining || '',
              'Daily Streams': song.daily || '',
              'Weekly Streams': song.weekly || '',
              'SFA Link': song.sfa || '',
              'Track URL': song.url || '',
              'Vendor': song.vendor || '',
              'Start Date': song.start_date || campaign.start_date || '',
              'Invoice Status': song.invoice || campaign.invoice_status || '',
              'Salesperson': song.salesperson || campaign.salesperson || '',
              'Playlists': song.playlists || '',
              'Notes': song.notes || '',
              'Last Scraped': song.last_scraped_at ? new Date(song.last_scraped_at).toLocaleString() : 'Never',
            });
          });
        }
      });
      
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spotify_campaigns_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Exported ${csvData.length} campaign records`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export campaigns",
        variant: "destructive",
      });
    }
  };

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    setSelectedCampaigns(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(campaignId);
      } else {
        newSet.delete(campaignId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(new Set(sortedAndFilteredCampaigns.map(c => c.id)));
    } else {
      setSelectedCampaigns(new Set());
    }
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
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const handleBulkDelete = () => {
    if (selectedCampaigns.size === 0) {
      console.log('⚠️ No campaigns selected for deletion');
      return;
    }
    
    console.log(`🗑️ Delete requested for ${selectedCampaigns.size} campaigns`);
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedCampaigns.size} campaigns? This action cannot be undone.`);
    
    if (confirmed) {
      console.log('✅ User confirmed deletion, starting...');
      bulkDeleteMutation.mutate(Array.from(selectedCampaigns));
    } else {
      console.log('❌ User cancelled deletion');
    }
  };

  const getStatusVariant = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'complete': return 'secondary';
      case 'on_hold': return 'destructive';
      case 'pending': return 'outline';
      case 'ready': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'text-accent';
      case 'complete': return 'text-muted-foreground';
      case 'on_hold': return 'text-destructive';
      case 'pending': return 'text-muted-foreground';
      case 'ready': return 'text-blue-400';
      default: return 'text-muted-foreground';
    }
  };

  // Calculate campaign performance and return color class
  const getCampaignPerformanceColor = (campaign: Campaign) => {
    if (campaign.status !== 'active') return '';
    
    const startDate = new Date(campaign.start_date);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const streamsCompleted = campaign.stream_goal - campaign.remaining_streams;
    const progressPercent = (streamsCompleted / campaign.stream_goal) * 100;
    
    // Expected progress based on 90-day duration
    const expectedProgressPercent = (daysElapsed / 90) * 100;
    const performanceRatio = progressPercent / Math.max(expectedProgressPercent, 1);
    
    if (performanceRatio >= 1.2) return 'bg-accent/10 border-accent/30'; // High performer
    if (performanceRatio >= 0.8) return 'bg-primary/10 border-primary/30'; // On track
    return 'bg-destructive/10 border-destructive/30'; // Under performing
  };

  const getCampaignPerformanceStatus = (campaign: Campaign) => {
    if (campaign.status !== 'active') return null;
    
    const startDate = new Date(campaign.start_date);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const streamsCompleted = campaign.stream_goal - campaign.remaining_streams;
    const progressPercent = (streamsCompleted / campaign.stream_goal) * 100;
    
    // Expected progress based on 90-day duration
    const expectedProgressPercent = (daysElapsed / 90) * 100;
    const performanceRatio = progressPercent / Math.max(expectedProgressPercent, 1);
    
    if (performanceRatio >= 1.2) return { label: 'High Performer', color: 'text-accent' };
    if (performanceRatio >= 0.8) return { label: 'On Track', color: 'text-purple' };
    return { label: 'Under Performing', color: 'text-destructive' };
  };

  // Helper function to get invoice status badge
  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig = {
      'not_invoiced': { label: 'Not Invoiced', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', icon: FileText },
      'pending': { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', icon: Clock },
      'sent': { label: 'Sent', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Receipt },
      'paid': { label: 'Paid', color: 'bg-green-500/10 text-green-400 border-green-500/30', icon: CheckCircle },
      'overdue': { label: 'Overdue', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: AlertTriangle },
    };
    
    const config = statusConfig[status] || statusConfig['not_invoiced'];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Helper function to get performance status badge
  const getPerformanceStatusBadge = (campaign: Campaign) => {
    if (campaign.status !== 'active') {
      return <Badge variant="outline" className="text-muted-foreground">N/A</Badge>;
    }
    
    const performance = getCampaignPerformanceStatus(campaign);
    if (!performance) {
      return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
    }
    
    const colorClass = performance.color === 'text-accent' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                      performance.color === 'text-purple' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                      'bg-red-500/10 text-red-400 border-red-500/30';
    
    return (
      <Badge className={`${colorClass} border`}>
        {performance.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-4">
        <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
          CAMPAIGN HISTORY
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage all your Spotify playlisting campaigns
        </p>
      </section>

      <div className="container mx-auto px-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="campaigns">Campaign History</TabsTrigger>
            <TabsTrigger value="submissions">Campaign Submissions</TabsTrigger>
            <TabsTrigger value="payouts">Vendor Payouts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="campaigns" className="space-y-6">
            {/* Compact Filter Bar */}
            <div className="border border-border rounded-lg p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[400px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                {/* Unified Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={`${statusFilter}|${sfaFilter}|${enhancedPerformanceFilter}`} onValueChange={(value) => {
                    const [status, sfa, perf] = value.split('|');
                    setStatusFilter(status);
                    setSfaFilter(sfa);
                    setPlaylistFilter('all');
                    setEnhancedPerformanceFilter(perf);
                  }}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Filter campaigns..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* All */}
                      <SelectItem value="all|all|all">
                        All Campaigns ({getStatusCount('all')})
                      </SelectItem>
                      
                      {/* By Status */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Status</div>
                      <SelectItem value="pending|all|all">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          Pending ({getStatusCount('pending')})
                        </span>
                      </SelectItem>
                      <SelectItem value="ready|all|all">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Ready ({getStatusCount('ready')})
                        </span>
                      </SelectItem>
                      <SelectItem value="active|all|all">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Active ({getStatusCount('active')})
                        </span>
                      </SelectItem>
                      <SelectItem value="on_hold|all|all">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          On Hold ({getStatusCount('on_hold')})
                        </span>
                      </SelectItem>
                      <SelectItem value="complete|all|all">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Complete ({getStatusCount('complete')})
                        </span>
                      </SelectItem>

                      {/* By SFA Status */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">SFA Link</div>
                      <SelectItem value="all|active|all">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          Has SFA Link ({getSFACount('active') + getSFACount('stale') + getSFACount('connected')})
                        </span>
                      </SelectItem>
                      <SelectItem value="all|no_url|all">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          No SFA Link ({getSFACount('no_url') + getSFACount('no_access')})
                        </span>
                      </SelectItem>

                      {/* By Schedule/Performance */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Schedule</div>
                      <SelectItem value="active|all|overperforming">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          Ahead of Schedule ({getEnhancedPerformanceCount('overperforming')})
                        </span>
                      </SelectItem>
                      <SelectItem value="active|all|on_track">
                        <span className="flex items-center gap-2">
                          <Activity className="w-3 h-3 text-blue-500" />
                          On Track ({getEnhancedPerformanceCount('on_track')})
                        </span>
                      </SelectItem>
                      <SelectItem value="active|all|underperforming">
                        <span className="flex items-center gap-2">
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          Behind Schedule ({getEnhancedPerformanceCount('underperforming')})
                        </span>
                      </SelectItem>

                      {/* By Invoice Status */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Invoice</div>
                      <SelectItem value="all|all|all" disabled>
                        <span className="flex items-center gap-2">
                          <Receipt className="w-3 h-3 text-green-500" />
                          Invoiced (coming soon)
                        </span>
                      </SelectItem>
                      <SelectItem value="all|all|all" disabled>
                        <span className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-orange-500" />
                          Not Invoiced (coming soon)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Filter Badges */}
                {(statusFilter !== 'all' || sfaFilter !== 'all' || enhancedPerformanceFilter !== 'all' || searchTerm) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Status: {statusFilter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
                      </Badge>
                    )}
                    {sfaFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        SFA: {sfaFilter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setSfaFilter('all')} />
                      </Badge>
                    )}
                    {enhancedPerformanceFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        Schedule: {enhancedPerformanceFilter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setEnhancedPerformanceFilter('all')} />
                      </Badge>
                    )}
                  </div>
                )}

                {/* Clear All */}
                {(statusFilter !== 'all' || sfaFilter !== 'all' || enhancedPerformanceFilter !== 'all' || searchTerm) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all');
                      setSfaFilter('all');
                      setPlaylistFilter('all');
                      setEnhancedPerformanceFilter('all');
                      setSearchTerm('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 items-center justify-end mb-4">
                {selectedCampaigns.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedCampaigns.size})
                  </Button>
                )}
                <Button
                  onClick={exportCampaigns}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
                <Button
                  onClick={() => setImportModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import Campaigns
                </Button>
                <Button
                  onClick={() => router.push('/spotify/campaign/new')}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </Button>
              </div>

            {/* Campaigns Table */}
            {isLoading ? (
              <div className="py-10 space-y-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
                    <Music className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">Loading campaigns...</div>
                </div>
                <div className="space-y-3 px-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-muted/60" style={{ animationDelay: `${i * 120}ms` }}>
                      <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${65 - i * 8}%`, animationDelay: `${i * 100}ms` }} />
                        <div className="h-3 rounded bg-muted/60 animate-pulse" style={{ width: `${40 - i * 5}%`, animationDelay: `${i * 150}ms` }} />
                      </div>
                      <div className="h-6 w-16 rounded-full bg-muted animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                      <div className="h-2 w-24 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 130}ms` }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : sortedAndFilteredCampaigns && sortedAndFilteredCampaigns.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCampaigns.size === sortedAndFilteredCampaigns.length && sortedAndFilteredCampaigns.length > 0}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          aria-label="Select all campaigns"
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Campaign
                          {getSortIcon('name')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('client')}
                      >
                        <div className="flex items-center">
                          Client
                          {getSortIcon('client')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('daily_streams')}
                      >
                        <div className="flex items-center">
                          24h Streams
                          {getSortIcon('daily_streams')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('weekly_streams')}
                      >
                        <div className="flex items-center">
                          7d Streams
                          {getSortIcon('weekly_streams')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('remaining_streams')}
                      >
                        <div className="flex items-center">
                          Remaining
                          {getSortIcon('remaining_streams')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('progress')}
                      >
                        <div className="flex items-center">
                          Progress
                          {getSortIcon('progress')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('start_date')}
                      >
                        <div className="flex items-center">
                          Start Date
                          {getSortIcon('start_date')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('schedule_status')}
                      >
                        <div className="flex items-center">
                          Schedule
                          {getSortIcon('schedule_status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('invoice_status')}
                      >
                        <div className="flex items-center">
                          Invoice
                          {getSortIcon('invoice_status')}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredCampaigns.map((campaign) => {
                      const isHighlighted = highlightCampaignId === campaign.id;
                      return (
                        <TableRow 
                          key={campaign.id}
                          className={`hover:bg-muted/50 cursor-pointer transition-colors ${
                            isHighlighted 
                              ? 'ring-2 ring-primary bg-primary/5' 
                              : ''
                          } ${getCampaignPerformanceColor(campaign)}${
                            selectedCampaigns.has(campaign.id) ? ' bg-muted/30' : ''
                          }`}
                          onClick={(e) => handleRowClick(campaign.id, e)}
                        >
                          <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedCampaigns.has(campaign.id)}
                              onCheckedChange={(checked) => handleSelectCampaign(campaign.id, !!checked)}
                              aria-label={`Select campaign ${campaign.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{campaign.artist_name || campaign.name}</span>
                                {/* SFA Status Badge with Tooltip */}
                                <TooltipProvider>
                                  {campaign.sfa_status === 'active' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-green-500/10 text-green-400 border-green-500/30 border text-xs px-1.5 py-0 cursor-help">
                                          <CheckCircle className="w-3 h-3 mr-0.5" />
                                          SFA
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>✓ Active: Scraper updated within 48 hours</p>
                                        {campaign.last_scraped_at && (
                                          <p className="text-xs">Last scraped: {new Date(campaign.last_scraped_at).toLocaleString()}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {campaign.sfa_status === 'stale' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 border text-xs px-1.5 py-0 cursor-help">
                                          <Clock className="w-3 h-3 mr-0.5" />
                                          SFA
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>⚠ Stale: Not scraped in over 48 hours</p>
                                        {campaign.last_scraped_at && (
                                          <p className="text-xs">Last scraped: {new Date(campaign.last_scraped_at).toLocaleString()}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {campaign.sfa_status === 'no_url' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/30 border text-xs px-1.5 py-0 cursor-help">
                                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                                          No SFA
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>✗ No SFA URL configured</p>
                                        <p className="text-xs">Add SFA URL to enable scraping</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </TooltipProvider>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {campaign.name}
                              </div>
                              {campaign.salesperson && (
                                <div className="text-xs text-muted-foreground">
                                  by {campaign.salesperson}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                Budget: ${campaign.budget?.toLocaleString()} | Goal: {campaign.stream_goal?.toLocaleString()}
                                {campaign.last_scraped_at && campaign.sfa_status === 'active' && (
                                  <span className="ml-2 text-green-400">
                                    • Updated {Math.floor(campaign.hours_since_scrape || 0)}h ago
                                  </span>
                                )}
                                {campaign.sfa_status === 'stale' && campaign.hours_since_scrape && (
                                  <span className="ml-2 text-yellow-400">
                                    • Last scraped {Math.floor(campaign.hours_since_scrape)}h ago
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{campaign.client_name || campaign.client}</div>
                          </TableCell>
                          <TableCell>
                            <InteractiveStatusBadge 
                              status={campaign.status}
                              onStatusChange={(newStatus) => handleStatusChange(campaign.id, newStatus as Campaign['status'])}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-semibold text-sm">
                                  {campaign.streams_24h !== undefined && campaign.streams_24h !== null 
                                    ? campaign.streams_24h.toLocaleString() 
                                    : campaign.daily_streams?.toLocaleString() || '0'}
                                </span>
                                {campaign.streams_24h_trend !== undefined && campaign.streams_24h_trend !== 0 && (
                                  <span className={`text-xs ${campaign.streams_24h_trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {campaign.streams_24h_trend > 0 ? '↑' : '↓'}{Math.abs(campaign.streams_24h_trend).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {campaign.streams_24h !== undefined && campaign.streams_24h !== null ? 'scraped' : 'estimated'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-semibold text-sm">
                                  {campaign.streams_7d !== undefined && campaign.streams_7d !== null 
                                    ? campaign.streams_7d.toLocaleString() 
                                    : campaign.weekly_streams?.toLocaleString() || '0'}
                                </span>
                                {campaign.streams_7d_trend !== undefined && campaign.streams_7d_trend !== 0 && (
                                  <span className={`text-xs ${campaign.streams_7d_trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {campaign.streams_7d_trend > 0 ? '↑' : '↓'}{Math.abs(campaign.streams_7d_trend).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {campaign.streams_7d !== undefined && campaign.streams_7d !== null ? 'scraped' : 'estimated'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-semibold text-sm">
                                {campaign.remaining_streams?.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">remaining</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const pct = Math.round(campaign.progress_percentage || 0);
                              const delivered = campaign.stream_goal - (campaign.remaining_streams || campaign.stream_goal);
                              const barColor = pct >= 100
                                ? 'bg-emerald-500'
                                : pct >= 75
                                  ? 'bg-blue-500'
                                  : pct >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-red-500';
                              return (
                                <div className="space-y-1.5 min-w-[130px]">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-semibold tabular-nums">{pct}%</span>
                                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                      {delivered.toLocaleString()}&nbsp;/&nbsp;{campaign.stream_goal.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                                    <div
                                      className={`h-full rounded-full transition-all ${barColor}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {campaign.start_date ? (
                                <div className="font-medium">
                                  {new Date(campaign.start_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not set</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const scheduleInfo = calculateScheduleStatus(campaign);
                              
                              const getStatusConfig = () => {
                                switch (scheduleInfo.status) {
                                  case 'ahead':
                                    return {
                                      icon: <TrendingUp className="h-3.5 w-3.5" />,
                                      label: 'Ahead',
                                      badgeClass: 'bg-green-500/10 text-green-400 border-green-500/30',
                                      description: `+${scheduleInfo.progressDiff}% ahead of schedule`
                                    };
                                  case 'on_track':
                                    return {
                                      icon: <Minus className="h-3.5 w-3.5" />,
                                      label: 'On Track',
                                      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                                      description: 'Campaign is progressing as expected'
                                    };
                                  case 'behind':
                                    return {
                                      icon: <TrendingDown className="h-3.5 w-3.5" />,
                                      label: 'Behind',
                                      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
                                      description: `${Math.abs(scheduleInfo.progressDiff)}% behind schedule`
                                    };
                                  case 'completed':
                                    return {
                                      icon: <CheckCircle className="h-3.5 w-3.5" />,
                                      label: 'Complete',
                                      badgeClass: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
                                      description: 'Campaign goal reached'
                                    };
                                  default:
                                    return {
                                      icon: <Clock className="h-3.5 w-3.5" />,
                                      label: 'Pending',
                                      badgeClass: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
                                      description: 'Campaign has not started yet'
                                    };
                                }
                              };
                              
                              const config = getStatusConfig();
                              
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        className={`cursor-help flex items-center gap-1 border ${config.badgeClass}`}
                                      >
                                        {config.icon}
                                        {config.label}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <div className="space-y-1">
                                        <p className="font-medium">{config.description}</p>
                                        {scheduleInfo.status !== 'not_started' && scheduleInfo.status !== 'completed' && (
                                          <>
                                            <p className="text-xs">Expected: {scheduleInfo.expectedProgress}% | Actual: {scheduleInfo.actualProgress}%</p>
                                            <p className="text-xs">Day {scheduleInfo.daysElapsed} of {scheduleInfo.totalDays}</p>
                                            {scheduleInfo.dailyRequired > 0 && (
                                              <p className="text-xs">Need ~{scheduleInfo.dailyRequired.toLocaleString()} streams/day to stay on track</p>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {getInvoiceStatusBadge(campaign.invoice_status || 'not_invoiced')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No campaigns found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="submissions">
            <CampaignSubmissionsManager highlightSubmissionId={submissionId} />
          </TabsContent>
          
          <TabsContent value="payouts">
            <VendorPayoutManager />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {detailsModal.campaign && (
          <CampaignDetailsModal
            campaign={detailsModal.campaign as any}
            open={detailsModal.open}
            onClose={() => setDetailsModal({ open: false })}
          />
        )}

        {editModal.campaign && (
          <EditCampaignModal
            campaign={editModal.campaign as any}
            open={editModal.open}
            onClose={() => setEditModal({ open: false })}
            onSuccess={() => {
              setEditModal({ open: false });
              queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
            }}
          />
        )}

        {draftReviewModal.campaign && (
          <DraftCampaignReviewModal
            campaign={draftReviewModal.campaign as any}
            open={draftReviewModal.open}
            onOpenChange={(open) => setDraftReviewModal({ open })}
          />
        )}

        <CampaignImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
        />

        <CreateCampaignWizard
          open={createCampaignOpen}
          onOpenChange={setCreateCampaignOpen}
        />
      </div>
    </div>
  );
}










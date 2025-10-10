"use client"

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
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
import { Label } from "../components/ui/label";
import { AISearch } from "../components/AISearch";
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
import { CampaignSubmissionsManager } from "../components/CampaignSubmissionsManager";
import { VendorPayoutManager } from "../components/VendorPayoutManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

interface Campaign {
  id: string;
  name: string;
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
  sfa_status?: 'connected' | 'no_access' | 'pending';
  playlist_status?: 'has_playlists' | 'no_playlists' | 'pending';
}

type SortField = 'name' | 'client' | 'budget' | 'stream_goal' | 'daily_streams' | 'weekly_streams' | 'remaining_streams' | 'start_date' | 'progress' | 'status' | 'invoice_status' | 'performance_status';
type SortDirection = 'asc' | 'desc';

export default function CampaignHistory() {
  const [searchParams] = useSearchParams();
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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('start_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns with enhanced data - Support both campaign sources
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns-enhanced'],
    queryFn: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .in('source', [APP_CAMPAIGN_SOURCE, APP_CAMPAIGN_SOURCE_INTAKE, 'campaign_manager']) // Support all known sources
        .eq('campaign_type', APP_CAMPAIGN_TYPE)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Enhance campaigns with calculated fields
      const enhancedCampaigns = (data || []).map(campaign => {
        const streamsCompleted = campaign.stream_goal - (campaign.remaining_streams || campaign.stream_goal);
        const progressPercentage = Math.round((streamsCompleted / campaign.stream_goal) * 100);
        
        return {
          ...campaign,
          progress_percentage: progressPercentage,
          daily_streams: campaign.daily_streams || 0,
          weekly_streams: campaign.weekly_streams || 0,
          remaining_streams: campaign.remaining_streams || campaign.stream_goal,
          // These will be calculated by the database functions we created
          invoice_status: 'not_invoiced', // Will be replaced by actual query later
          performance_status: 'pending' // Will be replaced by actual query later
        };
      });
      
      return enhancedCampaigns;
    }
  });

  // Mutations for campaign actions
  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Campaign> }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .eq('source', APP_CAMPAIGN_SOURCE)
        .eq('campaign_type', APP_CAMPAIGN_TYPE)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('source', APP_CAMPAIGN_SOURCE)
        .eq('campaign_type', APP_CAMPAIGN_TYPE);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been successfully removed.",
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (campaignIds: string[]) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .in('id', campaignIds)
        .eq('source', APP_CAMPAIGN_SOURCE)
        .eq('campaign_type', APP_CAMPAIGN_TYPE);

      if (error) throw error;
    },
    onSuccess: (_, campaignIds) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSelectedCampaigns(new Set());
      toast({
        title: "Campaigns Deleted",
        description: `${campaignIds.length} campaigns have been successfully removed.`,
      });
    }
  });

  // Sort and filter campaigns
  const sortedAndFilteredCampaigns = (() => {
    let filtered = campaigns?.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
                           campaign.status.toLowerCase() === statusFilter.toLowerCase();
      
      // SFA Status filtering
      const matchesSFA = sfaFilter === "all" || getSFAStatus(campaign) === sfaFilter;
      
      // Playlist Status filtering
      const matchesPlaylist = playlistFilter === "all" || getPlaylistStatus(campaign) === playlistFilter;
      
      // Enhanced Performance filtering
      const matchesEnhancedPerformance = enhancedPerformanceFilter === "all" || 
                                       getEnhancedPerformanceStatus(campaign) === enhancedPerformanceFilter;
      
      // Legacy Performance filtering (keeping for backward compatibility)
      let matchesPerformance = true;
      if (performanceFilter !== "all" && campaign.status === 'active') {
        const startDate = new Date(campaign.start_date);
        const today = new Date();
        const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const streamsCompleted = campaign.stream_goal - campaign.remaining_streams;
        const progressPercent = (streamsCompleted / campaign.stream_goal) * 100;
        const expectedProgressPercent = (daysElapsed / 90) * 100;
        const performanceRatio = progressPercent / Math.max(expectedProgressPercent, 1);
        
        if (performanceFilter === 'high' && performanceRatio < 1.2) matchesPerformance = false;
        if (performanceFilter === 'on-track' && (performanceRatio < 0.8 || performanceRatio >= 1.2)) matchesPerformance = false;
        if (performanceFilter === 'under-performing' && performanceRatio >= 0.8) matchesPerformance = false;
      } else if (performanceFilter !== "all" && campaign.status !== 'active') {
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

  // Helper functions for status determination
  const getSFAStatus = (campaign: Campaign): 'connected' | 'no_access' | 'pending' => {
    // Check if campaign has valid playlists with Spotify URLs that can be monitored
    if (!campaign.selected_playlists || Array.isArray(campaign.selected_playlists) && campaign.selected_playlists.length === 0) {
      return 'no_access';
    }
    
    // For now, assume campaigns with playlists have SFA access
    // This will be enhanced when Spotify for Artists integration is added
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
    if (campaign.status !== 'active') return 'pending';
    
    const startDate = new Date(campaign.start_date);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysElapsed <= 0) return 'pending';
    
    const streamsCompleted = campaign.stream_goal - campaign.remaining_streams;
    const progressPercent = (streamsCompleted / campaign.stream_goal) * 100;
    const expectedProgressPercent = (daysElapsed / campaign.duration_days) * 100;
    const performanceRatio = progressPercent / Math.max(expectedProgressPercent, 1);
    
    if (performanceRatio >= 1.2) return 'overperforming';
    if (performanceRatio >= 0.8) return 'on_track';
    return 'underperforming';
  };

  // Helper function for status counts
  const getStatusCount = (status: string) => {
    if (status === 'all') return campaigns?.length || 0;
    return campaigns?.filter(c => 
      c.status.toLowerCase() === status.toLowerCase()
    ).length || 0;
  };

  const getSFACount = (status: string) => {
    if (status === 'all') return campaigns?.length || 0;
    return campaigns?.filter(c => getSFAStatus(c) === status).length || 0;
  };

  const getPlaylistCount = (status: string) => {
    if (status === 'all') return campaigns?.length || 0;
    return campaigns?.filter(c => getPlaylistStatus(c) === status).length || 0;
  };

  const getEnhancedPerformanceCount = (status: string) => {
    if (status === 'all') return campaigns?.filter(c => c.status === 'active').length || 0;
    return campaigns?.filter(c => getEnhancedPerformanceStatus(c) === status).length || 0;
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
  };

  const handleDelete = (campaignId: string) => {
    if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      deleteCampaignMutation.mutate(campaignId);
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
      
      const csvData = campaigns.map(campaign => ({
        'Campaign Name': campaign.name,
        'Client': campaign.client_name || '',
        'Status': campaign.status,
        'Budget': campaign.budget,
        'Stream Goal': campaign.stream_goal,
        'Daily Streams': campaign.daily_streams || 0,
        'Weekly Streams': campaign.weekly_streams || 0,
        'Remaining Streams': campaign.remaining_streams || campaign.stream_goal,
        'Progress': `${campaign.progress_percentage || 0}%`,
        'Invoice Status': campaign.invoice_status || 'not_invoiced',
        'Performance': campaign.performance_status || 'pending',
        'Start Date': campaign.start_date,
        'Playlists': campaign.playlists?.map(p => 
          typeof p === 'string' ? p : p.name
        ).join(', ') || ''
      }));
      
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaigns_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Campaigns exported successfully",
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
    if (selectedCampaigns.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedCampaigns.size} campaigns? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedCampaigns));
    }
  };

  const getStatusVariant = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'paused': return 'outline';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active': return 'text-accent';
      case 'completed': return 'text-muted-foreground';
      case 'paused': return 'text-destructive';
      case 'draft': return 'text-muted-foreground';
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
      {/* AI Search Section */}
      <AISearch
        onCampaignSelect={(campaign) => {
          // Navigate to campaign details or highlight in table
          console.log('Selected campaign:', campaign);
        }}
      />

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
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ({getStatusCount('all')})</SelectItem>
                      <SelectItem value="active">Active ({getStatusCount('active')})</SelectItem>
                      <SelectItem value="draft">Pending ({getStatusCount('draft')})</SelectItem>
                      <SelectItem value="paused">Paused ({getStatusCount('paused')})</SelectItem>
                      <SelectItem value="completed">Completed ({getStatusCount('completed')})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SFA Status Filter */}
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <Select value={sfaFilter} onValueChange={setSfaFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="SFA Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All SFA ({getSFACount('all')})</SelectItem>
                      <SelectItem value="connected">Connected ({getSFACount('connected')})</SelectItem>
                      <SelectItem value="no_access">No Access ({getSFACount('no_access')})</SelectItem>
                      <SelectItem value="pending">Pending ({getSFACount('pending')})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Playlist Status Filter */}
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-muted-foreground" />
                  <Select value={playlistFilter} onValueChange={setPlaylistFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Playlists" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ({getPlaylistCount('all')})</SelectItem>
                      <SelectItem value="has_playlists">Has Playlists ({getPlaylistCount('has_playlists')})</SelectItem>
                      <SelectItem value="no_playlists">No Playlists ({getPlaylistCount('no_playlists')})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Performance Filter */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <Select value={enhancedPerformanceFilter} onValueChange={setEnhancedPerformanceFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Performance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Active ({getEnhancedPerformanceCount('all')})</SelectItem>
                      <SelectItem value="overperforming">Overperforming ({getEnhancedPerformanceCount('overperforming')})</SelectItem>
                      <SelectItem value="on_track">On Track ({getEnhancedPerformanceCount('on_track')})</SelectItem>
                      <SelectItem value="underperforming">Underperforming ({getEnhancedPerformanceCount('underperforming')})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setSfaFilter('all');
                    setPlaylistFilter('all');
                    setEnhancedPerformanceFilter('all');
                    setSearchTerm('');
                  }}
                  className="ml-auto"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
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
              </div>

            {/* Campaigns Table */}
            {isLoading ? (
              <div className="flex justify-center p-8">Loading campaigns...</div>
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
                          Daily Streams
                          {getSortIcon('daily_streams')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('weekly_streams')}
                      >
                        <div className="flex items-center">
                          Weekly Streams
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
                        onClick={() => handleSort('invoice_status')}
                      >
                        <div className="flex items-center">
                          Invoice
                          {getSortIcon('invoice_status')}
                        </div>
                      </TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Actions</TableHead>
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
                              <div className="font-medium">{campaign.name}</div>
                              {campaign.salesperson && (
                                <div className="text-xs text-muted-foreground">
                                  by {campaign.salesperson}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                Budget: ${campaign.budget?.toLocaleString()} | Goal: {campaign.stream_goal?.toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{campaign.client_name || campaign.client}</div>
                              <div className="text-xs text-muted-foreground">
                                Started: {new Date(campaign.start_date).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={campaign.status} />
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-semibold text-sm">
                                {campaign.daily_streams?.toLocaleString() || '0'}
                              </div>
                              <div className="text-xs text-muted-foreground">per day</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-semibold text-sm">
                                {campaign.weekly_streams?.toLocaleString() || '0'}
                              </div>
                              <div className="text-xs text-muted-foreground">per week</div>
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
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>{campaign.progress_percentage || 0}%</span>
                                <span className="text-muted-foreground">
                                  {campaign.stream_goal - (campaign.remaining_streams || campaign.stream_goal)} / {campaign.stream_goal}
                                </span>
                              </div>
                              <Progress 
                                value={campaign.progress_percentage || 0} 
                                className="h-2"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            {getInvoiceStatusBadge(campaign.invoice_status || 'not_invoiced')}
                          </TableCell>
                          <TableCell>
                            {getPerformanceStatusBadge(campaign)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(campaign.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditCampaign(campaign.id)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Campaign
                                </DropdownMenuItem>
                                {campaign.status === 'active' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(campaign.id, 'paused')}
                                  >
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pause Campaign
                                  </DropdownMenuItem>
                                )}
                                {campaign.status === 'paused' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(campaign.id, 'active')}
                                  >
                                    <Play className="mr-2 h-4 w-4" />
                                    Resume Campaign
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => window.open(campaign.track_url, '_blank')}>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open Track
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(campaign.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Campaign
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      </div>
    </div>
  );
}










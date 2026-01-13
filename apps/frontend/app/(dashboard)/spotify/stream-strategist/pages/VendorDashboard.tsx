"use client"

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { supabase } from "../integrations/supabase/client";
import { toast } from "../components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Plus, List, CheckCircle, XCircle, Music, TrendingUp, Users, ExternalLink, RotateCcw, Edit2, Loader2, ChevronUp, ChevronDown, ArrowUpDown, DollarSign, Target, Clock, Award, AlertTriangle, CircleDollarSign, Wallet } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useMyVendor } from "../hooks/useVendors";
import { useMyPlaylists, useCreatePlaylist } from "../hooks/useVendorPlaylists";
import { useVendorCampaignRequests } from "../hooks/useVendorCampaignRequests";
import { useVendorCampaigns } from "../hooks/useVendorCampaigns";
import { VendorPlaylistEditModal } from "../components/VendorPlaylistEditModal";
import { VendorCampaignRequestModal } from "../components/VendorCampaignRequestModal";
import { VendorCampaignPerformanceModal } from "../components/VendorCampaignPerformanceModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";


export default function VendorDashboard() {
  const { user } = useAuth();
  const { data: vendor, isLoading: vendorLoading, error: vendorError } = useMyVendor();
  const { data: playlists, isLoading: playlistsLoading, error: playlistsError } = useMyPlaylists();
  const { data: requests = [] } = useVendorCampaignRequests();
  const { data: campaigns = [] } = useVendorCampaigns();
  const createPlaylist = useCreatePlaylist();

  // Modal states
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    url: '',
    genres: [] as string[],
    avg_daily_streams: 0,
    follower_count: 0
  });
  const [genreInput, setGenreInput] = useState('');
  const [isSpotifyFetchingCreate, setIsSpotifyFetchingCreate] = useState(false);
  const [spotifyCreateError, setSpotifyCreateError] = useState<string | null>(null);
  const [lastFetchedUrl, setLastFetchedUrl] = useState<string>('');
  
  // Sorting state for campaigns
  const [sortBy, setSortBy] = useState<'name' | 'start_date'>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const totalStreams = playlists?.reduce((sum, playlist) => sum + playlist.avg_daily_streams, 0) || 0;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  // Calculate overview metrics from campaigns
  const overviewMetrics = (() => {
    if (!campaigns || campaigns.length === 0) {
      return {
        totalDeliveredStreams: 0,
        totalPendingPayout: 0,
        totalPaidOut: 0,
        workingPlaylists: 0,
        campaignsOnTrack: 0,
        campaignsBehind: 0,
        campaignsAhead: 0,
        onTrackPercent: 0,
        behindPercent: 0,
        bestPlaylist: null as any,
        avgCostPer1k: 0,
        totalCampaigns: 0,
        activeCampaigns: 0
      };
    }

    let totalDeliveredStreams = 0;
    let totalPendingPayout = 0;
    let totalPaidOut = 0;
    const workingPlaylistNames = new Set<string>();
    let campaignsOnTrack = 0;
    let campaignsBehind = 0;
    let campaignsAhead = 0;
    const playlistPerformance: Record<string, { name: string; streams: number }> = {};
    let totalCostPer1k = 0;
    let costPer1kCount = 0;

    campaigns.forEach(campaign => {
      const vendorPlaylists = campaign.vendor_playlists || [];
      
      // Sum streams from vendor's playlists
      vendorPlaylists.forEach((playlist: any) => {
        const streams = playlist.streams_12m || playlist.current_streams || 0;
        totalDeliveredStreams += streams;
        
        if (playlist.name) {
          workingPlaylistNames.add(playlist.name);
          
          // Track playlist performance
          if (!playlistPerformance[playlist.name]) {
            playlistPerformance[playlist.name] = { name: playlist.name, streams: 0 };
          }
          playlistPerformance[playlist.name].streams += streams;
        }

        // Calculate payouts
        const costPer1k = playlist.cost_per_1k_override || campaign.cost_per_1k_streams || 8;
        const playlistPayout = (streams / 1000) * costPer1k;
        
        if (playlist.vendor_paid) {
          totalPaidOut += playlistPayout;
        } else {
          totalPendingPayout += playlistPayout;
        }

        if (costPer1k > 0) {
          totalCostPer1k += costPer1k;
          costPer1kCount++;
        }
      });

      // Calculate on-track status
      const goal = campaign.total_goal || campaign.vendor_stream_goal || 0;
      const currentStreams = vendorPlaylists.reduce((sum: number, p: any) => sum + (p.streams_12m || p.current_streams || 0), 0);
      
      if (goal > 0) {
        const progressPercent = (currentStreams / goal) * 100;
        
        // Calculate expected progress based on campaign duration
        const startDate = campaign.start_date ? new Date(campaign.start_date) : new Date();
        const endDate = campaign.end_date ? new Date(campaign.end_date) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = Math.max(0, now.getTime() - startDate.getTime());
        const expectedProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

        if (progressPercent >= expectedProgress + 10) {
          campaignsAhead++;
        } else if (progressPercent >= expectedProgress - 10) {
          campaignsOnTrack++;
        } else {
          campaignsBehind++;
        }
      }
    });

    // Find best performing playlist
    const bestPlaylist = Object.values(playlistPerformance)
      .sort((a, b) => b.streams - a.streams)[0] || null;

    const totalCampaignsWithStatus = campaignsOnTrack + campaignsBehind + campaignsAhead;
    
    return {
      totalDeliveredStreams,
      totalPendingPayout,
      totalPaidOut,
      workingPlaylists: workingPlaylistNames.size,
      campaignsOnTrack,
      campaignsBehind,
      campaignsAhead,
      onTrackPercent: totalCampaignsWithStatus > 0 ? ((campaignsOnTrack + campaignsAhead) / totalCampaignsWithStatus) * 100 : 0,
      behindPercent: totalCampaignsWithStatus > 0 ? (campaignsBehind / totalCampaignsWithStatus) * 100 : 0,
      bestPlaylist,
      avgCostPer1k: costPer1kCount > 0 ? totalCostPer1k / costPer1kCount : 0,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status?.toLowerCase() === 'active').length
    };
  })();

  // Sort campaigns
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const aValue = sortBy === 'name' ? a.name : a.start_date;
    const bValue = sortBy === 'name' ? b.name : b.start_date;
    
    const comparison = aValue.localeCompare(bValue);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (newSortBy: 'name' | 'start_date') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      name: '',
      url: '',
      genres: [],
      avg_daily_streams: 0,
      follower_count: 0
    });
    setGenreInput('');
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.name || !createFormData.url) return;

    createPlaylist.mutate(createFormData, {
      onSuccess: () => {
        setShowCreatePlaylistModal(false);
        resetCreateForm();
      }
    });
  };

  const addGenre = () => {
    if (genreInput.trim() && !createFormData.genres.includes(genreInput.trim())) {
      setCreateFormData(prev => ({
        ...prev,
        genres: [...prev.genres, genreInput.trim()]
      }));
      setGenreInput('');
    }
  };

  const removeGenre = (genre: string) => {
    setCreateFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(g => g !== genre)
    }));
  };

  const extractPlaylistId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /https?:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /spotify:playlist:([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const fetchSpotifyPlaylistDataCreate = async (playlistId: string) => {
    if (isSpotifyFetchingCreate) return;
    
    setIsSpotifyFetchingCreate(true);
    setSpotifyCreateError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('spotify-playlist-fetch', {
        body: { playlistId }
      });
      
      if (error) throw error;
      
      if (data && data.name) {
        setCreateFormData(prev => ({
          ...prev,
          name: data.name,
          follower_count: Number(data.followers) || 0,
          genres: data.genres || []
        }));
        
        // Only show toast if this is a new fetch (prevent repeated toasts)
        if (createFormData.url !== lastFetchedUrl) {
          setLastFetchedUrl(createFormData.url);
          toast({
            title: "Playlist data fetched",
            description: `Successfully loaded "${data.name}" from Spotify`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching Spotify playlist:', error);
      const errorMessage = error.message || 'Failed to fetch playlist data';
      setSpotifyCreateError(errorMessage);
      toast({
        title: "Error fetching playlist",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSpotifyFetchingCreate(false);
    }
  };

  // Debounced effect for URL changes
  useEffect(() => {
    const playlistId = extractPlaylistId(createFormData.url);
    if (playlistId && createFormData.url && !isSpotifyFetchingCreate) {
      const timeoutId = setTimeout(() => {
        fetchSpotifyPlaylistDataCreate(playlistId);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    } else if (!playlistId && createFormData.url) {
      setSpotifyCreateError(null);
    }
  }, [createFormData.url, isSpotifyFetchingCreate]);

  if (vendorLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (vendorError || !vendor) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-destructive mb-4">No Vendor Association Found</h2>
            <p className="text-muted-foreground mb-4">
              Your account is not associated with any vendor. Please contact an administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              Error: {vendorError?.message || 'No vendor data found'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 -mt-6" data-tour="vendor-portal">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendor Portal</h1>
            <p className="text-muted-foreground">
              {vendor ? `${vendor.name} - Manage your playlists and campaigns` : 'Manage your playlists and campaign participation'}
            </p>
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Playlists</CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playlistsLoading ? '...' : playlists?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active playlists
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Streams</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playlistsLoading ? '...' : totalStreams.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total across all playlists
              </p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRequest(requests[0])}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Performance Overview
            </CardTitle>
            <CardDescription>Your campaign performance and earnings at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Financial Overview */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Total Streams Delivered</span>
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {overviewMetrics.totalDeliveredStreams.toLocaleString()}
                </div>
                <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">Across all campaigns (12m)</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/30 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pending Payout</span>
                </div>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  ${overviewMetrics.totalPendingPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">Awaiting payment</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <CircleDollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Paid Out</span>
                </div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  ${overviewMetrics.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">Earnings received</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Avg Rate</span>
                </div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  ${overviewMetrics.avgCostPer1k.toFixed(2)}<span className="text-sm font-normal">/1K</span>
                </div>
                <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">Average per 1K streams</p>
              </div>
            </div>

            {/* Campaign Status & Performance */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Campaign Status */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Campaign Status
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Campaigns</span>
                    <Badge variant="outline" className="bg-primary/10">{overviewMetrics.activeCampaigns}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Working Playlists</span>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600">{overviewMetrics.workingPlaylists}</Badge>
                  </div>
                  
                  {/* Progress bars for on-track status */}
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        On Track / Ahead
                      </span>
                      <span className="font-medium text-green-600">{overviewMetrics.campaignsOnTrack + overviewMetrics.campaignsAhead} ({overviewMetrics.onTrackPercent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all" 
                        style={{ width: `${overviewMetrics.onTrackPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        Behind Schedule
                      </span>
                      <span className="font-medium text-orange-600">{overviewMetrics.campaignsBehind} ({overviewMetrics.behindPercent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all" 
                        style={{ width: `${overviewMetrics.behindPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Performer */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  Top Performing Playlist
                </h4>
                {overviewMetrics.bestPlaylist ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-200 dark:border-yellow-800">
                      <p className="font-medium text-lg">{overviewMetrics.bestPlaylist.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-xl font-bold text-green-600">
                          {overviewMetrics.bestPlaylist.streams.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">total streams</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Total Playlists</span>
                        <p className="font-medium">{playlists?.length || 0}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">In Campaigns</span>
                        <p className="font-medium">{overviewMetrics.workingPlaylists}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No playlist performance data yet</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Active Campaigns</CardTitle>
                <CardDescription>
                  Manage your playlist participation in active campaigns
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSort('name')}
                  className="text-xs"
                >
                  Name
                  {sortBy === 'name' ? (
                    sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSort('start_date')}
                  className="text-xs"
                >
                  Date
                  {sortBy === 'start_date' ? (
                    sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {campaigns.length > 0 ? (
              <div className="space-y-4">
                {sortedCampaigns.map((campaign) => {
                  const vendorStreamGoal = campaign.vendor_stream_goal || 0;
                  // Use total_streams_delivered from hook (already calculated from campaign_playlists)
                  const currentStreams = (campaign as any).total_streams_delivered || 
                    campaign.vendor_playlists?.reduce((sum: number, p: any) => 
                      p.is_allocated ? (p.current_streams || 0) : 0, 0) || 0;
                  const progressPercentage = vendorStreamGoal > 0 ? (currentStreams / vendorStreamGoal) * 100 : 0;
                  
                  const getPerformanceColor = () => {
                    if (progressPercentage >= 110) return 'text-green-600';
                    if (progressPercentage >= 80) return 'text-blue-600';
                    if (progressPercentage >= 50) return 'text-yellow-600';
                    return 'text-red-600';
                  };

                  const getPaymentBadge = () => {
                    switch (campaign.payment_status) {
                      case 'paid':
                        return { variant: 'default' as const, label: 'Paid ✓', className: 'bg-green-100 text-green-800' };
                      case 'partial':
                        return { variant: 'secondary' as const, label: 'Partial', className: 'bg-yellow-100 text-yellow-800' };
                      case 'pending':
                        return { variant: 'secondary' as const, label: 'Pending', className: '' };
                      default:
                        return { variant: 'outline' as const, label: 'Unpaid', className: '' };
                    }
                  };
                  const paymentBadge = getPaymentBadge();

                  return (
                    <Card key={campaign.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCampaign(campaign)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="space-y-1">
                           <div className="flex items-center gap-2 flex-wrap">
                             <Badge variant="secondary" className="text-xs bg-primary/10">
                               {vendor?.name || 'My Campaign'}
                             </Badge>
                             <h3 className="font-semibold">{campaign.name}</h3>
                             <Badge variant={paymentBadge.variant} className={paymentBadge.className}>
                               {paymentBadge.label}
                             </Badge>
                           </div>
                           {campaign.amount_owed !== undefined && campaign.amount_owed > 0 && (
                             <div className="text-sm text-muted-foreground">
                               Amount owed: <span className="font-medium text-green-600">${campaign.amount_owed.toFixed(2)}</span>
                             </div>
                           )}
                            {campaign.brand_name && (
                              <p className="text-sm text-muted-foreground">{campaign.brand_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Started: {new Date(campaign.start_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-medium">{currentStreams.toLocaleString()} streams</div>
                            <div className="text-muted-foreground">of {vendorStreamGoal.toLocaleString()} goal</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Progress:</span>
                            <span className={`font-medium ${getPerformanceColor()}`}>
                              {progressPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {campaign.vendor_playlists?.filter((p: any) => p.is_allocated).length || 0} active playlists
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active campaigns</h3>
                <p className="text-muted-foreground">
                  You're not currently participating in any campaigns. Check back later for opportunities.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Playlist Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle>Recent Playlists</CardTitle>
              <CardDescription>
                Your active playlists available for campaigns
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreatePlaylistModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Playlist
            </Button>
          </CardHeader>
          <CardContent>
            {playlistsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading playlists...
              </div>
            ) : playlists && playlists.length > 0 ? (
              <div className="space-y-3">
                <ScrollArea className="h-60">
                  <div className="space-y-3 pr-3">
                    {playlists.map((playlist) => (
                      <div key={playlist.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Music className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{playlist.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {playlist.avg_daily_streams.toLocaleString()} daily streams
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {playlist.follower_count?.toLocaleString() || '0'} followers
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPlaylist(playlist)}>
                          <Edit2 className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button variant="outline" className="w-full" onClick={() => setShowCreatePlaylistModal(true)}>
                  Add More Playlists
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first playlist to start participating in campaigns
                </p>
                <Button onClick={() => setShowCreatePlaylistModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Playlist
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Participation Requests</CardTitle>
            <CardDescription>
              Review and approve/deny campaign participation requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length > 0 ? (
              <div className="space-y-3">
                {requests.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{request.campaign?.name || 'Campaign Request'}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.playlists?.length || 0} playlists • {request.status}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(request)}>
                      {request.status === 'pending' ? 'Review' : 'View'}
                    </Button>
                  </div>
                ))}
                {requests.length > 0 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Click on a request above to review it
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                <p className="text-muted-foreground">
                  Campaign participation requests will appear here when available
                </p>
              </div>
            )}
          </CardContent>
          </Card>

        </div>

        {/* Modals */}
        <VendorPlaylistEditModal
          playlist={selectedPlaylist}
          isOpen={!!selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
        />

        <VendorCampaignRequestModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />

        <VendorCampaignPerformanceModal
          campaign={selectedCampaign}
          isOpen={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />

        {/* Create Playlist Modal */}
        <Dialog open={showCreatePlaylistModal} onOpenChange={setShowCreatePlaylistModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Playlist</DialogTitle>
              <DialogDescription>
                Add a new playlist to make it available for campaign participation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlaylist}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input
                    id="name"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                    placeholder="Playlist name"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="url" className="text-right">Spotify URL</Label>
                  <div className="col-span-3 relative">
                    <Input
                      id="url"
                      value={createFormData.url}
                      onChange={(e) => {
                        setCreateFormData(prev => ({ ...prev, url: e.target.value }));
                        setSpotifyCreateError(null);
                      }}
                      onBlur={(e) => {
                        const id = extractPlaylistId(e.target.value);
                        if (id) fetchSpotifyPlaylistDataCreate(id);
                      }}
                      className={`${isSpotifyFetchingCreate ? 'pr-10' : ''}`}
                      placeholder="https://open.spotify.com/playlist/..."
                      required
                    />
                    {isSpotifyFetchingCreate && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {spotifyCreateError && (
                      <p className="text-sm text-destructive mt-1">{spotifyCreateError}</p>
                    )}
                    {isSpotifyFetchingCreate && (
                      <p className="text-sm text-muted-foreground mt-1">Fetching playlist data...</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="streams" className="text-right">Daily Streams</Label>
                  <Input
                    id="streams"
                    type="number"
                    value={createFormData.avg_daily_streams}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, avg_daily_streams: parseInt(e.target.value) || 0 }))}
                    className="col-span-3"
                    placeholder="Average daily streams"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="followers" className="text-right">Followers</Label>
                  <Input
                    id="followers"
                    type="number"
                    value={createFormData.follower_count}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, follower_count: parseInt(e.target.value) || 0 }))}
                    className="col-span-3"
                    placeholder="Number of followers"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right">Genres</Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={genreInput}
                        onChange={(e) => setGenreInput(e.target.value)}
                        placeholder="Add genre"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                      />
                      <Button type="button" onClick={addGenre} size="sm">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {createFormData.genres.map((genre) => (
                        <Badge key={genre} variant="secondary" className="cursor-pointer" onClick={() => removeGenre(genre)}>
                          {genre} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setShowCreatePlaylistModal(false);
                  resetCreateForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPlaylist.isPending}>
                  {createPlaylist.isPending ? 'Adding...' : 'Add Playlist'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }









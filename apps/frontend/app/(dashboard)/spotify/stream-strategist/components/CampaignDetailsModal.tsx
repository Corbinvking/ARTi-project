"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trash2, Plus, ExternalLink, CheckCircle, XCircle, Clock, BarChart3, ChevronDown, ChevronRight, MessageCircle, Radio, Music, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { PlaylistSelector } from './PlaylistSelector';
import { useCampaignVendorResponses } from '../hooks/useCampaignVendorResponses';
import { useIsVendorManager } from '../hooks/useIsVendorManager';
import { useAuth } from '../hooks/useAuth';
import { useSalespeople } from '../hooks/useSalespeople';
import { useQuery } from '@tanstack/react-query';
import { VendorGroupedPlaylistView } from './VendorGroupedPlaylistView';
import { VendorPerformanceChart } from './VendorPerformanceChart';
import { useCampaignPerformanceData, useCampaignOverallPerformance } from '../hooks/useCampaignPerformanceData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useVendorPaymentData } from '../hooks/useVendorPayments';

interface PlaylistWithStatus {
  id: string;
  name: string;
  url?: string;
  vendor_name?: string;
  vendor_id?: string;
  status?: string;
  placed_date?: string;
  follower_count?: number;
  avg_daily_streams?: number;
}

interface CampaignDetailsModalProps {
  campaign: any;
  open: boolean;
  onClose: () => void;
}

const PLAYLIST_STATUSES = [
  'Pending',
  'Pitched', 
  'Accepted',
  'Placed',
  'Rejected'
];

export function CampaignDetailsModal({ campaign, open, onClose }: CampaignDetailsModalProps) {
  console.log('🔧 [v1.0.1-DEBUG] Modal rendered:', { 
    open, 
    campaignId: campaign?.id,
    campaignName: campaign?.name 
  });
  
  const [campaignData, setCampaignData] = useState<any>(null);
  const [playlists, setPlaylists] = useState<PlaylistWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});
  const [vendorData, setVendorData] = useState<Record<string, any>>({});
  const [markingPaid, setMarkingPaid] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  // Fetch vendor responses for this campaign
  console.log('🔧 [v1.0.1-DEBUG] About to call useCampaignVendorResponses with ID:', campaign?.id);
  const { data: vendorResponses = [], isLoading: vendorResponsesLoading } = useCampaignVendorResponses(campaign?.id);
  const { data: isVendorManager = false } = useIsVendorManager();
  const { hasRole } = useAuth();
  const { data: salespeople = [] } = useSalespeople();
  const { data: payments = [] } = useVendorPaymentData();
  
  // Fetch performance data for admin view
  const { data: performanceData, isLoading: performanceLoading } = useCampaignPerformanceData(campaign?.id);
  const { data: overallPerformance } = useCampaignOverallPerformance(campaign?.id);
  
  // Fetch campaign playlists (real scraped data) - separated into vendor and algorithmic
  const { data: campaignPlaylistsData = { vendor: [], algorithmic: [] }, isLoading: playlistsLoading } = useQuery({
    queryKey: ['campaign-playlists', campaign?.id],
    queryFn: async () => {
      if (!campaign?.id) {
        return { vendor: [], algorithmic: [] };
      }
      
      // First, get all spotify_campaigns (songs) in this campaign group
      const { data: songs, error: songsError } = await supabase
        .from('spotify_campaigns')
        .select('id')
        .eq('campaign_group_id', campaign.id);
      
      if (songsError) {
        console.error('Error fetching campaign songs:', songsError);
        return { vendor: [], algorithmic: [] };
      }
      
      if (!songs || songs.length === 0) {
        return { vendor: [], algorithmic: [] };
      }
      
      const songIds = songs.map(s => s.id);
      
      // Fetch ALL playlists for all songs
      let query = supabase
        .from('campaign_playlists')
        .select(`
          *,
          vendors (
            id,
            name,
            cost_per_1k_streams
          )
        `);
      
      // Use .eq() for single songs, .in() for multiple
      if (songIds.length === 1) {
        query = query.eq('campaign_id', songIds[0]);
      } else {
        query = query.in('campaign_id', songIds);
      }
      
      const { data, error } = await query.order('streams_28d', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaign playlists:', error);
        return { vendor: [], algorithmic: [] };
      }
      
      // Separate vendor playlists from algorithmic playlists
      const vendorPlaylists = (data || []).filter((p: any) => !p.is_algorithmic);
      const algorithmicPlaylists = (data || []).filter((p: any) => p.is_algorithmic);
      
      console.log('✅ Found playlists - Vendor:', vendorPlaylists.length, 'Algorithmic:', algorithmicPlaylists.length);
      
      return {
        vendor: vendorPlaylists,
        algorithmic: algorithmicPlaylists
      };
    },
    enabled: !!campaign?.id && open
  });
  
  // Extract for easier access
  const campaignPlaylists = campaignPlaylistsData.vendor || [];
  const algorithmicPlaylists = campaignPlaylistsData.algorithmic || [];
  
  const canEditCampaign = hasRole('admin') || hasRole('manager');

  useEffect(() => {
    if (campaign?.id && open) {
      fetchCampaignDetails();
    }
  }, [campaign?.id, open]);

  const fetchCampaignDetails = async () => {
    if (!campaign?.id) return;
    
    console.log('🔄 [v1.0.2] Fetching comprehensive campaign details');
    setLoading(true);
    try {
      // Fetch campaign group data
      const { data: campaignGroup, error: groupError } = await supabase
        .from('campaign_groups')
        .select(`
          *,
          clients (
            id,
            name,
            emails
          )
        `)
        .eq('id', campaign.id)
        .single();

      if (groupError) throw groupError;

      // Fetch all songs (spotify_campaigns) in this campaign group
      const { data: songs, error: songsError } = await supabase
        .from('spotify_campaigns')
        .select('*')
        .eq('campaign_group_id', campaign.id);
      
      if (songsError) throw songsError;

      // Calculate totals from songs
      const totalDaily = songs?.reduce((sum, song) => sum + (parseInt(song.daily) || song.daily_streams || 0), 0) || 0;
      const totalWeekly = songs?.reduce((sum, song) => sum + (parseInt(song.weekly) || song.weekly_streams || 0), 0) || 0;
      const totalRemaining = songs?.reduce((sum, song) => sum + (parseInt(song.remaining) || 0), 0) || 0;

      // Fetch algorithmic playlists for this campaign to calculate external streams
      const songIds = songs?.map(s => s.id) || [];
      let radioStreams = 0;
      let discoverWeeklyStreams = 0;
      let totalAlgorithmicStreams = 0;
      
      if (songIds.length > 0) {
        const { data: algorithmicPlaylists } = await supabase
          .from('campaign_playlists')
          .select('playlist_name, playlist_curator, streams_28d, streams_7d, streams_12m')
          .in('campaign_id', songIds)
          .eq('is_algorithmic', true);
        
        if (algorithmicPlaylists) {
          // Calculate Radio streams (includes "Radio", "Mixes", "Smart Shuffle", "Your DJ", etc.)
          radioStreams = algorithmicPlaylists
            .filter(p => {
              const name = p.playlist_name?.toLowerCase() || '';
              const curator = p.playlist_curator?.toLowerCase() || '';
              return (name.includes('radio') || 
                      name.includes('mix') || 
                      name.includes('shuffle') || 
                      name.includes('your dj')) && 
                     curator === 'spotify';
            })
            .reduce((sum, p) => sum + (p.streams_28d || 0), 0);
          
          // Calculate Discover Weekly streams
          discoverWeeklyStreams = algorithmicPlaylists
            .filter(p => p.playlist_name?.toLowerCase().includes('discover weekly'))
            .reduce((sum, p) => sum + (p.streams_28d || 0), 0);
          
          // Calculate total algorithmic streams (all Spotify algorithmic playlists)
          totalAlgorithmicStreams = algorithmicPlaylists
            .reduce((sum, p) => sum + (p.streams_28d || 0), 0);
        }
      }

      // Calculate duration from start_date to end_date or use a default
      let durationDays = 0;
      if (campaignGroup.start_date && campaignGroup.end_date) {
        const start = new Date(campaignGroup.start_date);
        const end = new Date(campaignGroup.end_date);
        durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      } else if (campaignGroup.start_date) {
        // Calculate from start_date to now
        const start = new Date(campaignGroup.start_date);
        const now = new Date();
        durationDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Merge all data into campaignData
      const enrichedData = {
        ...campaignGroup,
        client_name: campaignGroup.clients?.name || campaignGroup.client_id,
        budget: parseFloat(campaignGroup.total_budget) || 0,
        stream_goal: campaignGroup.total_goal || 0,
        remaining_streams: totalRemaining || campaignGroup.total_goal || 0,
        sub_genre: campaignGroup.notes || 'Not specified', // Genre stored in notes
        duration_days: durationDays,
        daily_streams: totalDaily,
        weekly_streams: totalWeekly,
        radio_streams: radioStreams,
        discover_weekly_streams: discoverWeeklyStreams,
        total_algorithmic_streams: totalAlgorithmicStreams,
        track_url: songs?.[0]?.url || null, // First song's URL
        sfa: songs?.[0]?.sfa || null, // First song's SFA URL (scraped from Spotify for Artists)
        songs: songs || [],
      };

      setCampaignData(enrichedData as any);
      
      // Fetch vendor data with cost information
      const { data: vendorInfo } = await supabase
        .from('vendors')
        .select('id, name, cost_per_1k_streams');
      
      if (vendorInfo) {
        const vendorMap = vendorInfo.reduce((acc, vendor) => {
          acc[vendor.name] = vendor;
          return acc;
        }, {} as Record<string, any>);
        setVendorData(vendorMap);
      }
      
      // Parse selected_playlists with proper status handling
      if (data?.selected_playlists && Array.isArray(data.selected_playlists) && data.selected_playlists.length > 0) {
        // Check if selected_playlists contains string IDs or full objects
        const isStringArray = typeof data.selected_playlists[0] === 'string';
        
        if (isStringArray) {
          // Fetch full playlist details from database
          try {
            const playlistIds = data.selected_playlists.filter((id): id is string => typeof id === 'string');
            const { data: playlistDetails } = await supabase
              .from('playlists')
              .select(`*, vendor:vendors(id, name)`)
              .in('id', playlistIds);
              
            if (playlistDetails) {
                const playlistsWithStatus = playlistIds.map((id: string) => {
                const playlist = playlistDetails.find(p => p.id === id);
                return {
                  id,
                  name: playlist?.name || 'Unknown Playlist',
                  url: playlist?.url || '',
                  vendor_name: playlist?.vendor?.name || 'Unknown Vendor',
                  vendor_id: playlist?.vendor?.id || playlist?.vendor_id || 'unknown',
                  follower_count: playlist?.follower_count || 0,
                  avg_daily_streams: playlist?.avg_daily_streams || 0,
                  status: 'Selected',
                  placed_date: null
                };
              }).filter(Boolean);
              setPlaylists(playlistsWithStatus);
            } else {
              setPlaylists([]);
            }
          } catch (error) {
            console.error('Failed to fetch playlist details:', error);
            setPlaylists([]);
          }
        } else {
          // Already full objects, just normalize
          const playlistsWithStatus = (data.selected_playlists as any[]).map(playlist => ({
            ...playlist,
            status: playlist.status || 'Pending',
            placed_date: playlist.placed_date || null
          }));
          setPlaylists(playlistsWithStatus);
        }
      } else if (((data?.algorithm_recommendations as any)?.allocations) && Array.isArray((data.algorithm_recommendations as any).allocations)) {
        // Fallback to algorithm recommendations
        try {
          const allocations = (data.algorithm_recommendations as any).allocations;
          const playlistIds = allocations.map((a: any) => a.playlistId).filter(Boolean);
          if (playlistIds.length > 0) {
            const { data: playlistDetails } = await supabase
              .from('playlists')
              .select(`*, vendor:vendors(name)`)
              .in('id', playlistIds);
            if (playlistDetails) {
              const generated = allocations.map((allocation: any) => {
                const playlist = playlistDetails.find(p => p.id === allocation.playlistId);
                return {
                  id: allocation.playlistId,
                  name: playlist?.name || 'Unknown Playlist',
                  url: playlist?.url || '',
                  vendor_name: playlist?.vendor?.name || 'Unknown Vendor',
                  follower_count: playlist?.follower_count || 0,
                  avg_daily_streams: playlist?.avg_daily_streams || 0,
                  status: 'Algorithm Generated',
                  placed_date: null
                } as PlaylistWithStatus;
              }).filter(Boolean);
              setPlaylists(generated);
            } else {
              setPlaylists([]);
            }
          } else {
            setPlaylists([]);
          }
        } catch (e) {
          console.error('Failed to fetch algorithm playlists:', e);
          setPlaylists([]);
        }
      } else {
        setPlaylists([]);
      }
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePlaylistStatus = async (playlistIndex: number, updates: Partial<PlaylistWithStatus>) => {
    const updatedPlaylists = [...playlists];
    updatedPlaylists[playlistIndex] = {
      ...updatedPlaylists[playlistIndex],
      ...updates
    };
    
    setPlaylists(updatedPlaylists);
    
    try {
      const { error } = await supabase
        .from('campaign_groups')
        .update({ 
          selected_playlists: updatedPlaylists as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign!.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Playlist status updated",
      });
    } catch (error) {
      console.error('Failed to update playlist:', error);
      toast({
        title: "Error",
        description: "Failed to update playlist status",
        variant: "destructive",
      });
      // Revert on error
      fetchCampaignDetails();
    }
  };

  const removePlaylist = async (playlistIndex: number) => {
    const updatedPlaylists = playlists.filter((_, i) => i !== playlistIndex);
    setPlaylists(updatedPlaylists);
    
    try {
      const { error } = await supabase
        .from('campaign_groups')
        .update({ 
          selected_playlists: updatedPlaylists as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign!.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Playlist removed from campaign",
      });
    } catch (error) {
      console.error('Failed to remove playlist:', error);
      toast({
        title: "Error", 
        description: "Failed to remove playlist",
        variant: "destructive",
      });
      // Revert on error
      fetchCampaignDetails();
    }
  };

  const addPlaylists = async (selectedPlaylists: any[]) => {
    const newPlaylists = selectedPlaylists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      url: playlist.url,
      vendor_name: playlist.vendor_name,
      status: 'Pending' as const,
      placed_date: null
    }));

    const updatedPlaylists = [...playlists, ...newPlaylists];
    setPlaylists(updatedPlaylists);

    try {
      const { error } = await supabase
        .from('campaign_groups')
        .update({ 
          selected_playlists: updatedPlaylists as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign!.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Added ${newPlaylists.length} playlist${newPlaylists.length !== 1 ? 's' : ''} to campaign`,
      });
    } catch (error) {
      console.error('Failed to add playlists:', error);
      toast({
        title: "Error",
        description: "Failed to add playlists",
        variant: "destructive",
      });
      // Revert on error
      fetchCampaignDetails();
    }
  };

  const updateSalesperson = async (newSalesperson: string) => {
    try {
      const { error } = await supabase
        .from('campaign_groups')
        .update({ 
          salesperson: newSalesperson,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign!.id);

      if (error) throw error;
      
      setCampaignData(prev => ({ ...prev, salesperson: newSalesperson }));
      
      toast({
        title: "Success",
        description: "Salesperson updated",
      });
    } catch (error) {
      console.error('Failed to update salesperson:', error);
      toast({
        title: "Error",
        description: "Failed to update salesperson",
        variant: "destructive",
      });
    }
  };

  const getSalespersonName = (email: string) => {
    const salesperson = salespeople.find(s => s.email === email);
    return salesperson?.name || email || 'Not assigned';
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Placed': return 'default';
      case 'Accepted': return 'secondary';
      case 'Pitched': return 'outline';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getVendorResponseVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getVendorResponseIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'rejected': return <XCircle className="h-3 w-3 mr-1" />;
      case 'pending': return <Clock className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Group playlists by vendor ID with performance data
  const groupedPlaylists = playlists.reduce((acc, playlist, idx) => {
    const vendorId = playlist.vendor_id || 'unknown';
    const vendorName = playlist.vendor_name || 'Unknown Vendor';
    
    if (!acc[vendorId]) {
      // Get vendor notes from vendorResponses
      const vendorResponse = vendorResponses.find(vr => 
        vr.vendor?.name === vendorName
      );
      
      // Find performance data for this vendor by vendor_id
      const vendorPerf = performanceData?.find(v => v.vendor_id === vendorId);
      
      acc[vendorId] = {
        vendorId,
        vendorName,
        playlists: [],
        totalAllocated: 0,
        totalActual: 0,
        vendorPerformance: vendorPerf,
        totalPayment: 0, // Will be calculated after processing all playlists
        paymentStatus: 'Unpaid', // Default status - can be enhanced later
        hasNotes: Boolean(vendorResponse?.response_notes?.trim()),
        notes: vendorResponse?.response_notes || ''
      };
    }
    
    // Find performance data for this specific playlist
    const playlistPerf = acc[vendorId].vendorPerformance?.playlists?.find(p => p.id === playlist.id);
    
    acc[vendorId].playlists.push({
      ...playlist,
      idx,
      allocated: playlistPerf?.allocated_streams || 0,
      actual: playlistPerf?.actual_streams || 0
    });
    
    acc[vendorId].totalAllocated += playlistPerf?.allocated_streams || 0;
    acc[vendorId].totalActual += playlistPerf?.actual_streams || 0;
    
    return acc;
  }, {} as Record<string, any>);

  // Calculate total payment for each vendor after processing all playlists
  Object.keys(groupedPlaylists).forEach(vendorId => {
    const vendorGroup = groupedPlaylists[vendorId];
    
    // Calculate total payment using campaign-specific cost per stream from performance data
    vendorGroup.totalPayment = vendorGroup.vendorPerformance?.playlists?.reduce((total, playlistData) => {
      const allocatedStreams = playlistData.allocated_streams || 0;
      const costPerStream = playlistData.cost_per_stream || 0;
      
      console.log(`Payment calc for playlist ${playlistData.id}: ${allocatedStreams} streams × $${costPerStream} = $${allocatedStreams * costPerStream}`);
      
      return total + (allocatedStreams * costPerStream);
    }, 0) || 0;
    
    // Determine payment status based on performance data
    const hasUnpaidAllocations = vendorGroup.vendorPerformance?.playlists?.some(p => 
      p.payment_status !== 'paid'
    ) ?? true;
    vendorGroup.paymentStatus = hasUnpaidAllocations ? 'Unpaid' : 'Paid';
  });

  const toggleVendor = (vendorId: string) => {
    setExpandedVendors(prev => ({
      ...prev,
      [vendorId]: !prev[vendorId]
    }));
  };

  const markVendorPaymentAsPaid = async (campaignId: string, vendorId: string, vendorName: string, amount: number) => {
    const paymentKey = `${campaignId}-${vendorId}`;
    setMarkingPaid(prev => ({ ...prev, [paymentKey]: true }));
    
    try {
      // Update campaign_allocations_performance for this vendor
      const { error } = await supabase
        .from('campaign_allocations_performance')
        .update({
          payment_status: 'paid',
          paid_amount: amount,
          paid_date: new Date().toISOString(),
          payment_method: 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', campaignId)
        .eq('vendor_id', vendorId);

      if (error) throw error;
      
      // Refresh campaign details to show updated payment status
      await fetchCampaignDetails();
      
      toast({
        title: "Payment Marked as Paid",
        description: `Payment of $${amount.toFixed(2)} to ${vendorName} has been marked as paid`,
      });
    } catch (error) {
      console.error('Failed to mark payment as paid:', error);
      toast({
        title: "Error",
        description: "Failed to mark payment as paid",
        variant: "destructive",
      });
    } finally {
      setMarkingPaid(prev => ({ ...prev, [paymentKey]: false }));
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            Loading campaign details...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {campaignData?.name || campaign?.name}
            <Badge variant={getStatusVariant(campaignData?.status || 'draft')}>
              {campaignData?.status || 'draft'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Campaign details and playlist assignments
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              Campaign Details
            </TabsTrigger>
            <TabsTrigger value="playlists" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Playlists
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance Analytics
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Vendor Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
          {/* Campaign Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-card rounded-lg">
            <div>
              <Label className="text-muted-foreground">Client</Label>
              <p className="font-medium">{campaignData?.client_name || campaignData?.client}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Budget</Label>
              <p className="font-medium">${campaignData?.budget?.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Stream Goal</Label>
              <p className="font-medium">{campaignData?.stream_goal?.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Remaining Streams</Label>
              <p className="font-medium">{(campaignData?.remaining_streams || campaignData?.stream_goal)?.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Genre</Label>
              <p className="font-medium">{campaignData?.sub_genre || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Duration</Label>
              <p className="font-medium">{campaignData?.duration_days} days</p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">Salesperson</Label>
              {canEditCampaign ? (
                <Select 
                  value={campaignData?.salesperson || ''} 
                  onValueChange={updateSalesperson}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select salesperson" />
                  </SelectTrigger>
                  <SelectContent>
                    {salespeople.map((salesperson) => (
                      <SelectItem key={salesperson.id} value={salesperson.email || salesperson.name}>
                        {salesperson.name} {salesperson.email && `(${salesperson.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium">{getSalespersonName(campaignData?.salesperson)}</p>
              )}
            </div>
            {campaignData?.sfa && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">Spotify for Artists Link</Label>
                <a 
                  href={campaignData.sfa} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline font-medium mt-1"
                >
                  View Stream Data on Spotify for Artists
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
          
          {/* External Streaming Sources */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4" />
              <span className="font-medium">External Streaming Sources</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(campaignData?.radio_streams || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Radio Streams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(campaignData?.discover_weekly_streams || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Discover Weekly</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(campaignData?.total_algorithmic_streams || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total External</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3 text-center">
              Last updated: {campaignData?.updated_at ? formatDate(campaignData.updated_at) : 'Not available'}
            </div>
          </div>
          
          {/* Track URL */}
          {campaignData?.track_url && (
            <div className="p-4 bg-card rounded-lg">
              <Label className="text-muted-foreground">Track URL</Label>
              <div className="flex items-center gap-2 mt-1">
                <a 
                  href={campaignData.track_url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {campaignData.track_url}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
          
          {/* Vendor Responses */}
          {vendorResponses.length > 0 && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Vendor Responses ({vendorResponses.length})</Label>
              <div className="grid gap-4">
                {vendorResponses.map((response) => (
                  <Card key={response.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-medium">
                          {(response.vendor as any)?.name || 'Unknown Vendor'}
                        </Badge>
                        <Badge variant={getVendorResponseVariant(response.status)}>
                          {getVendorResponseIcon(response.status)}
                          {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                        </Badge>
                      </div>
                      {response.responded_at && (
                        <span className="text-sm text-muted-foreground">
                          {formatDate(response.responded_at)}
                        </span>
                      )}
                    </div>
                    
                    {response.playlists && response.playlists.length > 0 && (
                      <div className="mb-3">
                        <Label className="text-sm text-muted-foreground mb-1 block">
                          Requested Playlists:
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {response.playlists.map((playlist) => (
                            <Badge key={playlist.id} variant="outline" className="text-xs">
                              {playlist.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {response.response_notes && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-1 block">
                          Vendor Notes:
                        </Label>
                        <p className="text-sm bg-muted/50 p-2 rounded border-l-2 border-primary/20">
                          {response.response_notes}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          
          {/* Campaign Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-card rounded-lg text-sm text-muted-foreground">
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p>{campaignData?.created_at ? formatDate(campaignData.created_at) : 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Last Updated</Label>
              <p>{campaignData?.updated_at ? formatDate(campaignData.updated_at) : 'Unknown'}</p>
            </div>
          </div>
          </TabsContent>

          <TabsContent value="playlists" className="space-y-6">
            {playlistsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : campaignPlaylists.length === 0 && algorithmicPlaylists.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Playlist Data Yet</p>
                <p className="text-sm">
                  Playlist placement data will appear here once the Spotify scraper runs for this campaign.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Spotify Algorithmic Playlists Section */}
                {algorithmicPlaylists.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Radio className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold">Spotify Algorithmic Playlists</h3>
                      <Badge variant="secondary">{algorithmicPlaylists.length}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {algorithmicPlaylists.map((playlist: any) => (
                        <Card key={playlist.id} className="p-4">
                          <div className="flex items-start gap-2">
                            <Radio className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate" title={playlist.playlist_name}>
                                {playlist.playlist_name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Spotify Official
                              </div>
                              <div className="mt-2 text-lg font-bold">
                                {(playlist.streams_28d || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                streams (28d)
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm text-green-800 dark:text-green-200">
                        <strong>Total Algorithmic Streams (28d):</strong>{' '}
                        {algorithmicPlaylists.reduce((sum: number, p: any) => sum + (p.streams_28d || 0), 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vendor Playlists Section */}
                {campaignPlaylists.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Music className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Vendor Playlists</h3>
                      <Badge variant="secondary">{campaignPlaylists.length}</Badge>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Total Playlists</div>
                    <div className="text-2xl font-bold">{campaignPlaylists.length}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Total Streams (28d)</div>
                    <div className="text-2xl font-bold">
                      {campaignPlaylists.reduce((sum: number, p: any) => sum + (p.streams_28d || 0), 0).toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Avg Daily Streams</div>
                    <div className="text-2xl font-bold">
                      {Math.round(campaignPlaylists.reduce((sum: number, p: any) => sum + (p.streams_28d || 0), 0) / 28).toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Unique Vendors</div>
                    <div className="text-2xl font-bold">
                      {new Set(campaignPlaylists.map((p: any) => p.vendor_id)).size}
                    </div>
                  </Card>
                </div>

                {/* Playlists Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Playlist Name</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Curator</TableHead>
                        <TableHead className="text-right">Streams (7d)</TableHead>
                        <TableHead className="text-right">Streams (28d)</TableHead>
                        <TableHead className="text-right">Streams (12m)</TableHead>
                        <TableHead>Date Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignPlaylists.map((playlist: any) => (
                        <TableRow key={playlist.id}>
                          <TableCell className="font-medium max-w-[250px]">
                            <div className="truncate" title={playlist.playlist_name}>
                              {playlist.playlist_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {playlist.vendors?.name || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {playlist.playlist_curator || '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(playlist.streams_7d || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {(playlist.streams_28d || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(playlist.streams_12m || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {playlist.date_added || 'Unknown'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Vendor Performance Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Vendor Performance Breakdown
                  </h3>
                  {Object.entries(
                    campaignPlaylists.reduce((acc: any, playlist: any) => {
                      const vendorName = playlist.vendors?.name || 'Unknown';
                      if (!acc[vendorName]) {
                        acc[vendorName] = {
                          playlists: [],
                          totalStreams7d: 0,
                          totalStreams28d: 0,
                          totalStreams12m: 0,
                          costPer1k: playlist.vendors?.cost_per_1k_streams || 0
                        };
                      }
                      acc[vendorName].playlists.push(playlist);
                      acc[vendorName].totalStreams7d += playlist.streams_7d || 0;
                      acc[vendorName].totalStreams28d += playlist.streams_28d || 0;
                      acc[vendorName].totalStreams12m += playlist.streams_12m || 0;
                      return acc;
                    }, {})
                  ).map(([vendorName, data]: [string, any]) => (
                    <Card key={vendorName} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{vendorName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {data.playlists.length} playlist{data.playlists.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          ${data.costPer1k}/1k
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Last 7 Days</div>
                          <div className="text-xl font-bold">{data.totalStreams7d.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(data.totalStreams7d / 7).toLocaleString()}/day
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Last 28 Days</div>
                          <div className="text-xl font-bold">{data.totalStreams28d.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(data.totalStreams28d / 28).toLocaleString()}/day
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Last 12 Months</div>
                          <div className="text-xl font-bold">{data.totalStreams12m.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(data.totalStreams12m / 365).toLocaleString()}/day
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {performanceLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !performanceData || performanceData.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No performance data available yet
              </div>
            ) : (
              <div className="space-y-6">
                {/* Campaign Overview */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Campaign Performance Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {overallPerformance?.total_actual?.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Streams Driven</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {overallPerformance?.campaign_goal?.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Campaign Goal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {overallPerformance?.progress_percentage?.toFixed(1) || '0'}%
                      </div>
                      <div className="text-sm text-muted-foreground">Goal Progress</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress 
                      value={overallPerformance?.progress_percentage || 0} 
                      className="h-3"
                    />
                  </div>
                </Card>

                {/* Vendor Performance Comparison */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Vendor Performance Comparison</h3>
                  <div className="space-y-4">
                    {performanceData.map(vendor => {
                      const progress = vendor.allocated_streams > 0 ? (vendor.actual_streams / vendor.allocated_streams) * 100 : 0;
                      return (
                        <div key={vendor.vendor_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="font-medium">{vendor.vendor_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Total Streams Driven: {vendor.actual_streams.toLocaleString()} / {vendor.allocated_streams.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium">{progress.toFixed(1)}%</div>
                              <div className="text-xs text-muted-foreground">
                                {vendor.playlists.length} playlists
                              </div>
                            </div>
                            <Progress value={progress} className="w-24 h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Performance Chart */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Trends
                  </h3>
                  <VendorPerformanceChart 
                    data={performanceData} 
                    campaignGoal={campaignData?.stream_goal || 0} 
                  />
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Vendor Payment Management
                </h3>
                <div className="text-sm text-muted-foreground">
                  Total Campaign Budget: ${campaignData?.budget?.toLocaleString()}
                </div>
              </div>

              {Object.entries(groupedPlaylists).length > 0 ? (
                <div className="grid gap-4">
                  {Object.entries(groupedPlaylists).map(([vendorId, vendorData]) => {
                    const ratePer1k = vendorData.vendorPerformance?.cost_per_stream 
                      ? (vendorData.vendorPerformance.cost_per_stream * 1000).toFixed(2)
                      : '0.00';
                    
                    return (
                      <Card key={vendorId} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold">{vendorData.vendorName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {vendorData.playlists.length} playlist{vendorData.playlists.length !== 1 ? 's' : ''} allocated
                            </p>
                          </div>
                          <Badge 
                            variant={vendorData.paymentStatus === 'Paid' ? 'default' : 'destructive'}
                            className="text-sm"
                          >
                            {vendorData.paymentStatus}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Rate per 1k streams</Label>
                            <p className="text-lg font-semibold">${ratePer1k}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Allocated streams</Label>
                            <p className="text-lg font-semibold">{vendorData.totalAllocated.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Actual streams delivered</Label>
                            <p className="text-lg font-semibold text-primary">{vendorData.totalActual.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Total amount owed</Label>
                            <p className="text-xl font-bold text-green-600">
                              ${vendorData.totalPayment.toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </p>
                          </div>
                        </div>

                        {vendorData.paymentStatus !== 'Paid' && canEditCampaign && (
                          <div className="flex items-center gap-4 pt-4 border-t">
                            <Button
                              onClick={() => markVendorPaymentAsPaid(campaignData?.id, vendorId, vendorData.vendorName, vendorData.totalPayment)}
                              disabled={markingPaid[`${campaignData?.id}-${vendorId}`]}
                              className="flex items-center gap-2"
                            >
                              {markingPaid[`${campaignData?.id}-${vendorId}`] ? (
                                <>Processing...</>
                              ) : (
                                <>
                                  <DollarSign className="h-4 w-4" />
                                  Mark as Paid
                                </>
                              )}
                            </Button>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`payment-date-${vendorId}`} className="text-sm">Payment Date:</Label>
                              <Input
                                id={`payment-date-${vendorId}`}
                                type="date"
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="w-auto"
                              />
                            </div>
                          </div>
                        )}

                        {vendorData.paymentStatus === 'Paid' && (
                          <div className="pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Payment processed</span>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No vendor payments to display</p>
                  <p className="text-sm">Add playlists to generate payment information</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Playlist Selector Modal */}
        <PlaylistSelector
          open={showPlaylistSelector}
          onClose={() => setShowPlaylistSelector(false)}
          onSelect={addPlaylists}
          campaignGenre={campaignData?.sub_genre}
          excludePlaylistIds={playlists.map(p => p.id)}
        />
      </DialogContent>
    </Dialog>
  );
}









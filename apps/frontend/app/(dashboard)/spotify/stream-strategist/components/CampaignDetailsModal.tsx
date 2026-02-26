"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from './ui/textarea';
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
import { Trash2, Plus, ExternalLink, CheckCircle, XCircle, Clock, BarChart3, ChevronDown, ChevronRight, MessageCircle, Radio, Music, DollarSign, Calendar, Edit, AlertCircle, Loader2, Sparkles, Zap, TrendingUp, Target, Leaf, Globe, Pencil, Check, X } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { PlaylistSelector } from './PlaylistSelector';
import { useCampaignVendorResponses } from '../hooks/useCampaignVendorResponses';
import { useIsVendorManager } from '../hooks/useIsVendorManager';
import { useAuth } from '../hooks/useAuth';
import { useSalespeople } from '@/hooks/use-salespeople';
import { useClients } from '../hooks/useClients';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VendorGroupedPlaylistView } from './VendorGroupedPlaylistView';
import { VendorPerformanceChart } from './VendorPerformanceChart';
import { useCampaignPerformanceData, useCampaignOverallPerformance } from '../hooks/useCampaignPerformanceData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useVendorPaymentData } from '../hooks/useVendorPayments';
import { EditPlaylistVendorDialog } from './EditPlaylistVendorDialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { isAlgorithmicPlaylist } from '../lib/constants';
import { OverrideField } from '@/components/overrides/OverrideField';
import { saveOverride, revertOverride } from '@/lib/overrides';

// Helper to parse goal strings like "10K", "500K", "1M" to numbers
const parseGoalString = (goal: string | number | null | undefined): number => {
  if (goal === null || goal === undefined) return 0;
  if (typeof goal === 'number') return goal;
  
  const str = String(goal).trim().toUpperCase();
  
  // Try to parse with K/M suffix
  const match = str.match(/^([\d,.]+)\s*([KMB])?$/);
  if (match) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2];
    if (suffix === 'K') return num * 1000;
    if (suffix === 'M') return num * 1000000;
    if (suffix === 'B') return num * 1000000000;
    return num;
  }
  
  // Try to parse as plain number
  const parsed = parseFloat(str.replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

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
  const [activeTab, setActiveTab] = useState("overview");
  const [editingSfaUrl, setEditingSfaUrl] = useState(false);
  const [sfaUrlInput, setSfaUrlInput] = useState('');
  const [savingSfaUrl, setSavingSfaUrl] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [suggestedInternalNotes, setSuggestedInternalNotes] = useState('');
  const [suggestedClientNotes, setSuggestedClientNotes] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);
  const [editingVendorCost, setEditingVendorCost] = useState<{ vendorId: string; vendorName: string; currentCost: number } | null>(null);
  const [vendorCostInput, setVendorCostInput] = useState<string>('');
  const [savingVendorCost, setSavingVendorCost] = useState(false);
  const [editingVendorAllocation, setEditingVendorAllocation] = useState<{ vendorId: string; vendorName: string; currentAllocated: number } | null>(null);
  const [vendorAllocationInput, setVendorAllocationInput] = useState<string>('');
  const [savingVendorAllocation, setSavingVendorAllocation] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    client_id: '',
    budget: '',
    stream_goal: '',
    remaining_streams: '',
    genre: '',
    duration_days: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch vendor responses for this campaign
  console.log('🔧 [v1.0.1-DEBUG] About to call useCampaignVendorResponses with ID:', campaign?.id);
  const { data: vendorResponses = [], isLoading: vendorResponsesLoading } = useCampaignVendorResponses(campaign?.id);
  const { data: isVendorManager = false } = useIsVendorManager();
  const { hasRole, user } = useAuth();
  const { data: salespeople = [] } = useSalespeople();
  const { data: payments = [] } = useVendorPaymentData();
  const { data: clientsList = [] } = useClients();
  
  // Fetch performance data for admin view
  const { data: performanceData, isLoading: performanceLoading } = useCampaignPerformanceData(campaign?.id);
  const { data: overallPerformance } = useCampaignOverallPerformance(campaign?.id);

  useEffect(() => {
    if (campaignData) {
      setInternalNotes(campaignData.internal_notes || campaignData.notes || '');
      setClientNotes(campaignData.client_notes || '');
      setSuggestedInternalNotes(campaignData.internal_notes || campaignData.notes || '');
      setSuggestedClientNotes(campaignData.client_notes || '');
    }
  }, [campaignData?.id]);

  const addNoteHistory = async (noteType: 'internal' | 'client', content: string) => {
    if (!content.trim()) return;
    await (supabase as any).from('campaign_note_history').insert({
      org_id: user?.org_id || '00000000-0000-0000-0000-000000000001',
      service: 'spotify',
      campaign_id: campaignData?.id || '',
      note_type: noteType,
      content,
      created_by: user?.id || null,
    });
  };

  const saveNoteOverride = async (
    fieldKey: 'internal_notes' | 'client_notes',
    value: string,
    reason?: string,
  ) => {
    if (!campaignData) return;
    const isSpotifyCampaign = typeof campaignData.id === 'number' ||
      (typeof campaignData.id === 'string' && !campaignData.id.includes('-')) ||
      campaignData.campaign !== undefined;
    const tableName = isSpotifyCampaign ? 'spotify_campaigns' : 'campaign_groups';

    setSavingNotes(true);
    try {
      const updatePayload =
        fieldKey === 'internal_notes'
          ? { internal_notes: value.trim() || null, notes: value.trim() || null }
          : { client_notes: value.trim() || null };

      const { error } = await (supabase as any)
        .from(tableName as string)
        .update({
          ...updatePayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignData.id);

      if (error) throw error;

      setCampaignData((prev: any) => ({
        ...prev,
        internal_notes: fieldKey === 'internal_notes' ? value.trim() : prev?.internal_notes,
        client_notes: fieldKey === 'client_notes' ? value.trim() : prev?.client_notes,
        notes: fieldKey === 'internal_notes' ? value.trim() : prev?.notes,
      }));

      if (fieldKey === 'internal_notes') {
        setInternalNotes(value);
        await addNoteHistory('internal', value);
      } else {
        setClientNotes(value);
        await addNoteHistory('client', value);
      }

      await saveOverride({
        service: 'spotify',
        campaignId: String(campaignData.id),
        fieldKey,
        originalValue: fieldKey === 'internal_notes' ? suggestedInternalNotes : suggestedClientNotes,
        overrideValue: value,
        overrideReason: reason,
        orgId: user?.org_id || '00000000-0000-0000-0000-000000000001',
        overriddenBy: user?.id || null,
      });

      toast({ title: 'Override saved', description: 'Override stored successfully.' });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to save override.',
        variant: 'destructive',
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const revertNoteOverride = async (fieldKey: 'internal_notes' | 'client_notes') => {
    if (!campaignData) return;
    const isSpotifyCampaign = typeof campaignData.id === 'number' ||
      (typeof campaignData.id === 'string' && !campaignData.id.includes('-')) ||
      campaignData.campaign !== undefined;
    const tableName = isSpotifyCampaign ? 'spotify_campaigns' : 'campaign_groups';
    const suggested = fieldKey === 'internal_notes' ? suggestedInternalNotes : suggestedClientNotes;

    setSavingNotes(true);
    try {
      const updatePayload =
        fieldKey === 'internal_notes'
          ? { internal_notes: suggested || null, notes: suggested || null }
          : { client_notes: suggested || null };

      const { error } = await (supabase as any)
        .from(tableName as string)
        .update({
          ...updatePayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignData.id);

      if (error) throw error;

      await revertOverride({
        service: 'spotify',
        campaignId: String(campaignData.id),
        fieldKey,
      });

      if (fieldKey === 'internal_notes') {
        setInternalNotes(suggested);
      } else {
        setClientNotes(suggested);
      }

      toast({ title: 'Override reverted', description: 'Reverted to suggested value.' });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Failed to revert override.',
        variant: 'destructive',
      });
    } finally {
      setSavingNotes(false);
    }
  };
  
  // Fetch campaign playlists (real scraped data) - separated into vendor and algorithmic
  const { data: campaignPlaylistsData = { vendor: [], algorithmic: [], unassigned: [] }, isLoading: playlistsLoading } = useQuery({
    queryKey: ['campaign-playlists', campaign?.id],
    queryFn: async () => {
      if (!campaign?.id) {
        return { vendor: [], algorithmic: [] };
      }
      
      // Detect if this is a spotify_campaign (integer ID) or campaign_group (UUID)
      const isSpotifyCampaign = typeof campaign.id === 'number' || 
                                 (typeof campaign.id === 'string' && !campaign.id.includes('-')) ||
                                 campaign.campaign !== undefined;
      
      let songIds: number[] = [];
      
      if (isSpotifyCampaign) {
        // Direct spotify_campaign - the ID itself is the song ID
        songIds = [typeof campaign.id === 'number' ? campaign.id : parseInt(campaign.id)];
        console.log('🔍 [Playlists] Using direct spotify_campaign ID:', songIds);
      } else {
        // Campaign group - fetch all songs in the group
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
        
        songIds = songs.map(s => s.id);
        console.log('🔍 [Playlists] Using campaign_group song IDs:', songIds);
      }
      
      if (songIds.length === 0) {
        return { vendor: [], algorithmic: [] };
      }
      
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
      
      const { data, error } = await query.order('streams_12m', { ascending: false });
      
      if (error) {
        console.error('Error fetching campaign playlists:', error);
        return { vendor: [], algorithmic: [] };
      }
      
      // Separate playlists into categories using the authoritative algorithmic pattern list:
      // 1. Algorithmic = is_algorithmic flag is true OR playlist name matches algorithmic patterns
      //    This ensures nothing slips through even if the scraper missed it
      const algorithmicPlaylists = (data || []).filter((p: any) => {
        const matchesPattern = isAlgorithmicPlaylist(p.playlist_name || '');
        // Use database flag OR pattern matching as fallback
        return (p.is_algorithmic === true || matchesPattern) && !p.vendor_id;
      });
      
      // 2. All non-algorithmic playlists
      const nonAlgorithmicPlaylists = (data || []).filter((p: any) => {
        const matchesPattern = isAlgorithmicPlaylist(p.playlist_name || '');
        return !p.is_algorithmic && !matchesPattern;
      });
      
      // 3. Organic playlists = playlists marked as organic (user playlists, not from vendors or algorithmic)
      const organicPlaylists = nonAlgorithmicPlaylists.filter((p: any) => p.is_organic === true);
      
      // 4. Vendor playlists = non-algorithmic, non-organic playlists only
      const vendorPlaylists = nonAlgorithmicPlaylists.filter((p: any) => !p.is_organic);
      
      // 5. Unassigned playlists = vendor playlists that need vendor assignment
      const unassignedPlaylists = vendorPlaylists.filter((p: any) => !p.vendor_id);
      
      console.log('✅ Found playlists - Vendor:', vendorPlaylists.length, 'Algorithmic:', algorithmicPlaylists.length, 'Organic:', organicPlaylists.length, 'Unassigned:', unassignedPlaylists.length);
      
      // Debug: Log unassigned playlists that need vendor assignment
      if (unassignedPlaylists.length > 0) {
        console.log('⚠️ Unassigned playlists (need vendor):', unassignedPlaylists.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.playlist_name,
          streams_12m: p.streams_12m
        })));
      }
      
      return {
        vendor: vendorPlaylists,
        algorithmic: algorithmicPlaylists,
        organic: organicPlaylists,
        unassigned: unassignedPlaylists
      };
    },
    enabled: !!campaign?.id && open
  });
  
  // Extract for easier access
  const campaignPlaylists = campaignPlaylistsData.vendor || [];
  const algorithmicPlaylists = campaignPlaylistsData.algorithmic || [];
  const organicPlaylists = campaignPlaylistsData.organic || [];
  const unassignedPlaylists = campaignPlaylistsData.unassigned || [];

  const { data: regionData = [], isLoading: regionsLoading } = useQuery({
    queryKey: ['campaign-regions', campaign?.id],
    queryFn: async () => {
      if (!campaign?.id) return [];

      const isSpotifyCampaign = typeof campaign.id === 'number' ||
                                 (typeof campaign.id === 'string' && !campaign.id.includes('-')) ||
                                 campaign.campaign !== undefined;

      let songIds: number[] = [];

      if (isSpotifyCampaign) {
        songIds = [typeof campaign.id === 'number' ? campaign.id : parseInt(campaign.id)];
      } else {
        const { data: songs } = await supabase
          .from('spotify_campaigns')
          .select('id')
          .eq('campaign_group_id', campaign.id);
        songIds = (songs || []).map((s: any) => s.id);
      }

      if (songIds.length === 0) return [];

      let query = supabase
        .from('campaign_regions')
        .select('*');

      if (songIds.length === 1) {
        query = query.eq('campaign_id', songIds[0]);
      } else {
        query = query.in('campaign_id', songIds);
      }

      const { data, error } = await query.order('rank', { ascending: true });
      if (error) {
        console.error('Error fetching campaign regions:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!campaign?.id && open,
  });
  
  // Fetch all vendor playlists for name matching
  const { data: vendorPlaylistsForMatching = [] } = useQuery({
    queryKey: ['vendor-playlists-for-matching'],
    queryFn: async () => {
      const { data } = await supabase
        .from('playlists')
        .select('id, name, vendor_id, vendors(id, name)')
        .not('vendor_id', 'is', null);
      return data || [];
    },
    enabled: open && unassignedPlaylists.length > 0
  });
  
  // Function to find matching vendor by playlist name (case-insensitive)
  const findMatchingVendor = (playlistName: string): { vendorId: string; vendorName: string; playlistId: string } | null => {
    if (!playlistName) return null;
    const normalizedName = playlistName.toLowerCase().trim();
    const match = vendorPlaylistsForMatching.find(
      (p: any) => p.name?.toLowerCase().trim() === normalizedName
    );
    if (match) {
      return {
        vendorId: match.vendor_id,
        vendorName: (match.vendors as any)?.name || 'Unknown Vendor',
        playlistId: match.id
      };
    }
    return null;
  };
  
  // Get all unassigned playlists with their matching status
  const unassignedWithMatches = unassignedPlaylists.map((playlist: any) => {
    const match = findMatchingVendor(playlist.playlist_name);
    return { ...playlist, suggestedMatch: match };
  });
  
  // Count matches found
  const matchesFound = unassignedWithMatches.filter((p: any) => p.suggestedMatch).length;
  
  // State for bulk assign loading
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  
  // State for stream view mode toggle (total vs playlist-only)

  
  // Auto-assign all matched playlists
  const handleAutoAssignAll = async () => {
    const playlistsWithMatches = unassignedWithMatches.filter((p: any) => p.suggestedMatch);
    if (playlistsWithMatches.length === 0) return;
    
    setIsAutoAssigning(true);
    try {
      let successCount = 0;
      for (const playlist of playlistsWithMatches) {
        const { error } = await supabase
          .from('campaign_playlists')
          .update({ vendor_id: playlist.suggestedMatch.vendorId })
          .eq('id', playlist.id);
        
        if (!error) successCount++;
      }
      
      queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign?.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      
      toast({
        title: "Auto-Assign Complete",
        description: `Successfully assigned ${successCount} of ${playlistsWithMatches.length} playlists to their matching vendors.`,
      });
    } catch (error: any) {
      console.error('Auto-assign error:', error);
      toast({
        title: "Error",
        description: "Failed to auto-assign some playlists.",
        variant: "destructive"
      });
    } finally {
      setIsAutoAssigning(false);
    }
  };
  
  const canEditCampaign = true;

  useEffect(() => {
    if (campaign?.id && open) {
      fetchCampaignDetails();
    }
  }, [campaign?.id, open]);

  const fetchCampaignDetails = async () => {
    if (!campaign?.id) return;
    
    console.log('🔄 [v1.0.3] Fetching comprehensive campaign details');
    setLoading(true);
    try {
      // Detect if this is a spotify_campaign (integer ID, has 'campaign' field) 
      // or a campaign_group (UUID, has 'name' field)
      const isSpotifyCampaign = typeof campaign.id === 'number' || 
                                 (typeof campaign.id === 'string' && !campaign.id.includes('-')) ||
                                 campaign.campaign !== undefined;
      
      console.log('🔍 [v1.0.3] Campaign type detection:', { 
        id: campaign.id, 
        isSpotifyCampaign,
        hasCampaignField: campaign.campaign !== undefined,
        hasNameField: campaign.name !== undefined
      });

      let campaignGroup: any = null;
      let songs: any[] = [];

      if (isSpotifyCampaign) {
        // This is a direct spotify_campaign - fetch it and optionally its group
        const { data: spotifyCampaign, error: scError } = await supabase
          .from('spotify_campaigns')
          .select('*')
          .eq('id', campaign.id)
          .single();
        
        if (scError) {
          console.error('Error fetching spotify_campaign:', scError);
          throw scError;
        }
        
        songs = [spotifyCampaign];
        
        // Try to fetch the campaign group if it exists
        if (spotifyCampaign.campaign_group_id) {
          const { data: group } = await supabase
            .from('campaign_groups')
            .select(`
              *,
              clients (
                id,
                name,
                emails
              )
            `)
            .eq('id', spotifyCampaign.campaign_group_id)
            .single();
          
          if (group) {
            campaignGroup = group;
          }
        }
        
        // If no group found, construct a pseudo-group from the spotify_campaign data
        if (!campaignGroup) {
          // Fetch client info if we have client_id
          let clientInfo = null;
          if (spotifyCampaign.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('id, name, emails')
              .eq('id', spotifyCampaign.client_id)
              .single();
            clientInfo = client;
          }
          
          campaignGroup = {
            id: spotifyCampaign.id,
            name: spotifyCampaign.campaign,
            artist_name: spotifyCampaign.client,
            status: spotifyCampaign.status || 'Active',
            start_date: spotifyCampaign.start_date,
            total_budget: spotifyCampaign.sale_price,
            total_goal: spotifyCampaign.goal,
            notes: spotifyCampaign.notes,
            clients: clientInfo,
            client_id: spotifyCampaign.client_id,
          };
        }
      } else {
        // This is a campaign_group - use the original logic
        const { data: group, error: groupError } = await supabase
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
        campaignGroup = group;

        // Fetch all songs (spotify_campaigns) in this campaign group
        const { data: groupSongs, error: songsError } = await supabase
          .from('spotify_campaigns')
          .select('*')
          .eq('campaign_group_id', campaign.id);
        
        if (songsError) throw songsError;
        songs = groupSongs || [];
      }

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
          .select('playlist_name, playlist_curator, streams_12m, streams_7d, streams_12m')
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
            .reduce((sum, p) => sum + (p.streams_12m || 0), 0);
          
          // Calculate Discover Weekly streams
          discoverWeeklyStreams = algorithmicPlaylists
            .filter(p => p.playlist_name?.toLowerCase().includes('discover weekly'))
            .reduce((sum, p) => sum + (p.streams_12m || 0), 0);
          
          // Calculate total algorithmic streams (all Spotify algorithmic playlists)
          totalAlgorithmicStreams = algorithmicPlaylists
            .reduce((sum, p) => sum + (p.streams_12m || 0), 0);
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

      // Calculate total budget from songs if campaign_group doesn't have it
      // spotify_campaigns.sale_price contains the budget per song
      let totalBudget = parseFloat(campaignGroup.total_budget) || 0;
      if (totalBudget === 0 && songs && songs.length > 0) {
        // Sum up sale_price from all songs in the campaign
        totalBudget = songs.reduce((sum, song) => {
          const salePrice = parseFloat(song.sale_price) || 0;
          return sum + salePrice;
        }, 0);
        console.log('💰 [Budget] Calculated from songs sale_price:', totalBudget, 'from', songs.length, 'songs');
      }
      
      // Merge all data into campaignData
      const enrichedData = {
        ...campaignGroup,
        client_name: campaignGroup.clients?.name || campaignGroup.client_id,
        budget: totalBudget,
        stream_goal: parseGoalString(campaignGroup.total_goal),
        remaining_streams: totalRemaining || parseGoalString(campaignGroup.total_goal),
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
      if (campaignGroup?.selected_playlists && Array.isArray(campaignGroup.selected_playlists) && campaignGroup.selected_playlists.length > 0) {
        // Check if selected_playlists contains string IDs or full objects
        const isStringArray = typeof campaignGroup.selected_playlists[0] === 'string';
        
        if (isStringArray) {
          // Fetch full playlist details from database
          try {
            const playlistIds = campaignGroup.selected_playlists.filter((id): id is string => typeof id === 'string');
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
          const playlistsWithStatus = (campaignGroup.selected_playlists as any[]).map(playlist => ({
            ...playlist,
            status: playlist.status || 'Pending',
            placed_date: playlist.placed_date || null
          }));
          setPlaylists(playlistsWithStatus);
        }
      } else if (((campaignGroup?.algorithm_recommendations as any)?.allocations) && Array.isArray((campaignGroup.algorithm_recommendations as any).allocations)) {
        // Fallback to algorithm recommendations
        try {
          const allocations = (campaignGroup.algorithm_recommendations as any).allocations;
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
    if (!campaign?.id) return;

    try {
      // Get the spotify_campaign (song) for this campaign group
      const { data: songs, error: songsError } = await supabase
        .from('spotify_campaigns')
        .select('id')
        .eq('campaign_group_id', campaign.id)
        .limit(1);

      if (songsError || !songs || songs.length === 0) {
        throw new Error('No campaign song found');
      }

      const campaignSongId = songs[0].id;

      // Create campaign_playlists entries for each selected playlist
      const campaignPlaylistsEntries = selectedPlaylists.map(playlist => ({
        campaign_id: campaignSongId,
        playlist_name: playlist.name,
        vendor_id: playlist.vendor_id,
        playlist_curator: playlist.vendor_name || null,
        is_algorithmic: false,
        streams_12m: 0,
        streams_7d: 0,
        streams_12m: 0,
        org_id: '00000000-0000-0000-0000-000000000001'
      }));

      const { error: insertError } = await supabase
        .from('campaign_playlists')
        .insert(campaignPlaylistsEntries);

      if (insertError) throw insertError;

      // Invalidate queries to refresh the playlist list
      queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign.id] });
      
      toast({
        title: "Success",
        description: `Added ${selectedPlaylists.length} playlist${selectedPlaylists.length !== 1 ? 's' : ''} to campaign`,
      });
    } catch (error: any) {
      console.error('Failed to add playlists:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add playlists",
        variant: "destructive",
      });
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
      await saveOverride({
        service: 'spotify',
        campaignId: String(campaign!.id),
        fieldKey: 'salesperson',
        originalValue: campaignData?.salesperson || '',
        overrideValue: newSalesperson,
        overrideReason: 'Manual override',
        orgId: user?.org_id || '00000000-0000-0000-0000-000000000001',
        overriddenBy: user?.id || null,
      });
      
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

  const startEditingDetails = () => {
    setDetailsForm({
      client_id: campaignData?.client_id || campaignData?.clients?.id || '',
      budget: String(campaignData?.budget || ''),
      stream_goal: String(campaignData?.stream_goal || ''),
      remaining_streams: String(campaignData?.remaining_streams || ''),
      genre: campaignData?.sub_genre === 'Not specified' ? '' : (campaignData?.sub_genre || ''),
      duration_days: String(campaignData?.duration_days || ''),
    });
    setIsEditingDetails(true);
  };

  const cancelEditingDetails = () => {
    setIsEditingDetails(false);
  };

  const saveDetailsEdits = async () => {
    if (!campaign?.id) return;
    setSavingDetails(true);
    try {
      const newBudget = parseFloat(detailsForm.budget) || 0;
      const newGoal = parseFloat(detailsForm.stream_goal) || 0;
      const newRemaining = parseFloat(detailsForm.remaining_streams) || 0;
      const newDuration = parseInt(detailsForm.duration_days) || 0;
      const newGenre = detailsForm.genre.trim();
      const newClientId = detailsForm.client_id || null;

      const isSpotifyCampaign = typeof campaign.id === 'number' ||
        (typeof campaign.id === 'string' && !campaign.id.includes('-')) ||
        campaign.campaign !== undefined;

      const campaignGroupId = isSpotifyCampaign
        ? campaignData?.campaign_group_id || campaign.id
        : campaign.id;

      const endDate = campaignData?.start_date && newDuration > 0
        ? new Date(new Date(campaignData.start_date).getTime() + newDuration * 86400000).toISOString()
        : undefined;

      const groupUpdate: Record<string, any> = {
        total_budget: newBudget,
        total_goal: String(newGoal),
        notes: newGenre || null,
        client_id: newClientId,
        updated_at: new Date().toISOString(),
      };
      if (endDate) groupUpdate.end_date = endDate;

      const { error: groupError } = await supabase
        .from('campaign_groups')
        .update(groupUpdate)
        .eq('id', campaignGroupId);

      if (groupError) throw groupError;

      if (campaignData?.songs?.length) {
        const oldTotalRemaining = campaignData.songs.reduce(
          (sum: number, s: any) => sum + (parseInt(s.remaining) || 0), 0
        );
        if (campaignData.songs.length === 1) {
          await supabase
            .from('spotify_campaigns')
            .update({ remaining: String(Math.round(newRemaining)) })
            .eq('id', campaignData.songs[0].id);
        } else if (oldTotalRemaining > 0) {
          const ratio = newRemaining / oldTotalRemaining;
          for (const song of campaignData.songs) {
            const songRemaining = parseInt(song.remaining) || 0;
            await supabase
              .from('spotify_campaigns')
              .update({ remaining: String(Math.round(songRemaining * ratio)) })
              .eq('id', song.id);
          }
        }
      }

      const clientInfo = newClientId
        ? clientsList.find((c: any) => c.id === newClientId)
        : null;

      setCampaignData((prev: any) => ({
        ...prev,
        client_id: newClientId,
        client_name: clientInfo?.name || prev?.client_name,
        clients: clientInfo ? { id: clientInfo.id, name: clientInfo.name } : prev?.clients,
        budget: newBudget,
        stream_goal: newGoal,
        remaining_streams: newRemaining,
        sub_genre: newGenre || 'Not specified',
        duration_days: newDuration,
      }));

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });

      setIsEditingDetails(false);
      toast({ title: "Success", description: "Campaign details updated" });
    } catch (error) {
      console.error('Failed to update campaign details:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign details",
        variant: "destructive",
      });
    } finally {
      setSavingDetails(false);
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
  // Use campaignPlaylistsData.vendor but exclude organic playlists (they don't count toward vendor payments)
  const playlistsForPayments = (campaignPlaylistsData?.vendor || []).filter((p: any) => !p.is_organic);
  const groupedPlaylists = playlistsForPayments.reduce((acc, playlist, idx) => {
    // Use 'unassigned' key for playlists without vendor_id
    const vendorId = playlist.vendor_id || 'unassigned';
    
    // Access vendor name from the vendors join (not vendor_name)
    const vendorName = playlist.vendor_id 
      ? (playlist.vendors?.name || playlist.vendor_name || 'Unknown Vendor')
      : 'Unassigned';
    
    // Get cost per 1k: use campaign-specific override if set, otherwise vendor default
    const vendorDefaultCost = playlist.vendors?.cost_per_1k_streams || 0;
    const effectiveCostPer1k = playlist.cost_per_1k_override ?? vendorDefaultCost;
    const hasOverride = playlist.cost_per_1k_override !== null && playlist.cost_per_1k_override !== undefined;
    
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
        totalStreams: 0, // Sum of actual streams from campaign_playlists
        vendorPerformance: vendorPerf,
        costPer1k: effectiveCostPer1k, // Use the effective cost (override or default)
        vendorDefaultCost: vendorDefaultCost,
        hasOverride: hasOverride,
        totalPayment: 0, // Will be calculated after processing all playlists
        paymentStatus: 'Unpaid', // Default status - can be enhanced later
        hasNotes: Boolean(vendorResponse?.response_notes?.trim()),
        notes: vendorResponse?.response_notes || ''
      };
    }
    
    // Find performance data for this specific playlist
    const playlistPerf = acc[vendorId].vendorPerformance?.playlists?.find(p => p.id === playlist.id);
    
    // Use 12m streams from the campaign_playlists data (actual scraped data)
    const playlistStreams = playlist.streams_12m || playlist.streams_7d || playlist.streams_24h || 0;
    
    acc[vendorId].playlists.push({
      ...playlist,
      idx,
      allocated: playlistPerf?.allocated_streams || playlistStreams,
      actual: playlistPerf?.actual_streams || playlistStreams
    });
    
    acc[vendorId].totalAllocated += playlistPerf?.allocated_streams || playlistStreams;
    acc[vendorId].totalActual += playlistPerf?.actual_streams || playlistStreams;
    acc[vendorId].totalStreams += playlistStreams;
    
    return acc;
  }, {} as Record<string, any>);

  // Get stored vendor allocations from campaign_groups.vendor_allocations
  const storedVendorAllocations = (campaignData?.vendor_allocations as Record<string, { allocated_streams?: number; allocated_budget?: number }>) || {};
  
  // Get total campaign stream goal for proportional allocation fallback
  const campaignStreamGoal = campaignData?.stream_goal || 0;
  
  // Calculate total actual streams across all vendors for proportion calculation
  const totalActualStreamsAllVendors = Object.values(groupedPlaylists).reduce(
    (sum: number, v: any) => sum + (v.totalStreams || 0), 0
  );

  // Calculate total payment for each vendor after processing all playlists
  Object.keys(groupedPlaylists).forEach(vendorId => {
    const vendorGroup = groupedPlaylists[vendorId];
    
    // Determine allocated streams with priority:
    // 1. Stored allocation override (manual entry)
    // 2. Proportional split of campaign goal based on vendor's actual stream contribution
    // 3. Fall back to actual delivered streams (best available data)
    const storedAllocation = storedVendorAllocations[vendorId];
    if (storedAllocation?.allocated_streams !== undefined && storedAllocation.allocated_streams > 0) {
      // Use manually set allocation
      vendorGroup.totalAllocated = storedAllocation.allocated_streams;
    } else if (campaignStreamGoal > 0 && totalActualStreamsAllVendors > 0) {
      // Calculate proportional split of campaign goal based on this vendor's share of actual streams
      const vendorProportion = vendorGroup.totalStreams / totalActualStreamsAllVendors;
      vendorGroup.totalAllocated = Math.round(campaignStreamGoal * vendorProportion);
    } else {
      // No goal set - use actual delivered streams as the "allocated" value
      // This provides meaningful data when campaign goals aren't configured
      vendorGroup.totalAllocated = vendorGroup.totalStreams || vendorGroup.totalActual || 0;
    }
    
    console.log(`Allocation calc for ${vendorGroup.vendorName}: stored=${storedAllocation?.allocated_streams}, goal=${campaignStreamGoal}, totalActual=${totalActualStreamsAllVendors}, vendorStreams=${vendorGroup.totalStreams} => allocated=${vendorGroup.totalAllocated}`);
    
    const allocatedStreams = vendorGroup.totalAllocated || 0;
    const costPer1k = vendorGroup.costPer1k || 0;
    vendorGroup.totalPayment = (allocatedStreams / 1000) * costPer1k;
    
    console.log(`Payment calc for ${vendorGroup.vendorName}: ${allocatedStreams} allocated streams × $${costPer1k}/1k = $${vendorGroup.totalPayment}`);
    
    // PAYMENT STATUS: Check campaign_playlists.vendor_paid for THIS SPECIFIC VENDOR
    // This is the primary source - per-vendor payment tracking in campaign_playlists
    const vendorPlaylists = vendorGroup.playlists || [];
    const hasVendorPaidData = vendorPlaylists.some((p: any) => p.vendor_paid !== undefined && p.vendor_paid !== null);
    
    if (hasVendorPaidData) {
      // Check if ALL playlists for this vendor are marked as paid
      const allPlaylistsPaid = vendorPlaylists.every((p: any) => p.vendor_paid === true);
      const anyPlaylistPaid = vendorPlaylists.some((p: any) => p.vendor_paid === true);
      
      if (allPlaylistsPaid && vendorPlaylists.length > 0) {
        vendorGroup.paymentStatus = 'Paid';
      } else if (anyPlaylistPaid) {
        vendorGroup.paymentStatus = 'Partial'; // Some paid, some not
      } else {
        vendorGroup.paymentStatus = 'Unpaid';
      }
    } else {
      // Fallback: Check performance data or spotify_campaigns.paid_vendor
      const hasUnpaidAllocations = vendorGroup.vendorPerformance?.playlists?.some((p: any) => 
        p.payment_status !== 'paid'
      );
      
      if (vendorGroup.vendorPerformance?.playlists?.length > 0) {
        vendorGroup.paymentStatus = hasUnpaidAllocations ? 'Unpaid' : 'Paid';
      } else {
        vendorGroup.paymentStatus = 'Unpaid'; // Default to unpaid if no data
      }
    }
    
    console.log(`Payment status for ${vendorGroup.vendorName}:`, vendorGroup.paymentStatus, 
      '- playlists:', vendorPlaylists.map((p: any) => ({ name: p.playlist_name, paid: p.vendor_paid })));
  });

  const toggleVendor = (vendorId: string) => {
    setExpandedVendors(prev => ({
      ...prev,
      [vendorId]: !prev[vendorId]
    }));
  };

  const markVendorPaymentAsPaid = async (campaignId: string, vendorId: string, vendorName: string, amount: number) => {
    // Validate vendorId is a valid UUID (not 'unknown' or 'unassigned')
    if (!vendorId || vendorId === 'unknown' || vendorId === 'unassigned' || vendorId.length !== 36) {
      console.error('Invalid vendor ID:', vendorId);
      toast({
        title: "Error",
        description: "Cannot mark payment - vendor ID is invalid or unassigned. Please assign a vendor first.",
        variant: "destructive"
      });
      return;
    }
    
    const paymentKey = `${campaignId}-${vendorId}`;
    setMarkingPaid(prev => ({ ...prev, [paymentKey]: true }));
    
    try {
      console.log('💰 [MarkPaid] Updating payment for SPECIFIC vendor:', { campaignId, vendorId, vendorName, amount });
      
      let updateSucceeded = false;
      let spotifyCampaignIds: number[] = [];
      
      // STEP 1: Determine if campaignId is a campaign_group UUID or spotify_campaign integer
      // UUIDs have dashes, integers don't
      const isCampaignGroupId = typeof campaignId === 'string' && campaignId.includes('-');
      
      if (isCampaignGroupId) {
        // It's a campaign_group UUID - fetch all spotify_campaigns for this group
        const { data: spotifyCampaigns, error: scError } = await supabase
          .from('spotify_campaigns')
          .select('id')
          .eq('campaign_group_id', campaignId);
        
        if (scError) {
          console.error('💰 [MarkPaid] Failed to fetch spotify_campaigns:', scError);
        }
        spotifyCampaignIds = spotifyCampaigns?.map(sc => sc.id) || [];
      } else {
        // It's a spotify_campaign integer ID directly
        const parsedId = parseInt(String(campaignId), 10);
        if (!isNaN(parsedId)) {
          spotifyCampaignIds = [parsedId];
        }
      }
      
      console.log('💰 [MarkPaid] Campaign ID type:', isCampaignGroupId ? 'campaign_group' : 'spotify_campaign');
      console.log('💰 [MarkPaid] Found spotify_campaign IDs:', spotifyCampaignIds);
      
      // STEP 2: Update campaign_playlists for THIS SPECIFIC VENDOR ONLY
      // This is per-vendor payment tracking - MUST filter by vendor_id
      if (spotifyCampaignIds.length > 0) {
        const { data: playlistRows, error: playlistError } = await supabase
          .from('campaign_playlists')
          .update({ 
            vendor_paid: true,
            vendor_payment_date: new Date().toISOString().split('T')[0],
            vendor_payment_amount: amount
          })
          .eq('vendor_id', vendorId) // CRITICAL: Only update THIS vendor
          .in('campaign_id', spotifyCampaignIds) // For this campaign's songs
          .select('id, playlist_name, vendor_id, vendor_paid');

        console.log('💰 [MarkPaid] campaign_playlists update result:', { 
          updatedRows: playlistRows?.length || 0, 
          rowsData: playlistRows?.map(r => ({ id: r.id, name: r.playlist_name, vendor: r.vendor_id })),
          error: playlistError 
        });
        
        if (!playlistError && playlistRows && playlistRows.length > 0) {
          updateSucceeded = true;
        }
      }
      
      // STEP 3: Also try campaign_allocations_performance (if exists)
      if (!updateSucceeded) {
        const { data: updatedAllocations, error: allocError } = await supabase
          .from('campaign_allocations_performance')
          .update({
            payment_status: 'paid',
            paid_amount: amount,
            paid_date: new Date().toISOString(),
            payment_method: 'manual',
            updated_at: new Date().toISOString()
          })
          .eq('campaign_id', campaignId)
          .eq('vendor_id', vendorId) // CRITICAL: Only update THIS vendor
          .select();

        console.log('💰 [MarkPaid] campaign_allocations_performance result:', { updatedRows: updatedAllocations?.length, error: allocError });

        if (!allocError && updatedAllocations && updatedAllocations.length > 0) {
          updateSucceeded = true;
        }
      }
      
      if (!updateSucceeded) {
        console.warn('💰 [MarkPaid] No rows updated - vendor may not have playlists in this campaign');
        // Still consider it a success if we tried - the vendor might just not have playlist data yet
      }
      
      // Show success toast immediately
      toast({
        title: "Payment Marked as Paid",
        description: `Payment of $${amount.toFixed(2)} to ${vendorName} has been recorded.`,
      });
      
      // Invalidate relevant queries to ensure data refreshes in background
      queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      // Note: We don't call fetchCampaignDetails() here because it sets loading=true
      // which causes the modal to flash to "Loading..." state
      // The query invalidation above will trigger a background refresh
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

  const saveSfaUrl = async () => {
    if (!sfaUrlInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setSavingSfaUrl(true);
    
    try {
      // Update the sfa field in spotify_campaigns for this campaign's song
      const { data: songs, error: songsError } = await supabase
        .from('spotify_campaigns')
        .select('id')
        .eq('campaign_group_id', campaign.id)
        .limit(1);

      if (songsError) throw songsError;
      
      if (!songs || songs.length === 0) {
        toast({
          title: "Error",
          description: "No campaign song found",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('spotify_campaigns')
        .update({ 
          sfa: sfaUrlInput.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', songs[0].id);

      if (error) throw error;
      
      // Update local state
      setCampaignData(prev => ({ ...prev, sfa: sfaUrlInput.trim() }));
      setEditingSfaUrl(false);
      
      toast({
        title: "Success",
        description: "Spotify for Artists link updated successfully",
      });
    } catch (error) {
      console.error('Failed to update SFA URL:', error);
      toast({
        title: "Error",
        description: "Failed to update Spotify for Artists link",
        variant: "destructive",
      });
    } finally {
      setSavingSfaUrl(false);
    }
  };

  // Save campaign-specific vendor cost override
  const saveVendorCostOverride = async () => {
    if (!editingVendorCost) return;
    
    const newCost = parseFloat(vendorCostInput);
    if (isNaN(newCost) || newCost < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid cost (0 or greater)",
        variant: "destructive",
      });
      return;
    }

    setSavingVendorCost(true);
    
    try {
      // Get the campaign's song IDs
      let songIds: number[] = [];
      
      if (typeof campaign.id === 'number' || (typeof campaign.id === 'string' && !campaign.id.includes('-'))) {
        songIds = [parseInt(campaign.id.toString())];
      } else {
        const { data: songs } = await supabase
          .from('spotify_campaigns')
          .select('id')
          .eq('campaign_group_id', campaign.id);
        songIds = songs?.map(s => s.id) || [];
      }

      if (songIds.length === 0) {
        throw new Error('No campaign songs found');
      }

      // Update cost_per_1k_override for all playlists from this vendor in this campaign
      const { error } = await supabase
        .from('campaign_playlists')
        .update({ cost_per_1k_override: newCost })
        .in('campaign_id', songIds)
        .eq('vendor_id', editingVendorCost.vendorId);

      if (error) throw error;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign.id] });
      
      toast({
        title: "Success",
        description: `Cost per 1k for ${editingVendorCost.vendorName} updated to $${newCost} for this campaign`,
      });
      
      setEditingVendorCost(null);
      setVendorCostInput('');
    } catch (error) {
      console.error('Failed to update vendor cost:', error);
      toast({
        title: "Error",
        description: "Failed to update vendor cost",
        variant: "destructive",
      });
    } finally {
      setSavingVendorCost(false);
    }
  };

  // Save vendor allocation override to campaign_groups.vendor_allocations
  const saveVendorAllocationOverride = async () => {
    if (!editingVendorAllocation) return;
    
    const newAllocation = parseInt(vendorAllocationInput);
    if (isNaN(newAllocation) || newAllocation < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid stream count (0 or greater)",
        variant: "destructive",
      });
      return;
    }

    setSavingVendorAllocation(true);
    
    try {
      // Get the campaign group ID
      const campaignGroupId = typeof campaign.id === 'string' && campaign.id.includes('-') 
        ? campaign.id 
        : null;
      
      if (!campaignGroupId) {
        throw new Error('Campaign group ID not found');
      }

      // Fetch current vendor_allocations
      const { data: currentCampaign, error: fetchError } = await supabase
        .from('campaign_groups')
        .select('vendor_allocations')
        .eq('id', campaignGroupId)
        .single();

      if (fetchError) throw fetchError;

      // Merge new allocation with existing allocations
      const existingAllocations = (currentCampaign?.vendor_allocations as Record<string, any>) || {};
      const updatedAllocations = {
        ...existingAllocations,
        [editingVendorAllocation.vendorId]: {
          ...(existingAllocations[editingVendorAllocation.vendorId] || {}),
          allocated_streams: newAllocation,
        }
      };

      // Update campaign_groups.vendor_allocations
      const { error } = await supabase
        .from('campaign_groups')
        .update({ vendor_allocations: updatedAllocations })
        .eq('id', campaignGroupId);

      if (error) throw error;

      // Update local campaignData immediately so UI reflects the change
      setCampaignData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          vendor_allocations: updatedAllocations,
        };
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-details', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      toast({
        title: "Success",
        description: `Allocated streams for ${editingVendorAllocation.vendorName} updated to ${newAllocation.toLocaleString()}`,
      });
      
      setEditingVendorAllocation(null);
      setVendorAllocationInput('');
    } catch (error) {
      console.error('Failed to update vendor allocation:', error);
      toast({
        title: "Error",
        description: "Failed to update vendor allocation",
        variant: "destructive",
      });
    } finally {
      setSavingVendorAllocation(false);
    }
  };

  const startEditingSfaUrl = () => {
    setSfaUrlInput(campaignData?.sfa || '');
    setEditingSfaUrl(true);
  };

  const cancelEditingSfaUrl = () => {
    setEditingSfaUrl(false);
    setSfaUrlInput('');
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              Campaign Details
            </TabsTrigger>
            <TabsTrigger value="playlists" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Playlists
            </TabsTrigger>
            <TabsTrigger value="regions" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Regions
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

          {/* SFA Link Missing Alert */}
          {!campaignData?.sfa && (
            <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">Missing Spotify for Artists Link</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                This campaign does not have a Spotify for Artists link. Without this link, real-time streaming data cannot be populated from the scraper. 
                {canEditCampaign && ' Please add the SFA link in the Campaign Details section below.'}
              </AlertDescription>
            </Alert>
          )}

          <TabsContent value="overview" className="space-y-6">
          {/* Campaign Info */}
          <div className="relative p-4 bg-card rounded-lg">
            {canEditCampaign && !isEditingDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={startEditingDetails}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {isEditingDetails && (
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={cancelEditingDetails}
                  disabled={savingDetails}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400"
                  onClick={saveDetailsEdits}
                  disabled={savingDetails}
                >
                  {savingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Client</Label>
              {isEditingDetails ? (
                <Select
                  value={detailsForm.client_id}
                  onValueChange={(val) => setDetailsForm(f => ({ ...f, client_id: val }))}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsList.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium">{campaignData?.client_name || campaignData?.client}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Budget</Label>
              {isEditingDetails ? (
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    value={detailsForm.budget}
                    onChange={(e) => setDetailsForm(f => ({ ...f, budget: e.target.value }))}
                    className="pl-7"
                    placeholder="0"
                  />
                </div>
              ) : (
                <p className="font-medium">
                  {campaignData?.budget && campaignData.budget > 0 
                    ? `$${campaignData.budget.toLocaleString()}` 
                    : <span className="text-muted-foreground">Not set</span>
                  }
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Stream Goal</Label>
              {isEditingDetails ? (
                <Input
                  type="number"
                  value={detailsForm.stream_goal}
                  onChange={(e) => setDetailsForm(f => ({ ...f, stream_goal: e.target.value }))}
                  className="mt-1"
                  placeholder="0"
                />
              ) : (
                <p className="font-medium">{campaignData?.stream_goal?.toLocaleString()}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Remaining Streams</Label>
              {isEditingDetails ? (
                <Input
                  type="number"
                  value={detailsForm.remaining_streams}
                  onChange={(e) => setDetailsForm(f => ({ ...f, remaining_streams: e.target.value }))}
                  className="mt-1"
                  placeholder="0"
                />
              ) : (
                <p className="font-medium">{(campaignData?.remaining_streams || campaignData?.stream_goal)?.toLocaleString()}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Genre</Label>
              {isEditingDetails ? (
                <Input
                  value={detailsForm.genre}
                  onChange={(e) => setDetailsForm(f => ({ ...f, genre: e.target.value }))}
                  className="mt-1"
                  placeholder="e.g. Hip-Hop, Pop"
                />
              ) : (
                <p className="font-medium">{campaignData?.sub_genre || 'Not specified'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Duration</Label>
              {isEditingDetails ? (
                <div className="relative mt-1">
                  <Input
                    type="number"
                    value={detailsForm.duration_days}
                    onChange={(e) => setDetailsForm(f => ({ ...f, duration_days: e.target.value }))}
                    className="pr-14"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">days</span>
                </div>
              ) : (
                <p className="font-medium">{campaignData?.duration_days} days</p>
              )}
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
            {campaignData?.source_invoice_id && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">Invoice ID</Label>
                <p className="font-medium">{campaignData.source_invoice_id}</p>
              </div>
            )}
            <div className="col-span-2">
              <Label className="text-muted-foreground">Spotify for Artists Link</Label>
              {editingSfaUrl ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="url"
                    placeholder="https://artists.spotify.com/c/song/..."
                    value={sfaUrlInput}
                    onChange={(e) => setSfaUrlInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={saveSfaUrl} 
                    disabled={savingSfaUrl}
                    size="sm"
                  >
                    {savingSfaUrl ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    onClick={cancelEditingSfaUrl} 
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              ) : campaignData?.sfa ? (
                <div className="flex items-center gap-2 mt-1">
                  <a 
                    href={campaignData.sfa} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    View Stream Data on Spotify for Artists
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {canEditCampaign && (
                    <Button 
                      onClick={startEditingSfaUrl} 
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              ) : canEditCampaign ? (
                <Button 
                  onClick={startEditingSfaUrl} 
                  variant="outline"
                  size="sm"
                  className="mt-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Spotify for Artists Link
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No Spotify for Artists link added</p>
              )}
            </div>
            </div>
          </div>
          
          {/* Algorithmic Streaming Data (External Sources) */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Radio className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-lg">Algorithmic Streaming Data</span>
              <Badge variant="secondary">{algorithmicPlaylists.length} Active</Badge>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {algorithmicPlaylists.reduce((sum: number, p: any) => sum + (p.streams_24h || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Last 24 Hours</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {algorithmicPlaylists.reduce((sum: number, p: any) => sum + (p.streams_7d || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Last 7 Days</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {algorithmicPlaylists.reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Last 12 Months</div>
              </div>
            </div>

            {/* All Algorithmic Playlists Table */}
            {(() => {
              // Define all possible algorithmic playlist types
              const ALL_ALGO_TYPES = [
                'Radio',
                'Discover Weekly', 
                'Your DJ',
                'Mixes',
                'On Repeat',
                'Daylist',
                'Repeat Rewind',
                'Smart Shuffle',
                'Blend',
                'Your Daily Drive',
                'Release Radar',
                'Your Top Songs 2025',
                'Your Top Songs 2024',
              ];
              
              // Create a map of existing data by playlist name (case insensitive)
              const algoDataMap = new Map<string, { streams_24h: number; streams_7d: number; streams_12m: number }>();
              algorithmicPlaylists.forEach((p: any) => {
                const name = (p.playlist_name || '').toLowerCase().trim();
                const existing = algoDataMap.get(name) || { streams_24h: 0, streams_7d: 0, streams_12m: 0 };
                algoDataMap.set(name, {
                  streams_24h: existing.streams_24h + (p.streams_24h || 0),
                  streams_7d: existing.streams_7d + (p.streams_7d || 0),
                  streams_12m: existing.streams_12m + (p.streams_12m || 0),
                });
              });
              
              return (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50 dark:bg-green-950/30">
                        <TableHead className="py-2">Playlist Type</TableHead>
                        <TableHead className="py-2 text-right">24h</TableHead>
                        <TableHead className="py-2 text-right">7d</TableHead>
                        <TableHead className="py-2 text-right">12m</TableHead>
                        <TableHead className="py-2 text-center w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ALL_ALGO_TYPES.map((typeName) => {
                        const data = algoDataMap.get(typeName.toLowerCase().trim());
                        const hasData = data && (data.streams_24h > 0 || data.streams_7d > 0 || data.streams_12m > 0);
                        
                        return (
                          <TableRow 
                            key={typeName} 
                            className={hasData ? 'bg-green-50/50 dark:bg-green-950/20' : 'opacity-60'}
                          >
                            <TableCell className="py-2 font-medium">
                              <div className="flex items-center gap-2">
                                <Radio className={`h-4 w-4 ${hasData ? 'text-green-600' : 'text-muted-foreground'}`} />
                                {typeName}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono">
                              {hasData ? (data?.streams_24h || 0).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono">
                              {hasData ? (data?.streams_7d || 0).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono">
                              {hasData ? (data?.streams_12m || 0).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {hasData ? (
                                <Badge variant="default" className="bg-green-600 text-white text-xs">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-xs">-</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
            
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
              <CardDescription>Internal notes are ops-only. Client notes are visible to clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OverrideField
                label="Internal Notes (Ops Only)"
                value={internalNotes}
                suggestedValue={suggestedInternalNotes}
                overridden={internalNotes.trim() !== suggestedInternalNotes.trim()}
                inputType="textarea"
                rows={3}
                placeholder="Add internal notes..."
                onOverride={(value, reason) => saveNoteOverride('internal_notes', value, reason)}
                onRevert={() => revertNoteOverride('internal_notes')}
              />
              <OverrideField
                label="Client Notes (Visible to Clients)"
                value={clientNotes}
                suggestedValue={suggestedClientNotes}
                overridden={clientNotes.trim() !== suggestedClientNotes.trim()}
                inputType="textarea"
                rows={3}
                placeholder="Add client notes..."
                onOverride={(value, reason) => saveNoteOverride('client_notes', value, reason)}
                onRevert={() => revertNoteOverride('client_notes')}
              />
            </CardContent>
          </Card>
          
          {/* Vendor Responses/Status */}
          {vendorResponses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Vendor Status ({vendorResponses.length})</Label>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    {vendorResponses.filter(r => r.status === 'pending').length} Pending
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {vendorResponses.filter(r => r.status === 'approved').length} Accepted
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {vendorResponses.filter(r => r.status === 'rejected').length} Rejected
                  </span>
                </div>
              </div>
              <div className="grid gap-4">
                {vendorResponses.map((response) => (
                  <Card key={response.id} className={`p-4 border-l-4 ${
                    response.status === 'pending' ? 'border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10' :
                    response.status === 'approved' ? 'border-l-green-400 bg-green-50/30 dark:bg-green-950/10' :
                    'border-l-red-400 bg-red-50/30 dark:bg-red-950/10'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-medium">
                          {(response.vendor as any)?.name || 'Unknown Vendor'}
                        </Badge>
                        <Badge variant={getVendorResponseVariant(response.status)}>
                          {getVendorResponseIcon(response.status)}
                          {response.status === 'pending' ? 'Awaiting Response' : 
                           response.status === 'approved' ? 'Accepted' : 
                           response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                        </Badge>
                      </div>
                      {response.responded_at ? (
                        <span className="text-sm text-muted-foreground">
                          Responded {formatDate(response.responded_at)}
                        </span>
                      ) : (
                        <span className="text-sm text-amber-600">
                          Waiting for vendor...
                        </span>
                      )}
                    </div>
                    
                    {response.playlists && response.playlists.length > 0 && (
                      <div className="mb-3">
                        <Label className="text-sm text-muted-foreground mb-1 block">
                          {response.status === 'pending' ? 'Requested Playlists:' : 'Selected Playlists:'}
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
                    
                    {response.status === 'pending' && !response.playlists?.length && (
                      <div className="text-sm text-muted-foreground italic">
                        Vendor will select playlists upon acceptance
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
            ) : campaignPlaylists.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground space-y-4">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Vendor Playlist Data Yet</p>
                <p className="text-sm">
                  Vendor playlist placement data will appear here once the Spotify scraper runs for this campaign.
                </p>
                
                {/* Add manual playlist button */}
                {canEditCampaign && (
                  <Button
                    onClick={() => setShowPlaylistSelector(true)}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Playlist Manually
                  </Button>
                )}
                
                {algorithmicPlaylists.length > 0 && (
                  <p className="text-sm mt-4 text-muted-foreground">
                    💡 <strong>Tip:</strong> This campaign has {algorithmicPlaylists.length} algorithmic playlist{algorithmicPlaylists.length !== 1 ? 's' : ''} with stream data.
                    Check the <strong>Campaign Details</strong> tab to see Radio, Discover Weekly, and other Spotify algorithmic sources.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Note about algorithmic playlists */}
                {algorithmicPlaylists.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Radio className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Spotify Algorithmic Playlists:</strong>{' '}
                      This campaign has {algorithmicPlaylists.length} algorithmic playlist{algorithmicPlaylists.length !== 1 ? 's' : ''} with{' '}
                      {algorithmicPlaylists.reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0).toLocaleString()} streams (12m).
                      View them in the <strong>Campaign Details</strong> tab under "External Streaming Sources".
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
                    <div className="text-sm text-muted-foreground mb-1">Streams (24h)</div>
                    <div className="text-2xl font-bold">
                      {campaignPlaylists.reduce((sum: number, p: any) => sum + (p.streams_24h || 0), 0).toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Streams (12m)</div>
                    <div className="text-2xl font-bold">
                      {campaignPlaylists.reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0).toLocaleString()}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Unique Vendors</div>
                    <div className="text-2xl font-bold">
                      {new Set(campaignPlaylists.filter((p: any) => !p.is_algorithmic).map((p: any) => p.vendor_id)).size}
                    </div>
                  </Card>
                </div>

                {/* Playlists Table */}
                <div className="border rounded-lg">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="py-2">Playlist Name</TableHead>
                          <TableHead className="py-2">Vendor</TableHead>
                          <TableHead className="text-right py-2">24h</TableHead>
                          <TableHead className="text-right py-2">7d</TableHead>
                          <TableHead className="text-right py-2">12m</TableHead>
                          <TableHead className="w-16 py-2">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignPlaylists.map((playlist: any) => (
                          <TableRow key={playlist.id}>
                            <TableCell className="font-medium py-2 max-w-[200px]">
                              <div className="truncate text-sm" title={playlist.playlist_name}>
                                {playlist.playlist_name}
                                {playlist.is_algorithmic && (
                                  <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                                    <Radio className="h-3 w-3 mr-1" />
                                    Algorithmic
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant="outline" className="text-xs">
                                {playlist.vendors?.name || (playlist.is_algorithmic ? 'Spotify' : 'Unknown')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-2">
                              {(playlist.streams_24h || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-2">
                              {(playlist.streams_7d || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-xs py-2">
                              {(playlist.streams_12m || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingPlaylist(playlist)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Unassigned Playlists Section */}
                {unassignedPlaylists.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between pb-2 border-b border-orange-300 dark:border-orange-700">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400">Unassigned Playlists</h3>
                        <Badge variant="outline" className="border-orange-400 text-orange-600">{unassignedPlaylists.length}</Badge>
                        {matchesFound > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ml-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {matchesFound} match{matchesFound > 1 ? 'es' : ''} found
                          </Badge>
                        )}
                      </div>
                      {matchesFound > 0 && (
                        <Button
                          size="sm"
                          onClick={handleAutoAssignAll}
                          disabled={isAutoAssigning}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isAutoAssigning ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Assigning...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Auto-Assign All ({matchesFound})
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      These playlists were found in your campaign but don't have a vendor assigned. 
                      {matchesFound > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium"> We found {matchesFound} playlist{matchesFound > 1 ? 's' : ''} matching your vendor database.</span>
                      )}
                    </p>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-orange-50 dark:bg-orange-950">
                            <TableHead>Playlist Name</TableHead>
                            <TableHead className="text-right">Streams (12m)</TableHead>
                            <TableHead>Assign Vendor</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unassignedWithMatches.map((playlist: any) => {
                            const hasMatch = !!playlist.suggestedMatch;
                            return (
                              <TableRow 
                                key={playlist.id}
                                className={hasMatch ? 'bg-green-50 dark:bg-green-950/30' : ''}
                              >
                                <TableCell className="font-medium py-2">
                                  <div className="flex items-center gap-2">
                                    {hasMatch && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Match found: {playlist.suggestedMatch.vendorName}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    <div className="truncate text-sm max-w-[180px]" title={playlist.playlist_name}>
                                      {playlist.playlist_name}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm py-2">
                                  {(playlist.streams_12m || 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="py-2">
                                  {hasMatch ? (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                        {playlist.suggestedMatch.vendorName}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-100"
                                        onClick={async () => {
                                          try {
                                            const { error } = await supabase
                                              .from('campaign_playlists')
                                              .update({ vendor_id: playlist.suggestedMatch.vendorId })
                                              .eq('id', playlist.id);
                                            
                                            if (error) throw error;
                                            
                                            queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign?.id] });
                                            queryClient.invalidateQueries({ queryKey: ['vendor-campaigns'] });
                                            
                                            toast({
                                              title: "Vendor Assigned",
                                              description: `"${playlist.playlist_name}" assigned to ${playlist.suggestedMatch.vendorName}.`,
                                            });
                                          } catch (error) {
                                            console.error('Failed to assign vendor:', error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to assign vendor.",
                                              variant: "destructive"
                                            });
                                          }
                                        }}
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Select
                                        onValueChange={async (vendorId) => {
                                          try {
                                            const { error } = await supabase
                                              .from('campaign_playlists')
                                              .update({ vendor_id: vendorId })
                                              .eq('id', playlist.id);
                                            
                                            if (error) throw error;
                                            
                                            queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign?.id] });
                                            queryClient.invalidateQueries({ queryKey: ['vendor-campaigns'] });
                                            
                                            toast({
                                              title: "Vendor Assigned",
                                              description: `Playlist assigned to vendor successfully.`,
                                            });
                                          } catch (error) {
                                            console.error('Failed to assign vendor:', error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to assign vendor.",
                                              variant: "destructive"
                                            });
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[100px] h-7 text-xs">
                                          <SelectValue placeholder="Other..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.values(vendorData).map((vendor: any) => (
                                            <SelectItem key={vendor.id} value={vendor.id}>
                                              {vendor.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : (
                                    <Select
                                      onValueChange={async (vendorId) => {
                                        try {
                                          const { error } = await supabase
                                            .from('campaign_playlists')
                                            .update({ vendor_id: vendorId })
                                            .eq('id', playlist.id);
                                          
                                          if (error) throw error;
                                          
                                          queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign?.id] });
                                          queryClient.invalidateQueries({ queryKey: ['vendor-campaigns'] });
                                          
                                          toast({
                                            title: "Vendor Assigned",
                                            description: `Playlist "${playlist.playlist_name}" assigned to vendor successfully.`,
                                          });
                                        } catch (error) {
                                          console.error('Failed to assign vendor:', error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to assign vendor. Please try again.",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select vendor..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.values(vendorData).map((vendor: any) => (
                                          <SelectItem key={vendor.id} value={vendor.id}>
                                            {vendor.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <div className="flex items-center justify-end gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                                            onClick={async () => {
                                              try {
                                                const { error } = await supabase
                                                  .from('campaign_playlists')
                                                  .update({ is_organic: true })
                                                  .eq('id', playlist.id);
                                                
                                                if (error) throw error;
                                                
                                                queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign?.id] });
                                                
                                                toast({
                                                  title: "Marked as Organic",
                                                  description: `"${playlist.playlist_name}" marked as organic playlist.`,
                                                });
                                              } catch (error) {
                                                console.error('Failed to mark as organic:', error);
                                                toast({
                                                  title: "Error",
                                                  description: "Failed to mark playlist as organic.",
                                                  variant: "destructive"
                                                });
                                              }
                                            }}
                                          >
                                            <Leaf className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Mark as Organic (user playlist)</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                            onClick={async () => {
                                              try {
                                                const { error } = await supabase
                                                  .from('campaign_playlists')
                                                  .delete()
                                                  .eq('id', playlist.id);
                                                
                                                if (error) throw error;
                                                
                                                queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign?.id] });
                                                
                                                toast({
                                                  title: "Playlist Removed",
                                                  description: `"${playlist.playlist_name}" has been removed from this campaign.`,
                                                });
                                              } catch (error) {
                                                console.error('Failed to delete playlist:', error);
                                                toast({
                                                  title: "Error",
                                                  description: "Failed to remove playlist.",
                                                  variant: "destructive"
                                                });
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delete from campaign</p>
                                        </TooltipContent>
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
                  </div>
                )}

                {/* Organic Playlists Section */}
                {organicPlaylists.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-green-600" />
                        Organic Playlists
                        <Badge variant="outline" className="border-green-400 text-green-600">{organicPlaylists.length}</Badge>
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      These playlists were added by users organically - not from vendors or Spotify's algorithmic recommendations.
                    </p>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-green-50 dark:bg-green-950">
                            <TableHead>Playlist Name</TableHead>
                            <TableHead className="text-right">24h</TableHead>
                            <TableHead className="text-right">7d</TableHead>
                            <TableHead className="text-right">12m</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {organicPlaylists.map((playlist: any) => (
                            <TableRow key={playlist.id}>
                              <TableCell className="font-medium py-2">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  <div className="truncate text-sm max-w-[200px]" title={playlist.playlist_name}>
                                    {playlist.playlist_name}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm py-2">
                                {(playlist.streams_24h || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm py-2">
                                {(playlist.streams_7d || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm py-2">
                                {(playlist.streams_12m || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                                          onClick={async () => {
                                            try {
                                              const { error } = await supabase
                                                .from('campaign_playlists')
                                                .update({ is_organic: false })
                                                .eq('id', playlist.id);
                                              
                                              if (error) throw error;
                                              
                                              queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign?.id] });
                                              
                                              toast({
                                                title: "Moved to Unassigned",
                                                description: `"${playlist.playlist_name}" moved back to unassigned playlists.`,
                                              });
                                            } catch (error) {
                                              console.error('Failed to unmark organic:', error);
                                              toast({
                                                title: "Error",
                                                description: "Failed to update playlist.",
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Move back to Unassigned</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                          onClick={async () => {
                                            try {
                                              const { error } = await supabase
                                                .from('campaign_playlists')
                                                .delete()
                                                .eq('id', playlist.id);
                                              
                                              if (error) throw error;
                                              
                                              queryClient.invalidateQueries({ queryKey: ['campaign-playlists', campaign?.id] });
                                              
                                              toast({
                                                title: "Playlist Removed",
                                                description: `"${playlist.playlist_name}" has been removed.`,
                                              });
                                            } catch (error) {
                                              console.error('Failed to delete playlist:', error);
                                              toast({
                                                title: "Error",
                                                description: "Failed to remove playlist.",
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete from campaign</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Vendor Performance Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Vendor Performance Breakdown
                  </h3>
                  {Object.entries(
                    campaignPlaylists.filter((p: any) => !p.is_organic).reduce((acc: any, playlist: any) => {
                      const vendorName = playlist.vendors?.name || (playlist.is_algorithmic ? 'Spotify (Algorithmic)' : 'Unknown');
                      const vendorId = playlist.vendors?.id || playlist.vendor_id;
                      const effectiveCost = playlist.cost_per_1k_override ?? playlist.vendors?.cost_per_1k_streams ?? 0;
                      const hasOverride = playlist.cost_per_1k_override !== null && playlist.cost_per_1k_override !== undefined;
                      
                      if (!acc[vendorName]) {
                        acc[vendorName] = {
                          playlists: [],
                          totalStreams24h: 0,
                          totalStreams7d: 0,
                          totalStreams12m: 0,
                          costPer1k: effectiveCost,
                          vendorDefaultCost: playlist.vendors?.cost_per_1k_streams || 0,
                          hasOverride: hasOverride,
                          vendorId: vendorId,
                          isAlgorithmic: playlist.is_algorithmic || false
                        };
                      }
                      acc[vendorName].playlists.push(playlist);
                      acc[vendorName].totalStreams24h += playlist.streams_24h || 0;
                      acc[vendorName].totalStreams7d += playlist.streams_7d || 0;
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
                        <div className="flex items-center gap-2">
                          {editingVendorCost?.vendorId === data.vendorId ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={vendorCostInput}
                                onChange={(e) => setVendorCostInput(e.target.value)}
                                className="w-24 h-8 text-sm"
                                placeholder="Cost"
                              />
                              <Button
                                size="sm"
                                onClick={saveVendorCostOverride}
                                disabled={savingVendorCost}
                              >
                                {savingVendorCost ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingVendorCost(null);
                                  setVendorCostInput('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Badge 
                                variant={data.hasOverride ? "default" : "secondary"} 
                                className={`text-lg px-3 py-1 ${data.hasOverride ? 'bg-green-600' : ''}`}
                              >
                                ${data.costPer1k}/1k
                                {data.hasOverride && (
                                  <span className="ml-1 text-xs opacity-75">(custom)</span>
                                )}
                              </Badge>
                              {data.vendorId && !data.isAlgorithmic && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => {
                                          setEditingVendorCost({
                                            vendorId: data.vendorId,
                                            vendorName: vendorName,
                                            currentCost: data.costPer1k
                                          });
                                          setVendorCostInput(data.costPer1k.toString());
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Set campaign-specific rate</p>
                                      {data.hasOverride && (
                                        <p className="text-xs text-muted-foreground">
                                          Vendor default: ${data.vendorDefaultCost}/1k
                                        </p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Last 24 Hours</div>
                          <div className="text-xl font-bold">{data.totalStreams24h.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            24h period
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Last 7 Days</div>
                          <div className="text-xl font-bold">{data.totalStreams7d.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(data.totalStreams7d / 7).toLocaleString()}/day
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
            ) : (
              <div className="space-y-6">
                {/* Campaign Pacing — Primary Decision Tool */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5" />
                    Campaign Pacing
                  </h3>
                  
                  {(() => {
                    const vendorPls = campaignPlaylists
                      .filter((p: any) => !p.is_algorithmic && !p.is_organic);
                    const playlistStreams12m = vendorPls
                      .reduce((sum: number, p: any) => sum + (p.streams_12m || 0), 0);
                    const playlistStreams7d = vendorPls
                      .reduce((sum: number, p: any) => sum + (p.streams_7d || 0), 0);
                    const playlistStreams24h = vendorPls
                      .reduce((sum: number, p: any) => sum + (p.streams_24h || 0), 0);

                    const dailyRate = playlistStreams7d > 0
                      ? Math.round(playlistStreams7d / 7)
                      : playlistStreams24h;

                    const streamGoal = campaignData?.stream_goal || 0;
                    const campaignDuration = campaignData?.duration_days || 90;
                    const startDate = campaignData?.start_date ? new Date(campaignData.start_date) : null;
                    const endDate = campaignData?.end_date ? new Date(campaignData.end_date) : null;
                    const now = new Date();

                    const effectiveStart = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    const effectiveEnd = endDate || new Date(effectiveStart.getTime() + campaignDuration * 24 * 60 * 60 * 1000);
                    const totalDays = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)));
                    const hasNotStarted = startDate ? startDate > now : false;
                    const daysElapsed = startDate
                      ? (hasNotStarted ? 0 : Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))))
                      : 0;
                    const daysRemaining = Math.max(0, totalDays - daysElapsed);


                    const streamsDelivered = playlistStreams12m;
                    const remainingStreams = Math.max(0, streamGoal - streamsDelivered);
                    const progressPercent = streamGoal > 0 ? Math.min((streamsDelivered / streamGoal) * 100, 100) : 0;
                    const requiredDailyRate = daysRemaining > 0 ? Math.ceil(remainingStreams / daysRemaining) : 0;
                    const projectedAtEnd = streamsDelivered + (dailyRate * daysRemaining);

                    const pacingStatus: 'not_started' | 'completed' | 'ahead' | 'on_track' | 'behind' = hasNotStarted
                      ? 'not_started'
                      : streamsDelivered >= streamGoal
                        ? 'completed'
                        : projectedAtEnd >= streamGoal
                          ? (projectedAtEnd >= streamGoal * 1.1 ? 'ahead' : 'on_track')
                          : 'behind';

                    const chartData: Array<{ day: number; date: string; requiredPace: number; actual?: number; projected?: number }> = [];
                    const maxPoints = Math.min(totalDays + 1, 90);
                    const dayStep = Math.max(1, Math.floor(totalDays / (maxPoints - 1)));

                    for (let i = 0; i <= totalDays; i += dayStep) {
                      const day = Math.min(i, totalDays);
                      const d = new Date(effectiveStart.getTime() + day * 24 * 60 * 60 * 1000);
                      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const point: { day: number; date: string; requiredPace: number; actual?: number; projected?: number } = {
                        day,
                        date: label,
                        requiredPace: Math.round((streamGoal / totalDays) * day),
                      };
                      if (day <= daysElapsed && !hasNotStarted) {
                        point.actual = daysElapsed > 0
                          ? Math.round((streamsDelivered / daysElapsed) * day)
                          : 0;
                      }
                      if (day >= daysElapsed && !hasNotStarted) {
                        point.projected = Math.round(streamsDelivered + dailyRate * Math.max(0, day - daysElapsed));
                      }
                      chartData.push(point);
                    }

                    const lastPt = chartData[chartData.length - 1];
                    if (lastPt && lastPt.day !== totalDays) {
                      chartData.push({
                        day: totalDays,
                        date: effectiveEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        requiredPace: streamGoal,
                        projected: hasNotStarted ? undefined : Math.round(streamsDelivered + dailyRate * Math.max(0, totalDays - daysElapsed)),
                      });
                    }

                    if (!hasNotStarted && daysElapsed > 0 && daysElapsed < totalDays) {
                      const todayExists = chartData.some(p => p.day === daysElapsed);
                      if (!todayExists) {
                        chartData.push({
                          day: daysElapsed,
                          date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          requiredPace: Math.round((streamGoal / totalDays) * daysElapsed),
                          actual: streamsDelivered,
                          projected: streamsDelivered,
                        });
                        chartData.sort((a, b) => a.day - b.day);
                      }
                    }

                    let goalIntersectDay: number | null = null;
                    let goalIntersectDate: string | null = null;
                    if (streamGoal > 0) {
                      if (streamsDelivered >= streamGoal && daysElapsed > 0) {
                        goalIntersectDay = Math.round(daysElapsed * (streamGoal / streamsDelivered));
                      } else if (dailyRate > 0 && streamsDelivered < streamGoal) {
                        goalIntersectDay = daysElapsed + Math.ceil((streamGoal - streamsDelivered) / dailyRate);
                      }
                      if (goalIntersectDay !== null && goalIntersectDay >= 0) {
                        const intersectDate = new Date(effectiveStart.getTime() + goalIntersectDay * 24 * 60 * 60 * 1000);
                        goalIntersectDate = intersectDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                    }

                    const songs = campaignData?.songs || [];
                    const totalSongStreams = songs.reduce((sum: number, s: any) => sum + (s.streams_12m || 0), 0);

                    const statusConfig: Record<string, { label: string; Icon: typeof CheckCircle; bg: string; border: string; text: string }> = {
                      not_started: { label: 'Not Started', Icon: Clock, bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600' },
                      ahead: { label: 'Ahead of Pace', Icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-600' },
                      on_track: { label: 'On Track', Icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-600' },
                      behind: { label: 'Behind Pace', Icon: AlertCircle, bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-600' },
                      completed: { label: 'Goal Reached', Icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-600' },
                    };
                    const sc = statusConfig[pacingStatus];
                    const StatusIcon = sc.Icon;

                    return (
                      <>
                        {/* Pacing Status Banner */}
                        <div className={`p-4 rounded-lg border-2 ${sc.bg} ${sc.border} mb-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <StatusIcon className={`h-6 w-6 ${sc.text}`} />
                              <div>
                                <div className={`text-lg font-bold ${sc.text}`}>{sc.label}</div>
                                <p className="text-xs text-muted-foreground">
                                  {pacingStatus === 'not_started'
                                    ? `Campaign starts ${startDate?.toLocaleDateString() || 'TBD'}`
                                    : pacingStatus === 'completed'
                                      ? `Delivered ${streamsDelivered.toLocaleString()} streams (${progressPercent.toFixed(1)}% of goal)`
                                      : `Projected ${projectedAtEnd.toLocaleString()} streams by ${effectiveEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (Goal: ${streamGoal.toLocaleString()})`
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-muted-foreground">
                                Day {daysElapsed} of {totalDays}
                              </div>
                              <Progress value={(daysElapsed / totalDays) * 100} className="h-1.5 w-24 mt-1" />
                            </div>
                          </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Streams Delivered</span>
                              <Music className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-3xl font-bold text-primary">
                              {streamsDelivered.toLocaleString()}
                            </div>
                            <Progress value={progressPercent} className="h-2 mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {progressPercent.toFixed(1)}% of {streamGoal.toLocaleString()} goal
                            </p>
                          </div>

                          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Current Daily Rate</span>
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-3xl font-bold text-blue-600">
                              {dailyRate.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Required: {requiredDailyRate.toLocaleString()}/day
                            </p>
                          </div>

                          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Remaining Streams</span>
                              <Target className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="text-3xl font-bold text-amber-600">
                              {remainingStreams.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {daysRemaining} days remaining
                            </p>
                          </div>

                          <div className={`p-4 rounded-lg border ${sc.bg} ${sc.border}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Projected at End</span>
                              <StatusIcon className={`h-4 w-4 ${sc.text}`} />
                            </div>
                            <div className={`text-3xl font-bold ${sc.text}`}>
                              {hasNotStarted ? '—' : projectedAtEnd.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {hasNotStarted ? 'Awaiting start' : `Goal: ${streamGoal.toLocaleString()}`}
                            </p>
                          </div>
                        </div>

                        {/* Pacing Chart — 3 Lines */}
                        <div className="mt-2">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Campaign Pacing — {totalDays}-Day Timeline
                          </h4>
                          <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <XAxis
                                  dataKey="date"
                                  tick={{ fontSize: 10 }}
                                  interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                                />
                                <YAxis
                                  tick={{ fontSize: 10 }}
                                  tickFormatter={(value: number) =>
                                    value >= 1000000
                                      ? `${(value / 1000000).toFixed(1)}M`
                                      : value >= 1000
                                        ? `${(value / 1000).toFixed(0)}k`
                                        : String(value)
                                  }
                                />
                                <RechartsTooltip
                                  formatter={(value: number, name: string) => {
                                    const labels: Record<string, string> = {
                                      actual: 'Actual (Vendor Playlists)',
                                      requiredPace: 'Required Pace',
                                      projected: 'Projected Outcome',
                                    };
                                    return [value.toLocaleString(), labels[name] || name];
                                  }}
                                  labelFormatter={(label: string) => label}
                                />
                                {streamGoal > 0 && (
                                  <ReferenceLine
                                    y={streamGoal}
                                    stroke="#ef4444"
                                    strokeWidth={1.5}
                                    strokeDasharray="6 3"
                                    label={{
                                      value: `Goal: ${streamGoal >= 1000000 ? `${(streamGoal / 1000000).toFixed(1)}M` : streamGoal >= 1000 ? `${(streamGoal / 1000).toFixed(0)}k` : streamGoal}`,
                                      position: 'right',
                                      fontSize: 10,
                                      fill: '#ef4444',
                                    }}
                                  />
                                )}
                                <Line
                                  type="linear"
                                  dataKey="requiredPace"
                                  stroke="#22c55e"
                                  strokeWidth={2}
                                  strokeDasharray="8 4"
                                  dot={false}
                                  name="requiredPace"
                                  connectNulls={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="actual"
                                  stroke="#3b82f6"
                                  strokeWidth={3}
                                  dot={false}
                                  name="actual"
                                  connectNulls={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="projected"
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  strokeDasharray="5 3"
                                  dot={false}
                                  name="projected"
                                  connectNulls={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <div className="w-4 h-[3px] bg-blue-500 rounded" />
                              Actual Streams (Vendor Playlists)
                            </span>
                            <span className="flex items-center gap-1.5">
                              <div className="w-4 h-[3px] bg-green-500 rounded opacity-60" style={{ borderTop: '2px dashed #22c55e', height: 0 }} />
                              Required Pace
                            </span>
                            <span className="flex items-center gap-1.5">
                              <div className="w-4 h-[3px] bg-amber-500 rounded opacity-60" style={{ borderTop: '2px dashed #f59e0b', height: 0 }} />
                              Projected Outcome
                            </span>
                            {streamGoal > 0 && (
                              <span className="flex items-center gap-1.5">
                                <div className="w-4" style={{ borderTop: '2px dashed #ef4444', height: 0 }} />
                                Stream Goal
                              </span>
                            )}
                          </div>
                          {goalIntersectDate && streamGoal > 0 && (
                            <p className="text-center text-xs text-muted-foreground mt-2">
                              {streamsDelivered >= streamGoal
                                ? `Goal reached around Day ${goalIntersectDay} (${goalIntersectDate})`
                                : goalIntersectDay !== null && goalIntersectDay <= totalDays
                                  ? `Projected to hit goal by Day ${goalIntersectDay} (${goalIntersectDate})`
                                  : `At current pace, goal won't be reached within the campaign window`
                              }
                            </p>
                          )}
                        </div>

                        {/* Operational Analysis */}
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">Operational Analysis</p>
                              <p className="text-xs text-muted-foreground">
                                {streamGoal === 0 ? (
                                  `No goal set. Current vendor playlist daily rate: ${dailyRate.toLocaleString()} streams/day.`
                                ) : pacingStatus === 'completed' ? (
                                  `Goal reached. Delivered ${streamsDelivered.toLocaleString()} of ${streamGoal.toLocaleString()} streams (${progressPercent.toFixed(0)}%).`
                                ) : pacingStatus === 'not_started' ? (
                                  `Campaign not yet started. Goal: ${streamGoal.toLocaleString()} streams over ${totalDays} days. Required pace: ${requiredDailyRate.toLocaleString()} streams/day.`
                                ) : pacingStatus === 'ahead' ? (
                                  `Pacing strong. At ${dailyRate.toLocaleString()}/day, projected to reach ${projectedAtEnd.toLocaleString()} by end date (${Math.round((projectedAtEnd / streamGoal) * 100)}% of goal). No action needed.`
                                ) : pacingStatus === 'on_track' ? (
                                  `Pacing on target. At ${dailyRate.toLocaleString()}/day (need ${requiredDailyRate.toLocaleString()}/day). Projected ${projectedAtEnd.toLocaleString()} streams by end date.`
                                ) : (
                                  `Pacing behind. Current rate ${dailyRate.toLocaleString()}/day vs required ${requiredDailyRate.toLocaleString()}/day. Deficit: ${(requiredDailyRate - dailyRate).toLocaleString()}/day. Consider adding playlists or adjusting vendor engagement.`
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Total Song Streams — Informational */}
                        {totalSongStreams > 0 && (
                          <div className="mt-4 p-3 bg-muted/30 border border-muted rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Total Song Streams (All Sources)</span>
                              </div>
                              <span className="text-sm font-medium">{totalSongStreams.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Includes algorithmic and organic — informational only, does not affect pacing.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </Card>

                {/* Vendor Performance Comparison - Only show when performance data exists */}
                {performanceData && performanceData.length > 0 && (
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
                )}

                {/* Performance Chart - Only show when performance data exists */}
                {performanceData && performanceData.length > 0 && (
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
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="regions" className="space-y-6">
            {regionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : regionData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">No region data yet</p>
                <p className="text-sm">Region data will appear after the next scraper run.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Countries</CardDescription>
                      <CardTitle className="text-2xl">{regionData.length}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Top Country</CardDescription>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        {regionData[0]?.country || '—'}
                        <span className="text-base font-normal text-muted-foreground">
                          {(regionData[0]?.streams_28d || 0).toLocaleString()} streams
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total 28d Streams</CardDescription>
                      <CardTitle className="text-2xl">
                        {regionData.reduce((sum: number, r: any) => sum + (r.streams_28d || 0), 0).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Streams by Country (28 Days)
                    </CardTitle>
                    <CardDescription>
                      Top countries contributing streams to this campaign
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead className="text-right">Streams (28d)</TableHead>
                            <TableHead className="text-right w-24">Share</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const totalStreams = regionData.reduce((sum: number, r: any) => sum + (r.streams_28d || 0), 0);
                            return regionData.map((region: any, idx: number) => {
                              const share = totalStreams > 0 ? ((region.streams_28d || 0) / totalStreams * 100) : 0;
                              return (
                                <TableRow key={region.id || idx}>
                                  <TableCell className="font-medium text-muted-foreground">{region.rank || idx + 1}</TableCell>
                                  <TableCell className="font-medium">{region.country}</TableCell>
                                  <TableCell className="text-right tabular-nums">{(region.streams_28d || 0).toLocaleString()}</TableCell>
                                  <TableCell className="text-right tabular-nums text-muted-foreground">{share.toFixed(1)}%</TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
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
                  Total Campaign Budget: {campaignData?.budget && campaignData.budget > 0 
                    ? `$${campaignData.budget.toLocaleString()}` 
                    : 'Not set'
                  }
                </div>
              </div>

              {Object.entries(groupedPlaylists).length > 0 ? (
                <div className="grid gap-4">
                  {Object.entries(groupedPlaylists).map(([vendorId, vendorData]) => {
                    // Use the consistent cost per 1k rate from campaign_playlists data
                    const ratePer1k = (vendorData.costPer1k || 0).toFixed(2);
                    
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
                            <div className="flex items-center gap-2">
                              {editingVendorCost?.vendorId === vendorId ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={vendorCostInput}
                                    onChange={(e) => setVendorCostInput(e.target.value)}
                                    className="w-20 h-8 text-sm"
                                  />
                                  <Button size="sm" className="h-8 px-2" onClick={saveVendorCostOverride} disabled={savingVendorCost}>
                                    {savingVendorCost ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓'}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setEditingVendorCost(null); setVendorCostInput(''); }}>
                                    ✗
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-lg font-semibold">${ratePer1k}</p>
                                  {vendorId !== 'unknown' && vendorId !== 'unassigned' && canEditCampaign && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        setEditingVendorCost({
                                          vendorId: vendorId,
                                          vendorName: vendorData.vendorName,
                                          currentCost: parseFloat(ratePer1k)
                                        });
                                        setVendorCostInput(ratePer1k);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Allocated streams</Label>
                            <div className="flex items-center gap-2">
                              {editingVendorAllocation?.vendorId === vendorId ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={vendorAllocationInput}
                                    onChange={(e) => setVendorAllocationInput(e.target.value)}
                                    className="w-32 h-8"
                                    placeholder="0"
                                    disabled={savingVendorAllocation}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={saveVendorAllocationOverride}
                                    disabled={savingVendorAllocation}
                                  >
                                    {savingVendorAllocation ? '...' : 'Save'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingVendorAllocation(null);
                                      setVendorAllocationInput('');
                                    }}
                                    disabled={savingVendorAllocation}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-lg font-semibold">{vendorData.totalAllocated.toLocaleString()}</p>
                                  {canEditCampaign && vendorId !== 'unknown' && vendorId !== 'unassigned' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        setEditingVendorAllocation({
                                          vendorId: vendorId,
                                          vendorName: vendorData.vendorName,
                                          currentAllocated: vendorData.totalAllocated
                                        });
                                        setVendorAllocationInput(vendorData.totalAllocated.toString());
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
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

                        {vendorData.paymentStatus !== 'Paid' && canEditCampaign && vendorId !== 'unknown' && vendorId !== 'unassigned' && (
                          <div className="flex items-center gap-4 pt-4 border-t">
                            <Button
                              onClick={() => markVendorPaymentAsPaid(campaignData?.id, vendorId, vendorData.vendorName, vendorData.totalPayment)}
                              disabled={markingPaid[`${campaignData?.id}-${vendorId}`] || vendorId === 'unknown' || vendorId === 'unassigned'}
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

      {/* Edit Playlist Vendor Dialog - outside main Dialog to avoid nesting */}
      {editingPlaylist && (
        <EditPlaylistVendorDialog
          open={!!editingPlaylist}
          onOpenChange={(open) => !open && setEditingPlaylist(null)}
          playlist={editingPlaylist}
          campaignId={campaign?.id}
        />
      )}
    </Dialog>
  );
}









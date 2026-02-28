"use client"

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ExternalLink,
  Mail,
  Eye,
  ChevronUp,
  ChevronDown,
  Upload,
  Rocket,
  Zap,
} from "lucide-react";
import { CampaignImportModal } from "./CampaignImportModal";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignForm } from "./CampaignForm";
import { CampaignDetailModal } from "./CampaignDetailModal";
import { useCampaignReachData } from "../../hooks/useCampaignReachData";
import { formatReachPerformance, calculateReachProgress, formatNumberWithSuffix } from "../../utils/numberFormatting";
import { notifyOpsStatusChange } from "@/lib/status-notify";
import { notifySlack } from "@/lib/slack-notify";
import { useAuth } from "@/hooks/use-auth";

interface Campaign {
  id: string;
  track_info: string;
  track_name: string;   // parsed from track_info
  artist_name: string;  // parsed from track_info
  track_url: string;    // mapped from `url`
  campaign_type: string; // mapped from `service_type`
  status: string;
  goals: number;         // parsed from `goal` text
  remaining_metrics: number; // parsed from `remaining` text
  sales_price: number;   // parsed from `sale_price` text
  invoice_status: string; // mapped from `invoice`
  source_invoice_id?: string;
  start_date: string;
  submission_date: string; // mapped from `submit_date`
  notes: string;
  internal_notes?: string;
  client_notes?: string;
  weekly_reporting_enabled?: boolean;
  client: {
    name: string;
    email: string;
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { getTotalReach, loading: reachLoading } = useCampaignReachData();
  const autoCompletedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter, sortBy, sortDirection]);

  // Feature 1: Auto-complete campaigns when reach >= goal
  useEffect(() => {
    if (reachLoading || campaigns.length === 0) return;

    campaigns.forEach((campaign) => {
      if (campaign.status !== 'Active') return;
      if (campaign.goals <= 0) return;
      if (autoCompletedRef.current.has(campaign.id)) return;

      const totalReach = getTotalReach(campaign.id);
      if (totalReach >= campaign.goals) {
        autoCompletedRef.current.add(campaign.id);
        (async () => {
          try {
            const { error } = await supabase
              .from('soundcloud_campaigns')
              .update({
                status: 'Complete',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', campaign.id);

            if (error) throw error;

            toast({
              title: "Campaign Auto-Completed",
              description: `"${campaign.track_name}" reached 100% — marked as Complete`,
            });
            fetchCampaigns();
          } catch (err) {
            console.error('Auto-complete failed for campaign', campaign.id, err);
          }
        })();
      }
    });
  }, [campaigns, reachLoading]);

  /** Parse "Artist - Track" from track_info string */
  const parseTrackInfo = (trackInfo: string): { artist: string; track: string } => {
    if (!trackInfo) return { artist: 'Unknown Artist', track: 'Unknown Track' };
    const dashIdx = trackInfo.indexOf(' - ');
    if (dashIdx > 0) {
      return {
        artist: trackInfo.substring(0, dashIdx).trim(),
        track: trackInfo.substring(dashIdx + 3).trim(),
      };
    }
    return { artist: 'Unknown Artist', track: trackInfo.trim() };
  };

  /** Parse text number like "20000000.0" → 20000000 */
  const parseGoalNumber = (val: string | number | null): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return Math.round(parseFloat(val.replace(/,/g, '')) || 0);
  };

  /** Parse "$1000" or "1000" → 1000 */
  const parseSalePrice = (val: string | number | null): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(/[$,]/g, '')) || 0;
  };

  const fetchCampaigns = async () => {
    try {
      // Query soundcloud_campaigns (flat text columns — actual production schema)
      const { data, error } = await supabase
        .from('soundcloud_campaigns')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const transformedData = ((data || []) as any[]).map((row: any) => {
        const { artist, track } = parseTrackInfo(row.track_info);

        return {
          id: String(row.id),
          track_info: row.track_info || '',
          track_name: track,
          artist_name: artist,
          track_url: row.url || '',
          campaign_type: row.service_type || 'Reposts',
          status: row.status || 'Active',
          goals: parseGoalNumber(row.goal),
          remaining_metrics: parseGoalNumber(row.remaining),
          sales_price: parseSalePrice(row.sale_price),
          invoice_status: row.invoice || 'TBD',
          source_invoice_id: row.source_invoice_id || undefined,
          start_date: row.start_date || '',
          submission_date: row.submit_date || '',
          notes: row.notes || '',
          internal_notes: row.internal_notes || '',
          client_notes: row.client_notes || '',
          weekly_reporting_enabled: row.weekly_reporting_enabled || false,
          client: {
            name: row.client || 'Unknown',
            email: row.salesperson_email || '',
          },
        };
      });

      setCampaigns(transformedData);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCampaigns = () => {
    let filtered = campaigns;

    if (searchTerm) {
      filtered = filtered.filter(campaign => 
        campaign.track_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.artist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.client.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
          case 'track':
            aVal = a.track_name.toLowerCase();
            bVal = b.track_name.toLowerCase();
            break;
          case 'artist':
            aVal = a.artist_name.toLowerCase();
            bVal = b.artist_name.toLowerCase();
            break;
          case 'client':
            aVal = a.client.name.toLowerCase();
            bVal = b.client.name.toLowerCase();
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'progress':
            aVal = calculateProgress(a.goals, a.remaining_metrics);
            bVal = calculateProgress(b.goals, b.remaining_metrics);
            break;
          case 'reach':
            aVal = calculateReachProgress(getTotalReach(a.id), a.goals);
            bVal = calculateReachProgress(getTotalReach(b.id), b.goals);
            break;
          case 'price':
            aVal = a.sales_price || 0;
            bVal = b.sales_price || 0;
            break;
          case 'date':
            aVal = new Date(a.start_date || 0);
            bVal = new Date(b.start_date || 0);
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredCampaigns(filtered);
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('soundcloud_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Complete': return 'bg-blue-500';
      case 'Pending': return 'bg-yellow-500';
      case 'Ready': return 'bg-blue-500';
      case 'On Hold': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // In the actual DB, status is stored as plain text ("Active", "Complete", etc.)
  // so display and DB values are the same
  const getDisplayStatus = (dbStatus: string): string => {
    return dbStatus || 'Pending';
  };

  const getDbStatus = (uiStatus: string): string => {
    return uiStatus;
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    console.log('🔄 updateCampaignStatus called:', { campaignId, newStatus });
    
    try {
      const dbStatus = getDbStatus(newStatus);
      console.log('📝 Updating to DB status:', dbStatus);
      
      const { data, error } = await supabase
        .from('soundcloud_campaigns')
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq('id', campaignId)
        .select();

      console.log('📊 Update result:', { data, error });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Campaign status updated to ${newStatus}`,
      });
      await notifyOpsStatusChange({
        service: "soundcloud",
        campaignId,
        status: dbStatus,
        actorEmail: user?.email || null,
      });
      notifySlack("soundcloud", "campaign_status_change", {
        campaignId,
        campaignName: campaigns.find(c => c.id === campaignId)?.track_name || campaignId,
        status: dbStatus,
        actorEmail: user?.email || null,
      });

      // Auto-send tracking link email when campaign is activated
      if (dbStatus === 'Active') {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign?.client?.email) {
          try {
            console.log('📧 Auto-sending tracking link email to:', campaign.client.email);
            
            const { error: emailError } = await supabase.functions.invoke(
              "send-notification-email",
              {
                body: {
                  template: "tracking-link",
                  to: campaign.client.email,
                  data: {
                    clientName: campaign.client.name || "Valued Client",
                    trackName: campaign.track_name || "your track",
                    artistName: campaign.artist_name || "Artist",
                    trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track/${campaignId}`,
                  },
                },
              }
            );

            if (!emailError) {
              // Update tracking_link_sent_at
              await supabase
                .from('soundcloud_campaigns')
                .update({ 
                  tracking_link_sent_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', campaignId);

              toast({
                title: "Tracking Link Sent",
                description: `Tracking link automatically sent to ${campaign.client.email}`,
              });
            } else {
              console.error('❌ Failed to send tracking link email:', emailError);
            }
          } catch (emailErr) {
            console.error('❌ Error sending auto tracking link:', emailErr);
            // Don't throw - status was already updated successfully
          }
        }
      }

      fetchCampaigns();
    } catch (error: any) {
      console.error('❌ Error updating campaign status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign status",
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // Calculate progress based on remaining metrics (legacy approach)
  // Progress based on receipt links will be shown in the campaign modal
  const calculateProgress = (goals: number, remaining: number): number => {
    if (!goals) return 0;
    return Math.max(0, Math.min(100, ((goals - remaining) / goals) * 100));
  };

  /** Parse flexible start_date formats (M/D/YYYY, MM/DD/YYYY, YYYY-MM-DD) to midnight local */
  const parseStartDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    // ISO format
    if (dateStr.includes('-') && dateStr.length >= 10) {
      const d = new Date(dateStr + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }
    // M/D/YYYY or MM/DD/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [m, d, y] = parts.map(Number);
      const date = new Date(y, m - 1, d);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  const isToday = (dateStr: string): boolean => {
    const d = parseStartDate(dateStr);
    if (!d) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
  };

  const todaysCampaigns = campaigns.filter(
    (c) => isToday(c.start_date) && c.sales_price > 0 && c.status !== 'Complete'
  );

  if (loading) {
    return <div className="animate-pulse">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground">Manage and track SoundCloud promotional campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new SoundCloud promotional campaign
              </DialogDescription>
            </DialogHeader>
            <CampaignForm 
              onSuccess={() => {
                setShowCreateDialog(false);
                fetchCampaigns();
              }} 
            />
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Import Modal */}
      <CampaignImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={fetchCampaigns}
      />

      {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns, artists, or clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Ready">Ready</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ready to Push Today Banner */}
          {todaysCampaigns.length > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Ready to Push Today</CardTitle>
                  <Badge variant="default" className="ml-1">{todaysCampaigns.length}</Badge>
                </div>
                <CardDescription>Paid campaigns scheduled to start today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {todaysCampaigns.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md border bg-background px-4 py-2"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{c.track_name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {c.artist_name} &middot; {c.client.name}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          Goal: {formatNumberWithSuffix(c.goals)}
                        </Badge>
                        <Badge variant="secondary" className="shrink-0">
                          ${c.sales_price.toLocaleString()}
                        </Badge>
                      </div>
                      {(c.status === 'Ready' || c.status === 'Pending') && (
                        <Button
                          size="sm"
                          className="ml-4 shrink-0 gap-1"
                          onClick={() => updateCampaignStatus(c.id, 'Active')}
                        >
                          <Zap className="h-3 w-3" />
                          Activate
                        </Button>
                      )}
                      {c.status === 'Active' && (
                        <Badge className="ml-4 bg-green-500 text-white shrink-0">Live</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns ({filteredCampaigns.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-visible">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('track')}
                    >
                      <div className="flex items-center gap-1">
                        Track
                        {getSortIcon('track')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('client')}
                    >
                      <div className="flex items-center gap-1">
                        Client
                        {getSortIcon('client')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('progress')}
                    >
                      <div className="flex items-center gap-1">
                        Progress
                        {getSortIcon('progress')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('reach')}
                    >
                      <div className="flex items-center gap-1">
                        Reach Performance
                        {getSortIcon('reach')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center gap-1">
                        Sale Price
                        {getSortIcon('price')}
                      </div>
                    </TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Start Date
                        {getSortIcon('date')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow 
                      key={campaign.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{campaign.track_name}</p>
                            {campaign.weekly_reporting_enabled && (
                              <Mail className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">by {campaign.artist_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.client.name}</p>
                          <p className="text-sm text-muted-foreground">{campaign.client.email}</p>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={getDisplayStatus(campaign.status)}
                          onValueChange={(value) => updateCampaignStatus(campaign.id, value)}
                        >
                          <SelectTrigger 
                            className="w-28 h-6 text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Ready">Ready</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Complete">Complete</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {campaign.goals > 0 ? (
                          <div className="w-20">
                            <div className="text-xs mb-1">
                              {Math.round(calculateProgress(campaign.goals, campaign.remaining_metrics))}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-primary h-1.5 rounded-full" 
                                style={{ 
                                  width: `${calculateProgress(campaign.goals, campaign.remaining_metrics)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.goals > 0 ? (
                          <div className="w-24">
                            <div className="text-xs mb-1 font-medium">
                              {formatReachPerformance(getTotalReach(campaign.id), campaign.goals)}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-green-500 h-1.5 rounded-full transition-all" 
                                style={{ 
                                  width: `${calculateReachProgress(getTotalReach(campaign.id), campaign.goals)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${campaign.sales_price || 0}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={campaign.invoice_status === 'Paid' ? 'default' : 'secondary'}
                        >
                          {campaign.invoice_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCampaign(campaign);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCampaign(campaign);
                            }}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(campaign.track_url, '_blank');
                            }}
                            title="View Track"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this campaign?')) {
                                deleteCampaign(campaign.id);
                              }
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {filteredCampaigns.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No campaigns found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>

      {/* Edit Campaign Dialog */}
      {editingCampaign && (
        <Dialog open={!!editingCampaign} onOpenChange={() => setEditingCampaign(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
              <DialogDescription>
                Update campaign details
              </DialogDescription>
            </DialogHeader>
            <CampaignForm 
              campaign={editingCampaign}
              onSuccess={() => {
                setEditingCampaign(null);
                fetchCampaigns();
              }} 
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onCampaignUpdate={fetchCampaigns}
      />
    </div>
  );
}
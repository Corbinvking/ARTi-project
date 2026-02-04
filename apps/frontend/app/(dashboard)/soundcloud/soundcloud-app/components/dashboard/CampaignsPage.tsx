"use client"

import { useState, useEffect } from "react";
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
  Upload
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
import { formatReachPerformance, calculateReachProgress } from "../../utils/numberFormatting";
import { notifyOpsStatusChange } from "@/lib/status-notify";
import { useAuth } from "@/hooks/use-auth";

interface Campaign {
  id: string;
  track_name: string;
  artist_name: string;
  track_url: string;
  campaign_type: string;
  status: string;
  goals: number;
  remaining_metrics: number;
  sales_price: number;
  invoice_status: string;
  source_invoice_id?: string;
  start_date: string;
  submission_date: string;
  client_id: string;
  notes: string;
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

  // Helper function to extract clean track name from SoundCloud URL
  const extractTrackName = (url: string): string => {
    if (!url) return 'Unknown Track';
    
    try {
      // Get the last part of the URL path
      const urlPath = url.split('?')[0]; // Remove query parameters
      const trackSlug = urlPath.split('/').pop() || '';
      
      if (!trackSlug) return 'Unknown Track';
      
      // Check if it looks like a hash/ID (mostly numbers/random characters)
      // If it has more than 50% non-alphabetic characters or is very short, it's likely a hash
      const alphaChars = trackSlug.replace(/[^a-zA-Z]/g, '').length;
      const totalChars = trackSlug.length;
      const alphaRatio = alphaChars / totalChars;
      
      // If less than 30% alphabetic characters, it's probably a hash/ID
      if (alphaRatio < 0.3 || trackSlug.length < 5) {
        return 'Untitled Track';
      }
      
      // URL decode
      let decoded = decodeURIComponent(trackSlug);
      
      // Replace hyphens and underscores with spaces
      decoded = decoded.replace(/[-_]/g, ' ');
      
      // Clean up extra spaces
      decoded = decoded.replace(/\s+/g, ' ').trim();
      
      // Capitalize first letter of each word
      decoded = decoded.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Final check - if result looks like a hash (too many numbers/special chars)
      const finalAlphaChars = decoded.replace(/[^a-zA-Z\s]/g, '').length;
      const finalTotalChars = decoded.length;
      if (finalAlphaChars / finalTotalChars < 0.4) {
        return 'Untitled Track';
      }
      
      return decoded || 'Unknown Track';
    } catch (error) {
      console.warn('Failed to parse track name from URL:', url);
      return 'Unknown Track';
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter, sortBy, sortDirection]);

  const fetchCampaigns = async () => {
    try {
      // Query soundcloud_submissions since that's where the imported campaigns are
      // Add cache-busting timestamp to force fresh data
      const { data, error } = await supabase
        .from('soundcloud_submissions' as any)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Transform submissions to match campaign structure
      // Map database status values to UI display values
      const displayStatusMap: Record<string, string> = {
        pending: 'Pending',
        ready: 'Ready',
        active: 'Active',
        complete: 'Complete',
        on_hold: 'On Hold',
        new: 'Pending',
        approved: 'Active',
        rejected: 'On Hold',
      };
      
      const transformedData = ((data || []) as any[]).map((submission: any, idx: number) => {
        // Debug: Log first few records to see what we're getting from DB
        if (idx < 3) {
          console.log('📊 Submission from DB:', {
            id: submission.id,
            track_name_from_db: submission.track_name,
            track_url: submission.track_url?.substring(0, 60),
            artist_name: submission.artist_name
          });
        }
        
        return {
          id: submission.id,
          // Use stored track_name if available, otherwise extract from URL
          track_name: submission.track_name || extractTrackName(submission.track_url),
          track_url: submission.track_url,
          artist_name: submission.artist_name || 'Unknown Artist',
          campaign_type: 'Repost Network', // Default for SoundCloud submissions
          status: displayStatusMap[submission.status] || 'Pending',
          goals: submission.expected_reach_planned || 0, // Map to expected field name
          remaining_metrics: 0,
          sales_price: 0,
          invoice_status: submission.invoice_status || 'pending',
          source_invoice_id: submission.source_invoice_id || undefined,
          start_date: submission.support_date,
          submission_date: submission.submitted_at,
          notes: submission.notes || '',
          created_at: submission.created_at,
          client_id: submission.client_id || submission.member_id || '',
          client: {
            name: submission.artist_name || 'Unknown',
            email: ''
          }
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
        .from('soundcloud_submissions')
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

  // Map database status to UI display status
  const getDisplayStatus = (dbStatus: string): string => {
    const displayMap: Record<string, string> = {
      pending: 'Pending',
      ready: 'Ready',
      active: 'Active',
      complete: 'Complete',
      on_hold: 'On Hold',
      new: 'Pending',
      approved: 'Active',
      rejected: 'On Hold',
    };
    return displayMap[dbStatus] || dbStatus;
  };

  // Map UI status to database status
  const getDbStatus = (uiStatus: string): string => {
    const dbMap: Record<string, string> = {
      'Pending': 'pending',
      'Ready': 'ready',
      'Active': 'active',
      'Complete': 'complete',
      'On Hold': 'on_hold',
      'Cancelled': 'on_hold',
    };
    return dbMap[uiStatus] || uiStatus;
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    console.log('🔄 updateCampaignStatus called:', { campaignId, newStatus });
    
    try {
      const dbStatus = getDbStatus(newStatus);
      console.log('📝 Updating to DB status:', dbStatus);
      
      const { data, error } = await supabase
        .from('soundcloud_submissions')
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
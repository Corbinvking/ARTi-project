"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ExternalLink, Music, DollarSign, Calendar, User, Edit, Trash2, Search, ArrowUpDown, TrendingUp, TrendingDown, BarChart3, Share, Copy, Check, Instagram, Loader2, RefreshCw, Users, CheckCircle, Clock, AlertCircle, Upload } from "lucide-react";
import { CampaignImportModal } from "./components/CampaignImportModal";
import { ReportingScheduleCard } from "./components/ReportingScheduleCard";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { supabase } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { saveOverride } from "@/lib/overrides";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInstagramCampaignMutations } from "../seedstorm-builder/hooks/useInstagramCampaignMutations";
import { notifyOpsStatusChange } from "@/lib/status-notify";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// Creator status types
type PaymentStatus = 'unpaid' | 'pending' | 'paid';
type PostStatus = 'not_posted' | 'scheduled' | 'posted';
type ApprovalStatus = 'pending' | 'approved' | 'revision_requested' | 'rejected';
type PageStatus = 'proposed' | 'approved' | 'paid' | 'ready' | 'posted' | 'complete';

interface CampaignCreator {
  id: string;
  campaign_id: string;
  instagram_handle: string;
  rate: number;
  posts_count: number;
  post_type: string;
  payment_status: PaymentStatus;
  post_status: PostStatus;
  approval_status: ApprovalStatus;
  payment_notes?: string;
  approval_notes?: string;
  // New fields for seeding workflow
  budget_allocation?: number;
  sort_order?: number;
  is_auto_selected?: boolean;
  do_not_use?: boolean;
  page_status?: PageStatus;
}

// Status Indicator Component
const StatusIndicator = ({ type, status }: { type: 'payment' | 'post' | 'approval'; status: string }) => {
  const getConfig = () => {
    switch (type) {
      case 'payment':
        switch (status) {
          case 'paid': return { color: 'bg-green-500', label: 'Paid' };
          case 'pending': return { color: 'bg-yellow-500', label: 'Pending' };
          default: return { color: 'bg-red-500', label: 'Unpaid' };
        }
      case 'post':
        switch (status) {
          case 'posted': return { color: 'bg-green-500', label: 'Posted' };
          case 'scheduled': return { color: 'bg-blue-500', label: 'Scheduled' };
          default: return { color: 'bg-gray-500', label: 'Not Posted' };
        }
      case 'approval':
        switch (status) {
          case 'approved': return { color: 'bg-green-500', label: 'Approved' };
          case 'revision_requested': return { color: 'bg-orange-500', label: 'Revision' };
          case 'rejected': return { color: 'bg-red-500', label: 'Rejected' };
          default: return { color: 'bg-yellow-500', label: 'Pending' };
        }
    }
  };
  const config = getConfig();
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-xs">{config.label}</span>
    </div>
  );
};

export default function InstagramCampaignsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isScrapingCampaign, setIsScrapingCampaign] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [modalTab, setModalTab] = useState("details");
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateCampaignAsync, deleteCampaign, isUpdating, isDeleting } = useInstagramCampaignMutations();
  const { user } = useAuth();

  // Fetch campaign creators when a campaign is selected
  const { data: campaignCreators = [], isLoading: loadingCreators, refetch: refetchCreators } = useQuery({
    queryKey: ['campaign-creators', selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return [];
      const { data, error } = await supabase
        .from('instagram_campaign_creators')
        .select('*')
        .eq('campaign_id', String(selectedCampaign.id))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CampaignCreator[];
    },
    enabled: !!selectedCampaign?.id && isDetailsOpen
  });

  // Update creator status
  const updateCreatorStatus = async (creatorId: string, updates: Partial<CampaignCreator>) => {
    try {
      const { error } = await supabase
        .from('instagram_campaign_creators')
        .update(updates)
        .eq('id', creatorId);
      if (error) throw error;
      refetchCreators();
      toast({ title: "Status Updated", description: "Creator status updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update creator status", variant: "destructive" });
    }
  };

  // Bulk update creators
  const bulkUpdateCreators = async (creatorIds: string[], updates: Partial<CampaignCreator>) => {
    try {
      const { error } = await supabase
        .from('instagram_campaign_creators')
        .update(updates)
        .in('id', creatorIds);
      if (error) throw error;
      refetchCreators();
      setSelectedCreators([]);
      toast({ title: "Bulk Update Complete", description: `Updated ${creatorIds.length} creators` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update creators", variant: "destructive" });
    }
  };

  // State for adding post URLs
  const [newPostUrl, setNewPostUrl] = useState("");
  const [addingPost, setAddingPost] = useState(false);
  const [selectedCreatorForPost, setSelectedCreatorForPost] = useState<string>("");

  // Fetch campaign posts
  const { data: campaignPosts = [], isLoading: loadingPosts, refetch: refetchPosts } = useQuery({
    queryKey: ['campaign-posts', selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return [];
      const { data, error } = await supabase
        .from('campaign_posts')
        .select('*')
        .eq('campaign_id', selectedCampaign.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCampaign?.id && isDetailsOpen
  });

  // Add a new post URL
  const addPostUrl = async () => {
    if (!newPostUrl.trim() || !selectedCampaign?.id) return;
    setAddingPost(true);
    try {
      // Extract Instagram handle from URL if possible
      const urlMatch = newPostUrl.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
      const postType = newPostUrl.includes('/reel/') ? 'reel' : newPostUrl.includes('/p/') ? 'post' : 'other';
      
      // Find the selected creator to get their handle
      const linkedCreator = selectedCreatorForPost 
        ? campaignCreators.find(c => c.id === selectedCreatorForPost)
        : null;
      
      const { error } = await supabase
        .from('campaign_posts')
        .insert({
          campaign_id: selectedCampaign.id,
          creator_id: selectedCreatorForPost || null,
          post_url: newPostUrl.trim(),
          post_type: postType,
          instagram_handle: linkedCreator?.instagram_handle || 'pending',
          status: 'live'
        });
      if (error) throw error;
      setNewPostUrl("");
      setSelectedCreatorForPost("");
      refetchPosts();
      
      // Update creator post_status to posted if linked
      if (selectedCreatorForPost) {
        await updateCreatorStatus(selectedCreatorForPost, { post_status: 'posted' });
      }
      
      toast({ 
        title: "Post Added", 
        description: linkedCreator 
          ? `Instagram post linked to @${linkedCreator.instagram_handle}` 
          : "Instagram post URL added successfully" 
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add post URL", variant: "destructive" });
    } finally {
      setAddingPost(false);
    }
  };

  // Delete a post
  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      refetchPosts();
      toast({ title: "Post Deleted", description: "Post removed from campaign" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    }
  };

  // Fetch campaigns from Supabase with calculated spend from campaign_creators
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['instagram-campaigns'],
    queryFn: async () => {
      console.log('📡 Fetching Instagram campaigns...');
      
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('instagram_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (campaignsError) {
        console.error('❌ Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }
      
      // Fetch all campaign creators with payment status
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('instagram_campaign_creators')
        .select('campaign_id, rate, posts_count, payment_status');
      
      if (creatorsError) {
        console.warn('⚠️ Could not fetch instagram_campaign_creators:', creatorsError);
      }
      
      // Calculate spend and remaining for each campaign
      const campaignsWithCalculatedSpend = (campaignsData || []).map(campaign => {
        // Get creators for this campaign (campaign_id is TEXT in instagram_campaign_creators)
        const campaignCreators = (creatorsData || []).filter(
          (c: any) => String(c.campaign_id) === String(campaign.id)
        );
        
        // Calculate total paid (sum of rate * posts_count for paid creators)
        const paidAmount = campaignCreators
          .filter((c: any) => c.payment_status === 'paid')
          .reduce((sum: number, c: any) => sum + ((c.rate || 0) * (c.posts_count || 1)), 0);
        
        // Calculate total committed (all creators, regardless of payment status)
        const totalCommitted = campaignCreators
          .reduce((sum: number, c: any) => sum + ((c.rate || 0) * (c.posts_count || 1)), 0);
        
        // Parse budget from price field
        const budgetNum = parseFloat(campaign.price?.replace(/[^0-9.]/g, '') || '0');
        
        // Calculate remaining: budget - total committed
        const calculatedRemaining = Math.max(0, budgetNum - totalCommitted);
        
        // Use calculated values if we have creator data, otherwise use stored values
        const hasCreatorData = campaignCreators.length > 0;
        
        return {
          ...campaign,
          // Calculated spend (what's been paid to creators)
          calculated_spend: paidAmount,
          calculated_committed: totalCommitted,
          calculated_remaining: calculatedRemaining,
          // Override display values if we have creator data
          spend: hasCreatorData ? `$${paidAmount.toFixed(2)}` : campaign.spend,
          remaining: hasCreatorData ? `$${calculatedRemaining.toFixed(2)}` : campaign.remaining,
          // Add creator counts for display
          creator_count: campaignCreators.length,
          paid_creator_count: campaignCreators.filter((c: any) => c.payment_status === 'paid').length,
        };
      });
      
      console.log(`✅ Fetched ${campaignsWithCalculatedSpend?.length || 0} campaigns with calculated spend`);
      return campaignsWithCalculatedSpend;
    }
  });

  const handleViewDetails = (campaign: any) => {
    setSelectedCampaign(campaign);
    setEditForm(campaign);
    setIsEditMode(false);
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditForm(selectedCampaign);
    setIsEditMode(false);
  };

  const addNoteHistory = async (noteType: 'internal' | 'client' | 'admin' | 'issues', content: string) => {
    if (!content.trim()) return;
    await supabase.from('campaign_note_history').insert({
      org_id: user?.tenantId || '00000000-0000-0000-0000-000000000001',
      service: 'instagram',
      campaign_id: String(selectedCampaign?.id || ''),
      note_type: noteType,
      content,
      created_by: user?.id || null,
    });
  };

  const handleSaveEdit = async () => {
    const internalChanged =
      (editForm?.report_notes || '').trim() !== (selectedCampaign?.report_notes || '').trim();
    const clientChanged =
      (editForm?.client_notes || '').trim() !== (selectedCampaign?.client_notes || '').trim();
    const adminChanged =
      (editForm?.admin_notes || '').trim() !== (selectedCampaign?.admin_notes || '').trim();
    const issuesChanged =
      (editForm?.issues_notes || '').trim() !== (selectedCampaign?.issues_notes || '').trim();
    const previousStatus = normalizeStatus(selectedCampaign?.status);
    const nextStatus = normalizeStatus(editForm?.status);

    // Prepare updates, converting preferred_pages from string to array if needed
    const updates = { ...editForm };
    if (typeof updates.preferred_pages === 'string') {
      updates.preferred_pages = updates.preferred_pages
        .split(',')
        .map((p: string) => p.trim().replace(/^@/, ''))
        .filter((p: string) => p.length > 0);
    }

    await updateCampaignAsync({
      id: selectedCampaign.id,
      updates
    });

    if (previousStatus !== nextStatus) {
      await notifyOpsStatusChange({
        service: "instagram",
        campaignId: String(selectedCampaign?.id || ''),
        status: nextStatus,
        previousStatus,
        actorEmail: user?.email || null,
      });
    }

    if (internalChanged) {
      await addNoteHistory('internal', editForm?.report_notes || '');
      await saveOverride({
        service: 'instagram',
        campaignId: String(selectedCampaign?.id || ''),
        fieldKey: 'report_notes',
        originalValue: selectedCampaign?.report_notes || '',
        overrideValue: editForm?.report_notes || '',
        overrideReason: 'Manual override',
        orgId: user?.tenantId || '00000000-0000-0000-0000-000000000001',
        overriddenBy: user?.id || null,
      });
    }
    if (clientChanged) {
      await addNoteHistory('client', editForm?.client_notes || '');
      await saveOverride({
        service: 'instagram',
        campaignId: String(selectedCampaign?.id || ''),
        fieldKey: 'client_notes',
        originalValue: selectedCampaign?.client_notes || '',
        overrideValue: editForm?.client_notes || '',
        overrideReason: 'Manual override',
        orgId: user?.tenantId || '00000000-0000-0000-0000-000000000001',
        overriddenBy: user?.id || null,
      });
    }
    if (adminChanged) {
      await addNoteHistory('admin', editForm?.admin_notes || '');
      await saveOverride({
        service: 'instagram',
        campaignId: String(selectedCampaign?.id || ''),
        fieldKey: 'admin_notes',
        originalValue: selectedCampaign?.admin_notes || '',
        overrideValue: editForm?.admin_notes || '',
        overrideReason: 'Manual override',
        orgId: user?.tenantId || '00000000-0000-0000-0000-000000000001',
        overriddenBy: user?.id || null,
      });
    }
    if (issuesChanged) {
      await addNoteHistory('issues', editForm?.issues_notes || '');
      await saveOverride({
        service: 'instagram',
        campaignId: String(selectedCampaign?.id || ''),
        fieldKey: 'issues_notes',
        originalValue: selectedCampaign?.issues_notes || '',
        overrideValue: editForm?.issues_notes || '',
        overrideReason: 'Manual override',
        orgId: user?.tenantId || '00000000-0000-0000-0000-000000000001',
        overriddenBy: user?.id || null,
      });
    }

    setIsEditMode(false);
    setIsDetailsOpen(false);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteCampaign(selectedCampaign.id);
    setIsDeleteDialogOpen(false);
    setIsDetailsOpen(false);
  };

  const updateField = (field: string, value: string | boolean) => {
    setEditForm((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // Trigger scraping for the current campaign
  const handleScrapeCampaign = async () => {
    if (!selectedCampaign?.instagram_url) {
      toast({
        title: "No Instagram URL",
        description: "Please add an Instagram URL first and save changes.",
        variant: "destructive",
      });
      return;
    }

    setIsScrapingCampaign(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/instagram-scraper/campaign/${selectedCampaign.id}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [selectedCampaign.instagram_url],
          resultsLimit: 30,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Scraping Complete!",
          description: `Successfully scraped ${data.data?.count || 0} posts for this campaign.`,
        });
      } else {
        throw new Error(data.error || 'Scraping failed');
      }
    } catch (error: any) {
      toast({
        title: "Scraping Failed",
        description: error.message || "Failed to scrape Instagram posts. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsScrapingCampaign(false);
    }
  };

  const normalizeStatus = (status?: string) => {
    const value = (status || '').toLowerCase();
    if (['pending', 'ready', 'active', 'complete', 'on_hold'].includes(value)) return value;
    if (['draft', 'pending_approval', 'new'].includes(value)) return 'pending';
    if (value === 'approved') return 'ready';
    if (['paused', 'cancelled', 'unreleased', 'rejected'].includes(value)) return 'on_hold';
    if (value === 'completed') return 'complete';
    return value || 'pending';
  };

  const formatStatusLabel = (status?: string) =>
    normalizeStatus(status)
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const getStatusColor = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'active': return 'bg-green-500';
      case 'ready': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'complete': return 'bg-blue-500';
      case 'on_hold': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Calculate KPIs and status counts
  const kpis = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c: any) => normalizeStatus(c.status) === 'active').length,
    readyCampaigns: campaigns.filter((c: any) => normalizeStatus(c.status) === 'ready').length,
    pendingCampaigns: campaigns.filter((c: any) => normalizeStatus(c.status) === 'pending').length,
    completeCampaigns: campaigns.filter((c: any) => normalizeStatus(c.status) === 'complete').length,
    onHoldCampaigns: campaigns.filter((c: any) => normalizeStatus(c.status) === 'on_hold').length,
    totalBudget: campaigns.reduce((sum: number, c: any) => {
      const price = parseFloat(c.price?.replace(/[^0-9.]/g, '') || '0');
      return sum + price;
    }, 0),
    // Use calculated spend from creator payments when available
    totalSpend: campaigns.reduce((sum: number, c: any) => {
      return sum + (c.calculated_spend || parseFloat(c.spend?.replace(/[^0-9.]/g, '') || '0'));
    }, 0),
    // Use calculated remaining when available
    totalRemaining: campaigns.reduce((sum: number, c: any) => {
      return sum + (c.calculated_remaining ?? parseFloat(c.remaining?.replace(/[^0-9.]/g, '') || '0'));
    }, 0),
    // Total committed to creators (regardless of payment status)
    totalCommitted: campaigns.reduce((sum: number, c: any) => {
      return sum + (c.calculated_committed || 0);
    }, 0),
    // Total creators across all campaigns
    totalCreators: campaigns.reduce((sum: number, c: any) => sum + (c.creator_count || 0), 0),
  };

  // Calculate completion rate
  const completionRate = kpis.totalBudget > 0 
    ? ((kpis.totalSpend / kpis.totalBudget) * 100).toFixed(1)
    : '0';

  // Handle column sort
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        // Toggle direction or clear if already desc
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Clear sort
        }
      }
      return { key, direction: 'asc' };
    });
  };

  // Get sort indicator for column
  const getSortIndicator = (key: string) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // Filter campaigns based on search and status
  const filteredCampaigns = campaigns
    .filter((campaign: any) => {
    const matchesSearch = 
      campaign.campaign?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.clients?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.salespeople?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || normalizeStatus(campaign.status) === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
    })
    .sort((a: any, b: any) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;
      let aVal: any, bVal: any;
      
      switch (key) {
        case 'campaign':
          aVal = a.campaign?.toLowerCase() || '';
          bVal = b.campaign?.toLowerCase() || '';
          break;
        case 'clients':
          aVal = a.clients?.toLowerCase() || '';
          bVal = b.clients?.toLowerCase() || '';
          break;
        case 'status':
          aVal = a.status?.toLowerCase() || '';
          bVal = b.status?.toLowerCase() || '';
          break;
        case 'progress':
          const aPriceNum = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
          const aCommitted = a.calculated_committed ?? parseFloat(a.spend?.replace(/[^0-9.]/g, '') || '0');
          aVal = aPriceNum > 0 ? (aCommitted / aPriceNum) * 100 : 0;
          const bPriceNum = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');
          const bCommitted = b.calculated_committed ?? parseFloat(b.spend?.replace(/[^0-9.]/g, '') || '0');
          bVal = bPriceNum > 0 ? (bCommitted / bPriceNum) * 100 : 0;
          break;
        case 'budget':
          aVal = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
          bVal = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');
          break;
        case 'spend':
          aVal = a.calculated_spend ?? parseFloat(a.spend?.replace(/[^0-9.]/g, '') || '0');
          bVal = b.calculated_spend ?? parseFloat(b.spend?.replace(/[^0-9.]/g, '') || '0');
          break;
        case 'remaining':
          aVal = a.calculated_remaining ?? parseFloat(a.remaining?.replace(/[^0-9.]/g, '') || '0');
          bVal = b.calculated_remaining ?? parseFloat(b.remaining?.replace(/[^0-9.]/g, '') || '0');
          break;
        case 'salespeople':
          aVal = a.salespeople?.toLowerCase() || '';
          bVal = b.salespeople?.toLowerCase() || '';
          break;
        case 'date':
          aVal = a.start_date ? new Date(a.start_date).getTime() : 0;
          bVal = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Campaign History</h1>
          <p className="text-muted-foreground">
            View and manage all Instagram campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Link href="/instagram/campaign-builder">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metrics */}
      {!isLoading && campaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${kpis.totalBudget.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {kpis.totalCampaigns} campaigns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${kpis.totalSpend.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {completionRate}% of budget
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${kpis.totalRemaining.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Available to allocate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {kpis.activeCampaigns}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Tabs */}
      {!isLoading && campaigns.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="flex items-center gap-2"
              >
                All
                <Badge variant="secondary" className="ml-1">
                  {kpis.totalCampaigns}
                </Badge>
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                Pending
                <Badge variant="secondary" className="ml-1">
                  {kpis.pendingCampaigns}
                </Badge>
              </Button>
              <Button
                variant={statusFilter === "ready" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("ready")}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                Ready
                <Badge variant="secondary" className="ml-1">
                  {kpis.readyCampaigns}
                </Badge>
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Active
                <Badge variant="secondary" className="ml-1">
                  {kpis.activeCampaigns}
                </Badge>
              </Button>
              <Button
                variant={statusFilter === "on_hold" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("on_hold")}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                On Hold
                <Badge variant="secondary" className="ml-1">
                  {kpis.onHoldCampaigns}
                </Badge>
              </Button>
              <Button
                variant={statusFilter === "complete" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("complete")}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                Complete
                <Badge variant="secondary" className="ml-1">
                  {kpis.completeCampaigns}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns, clients, salesperson..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">Loading campaigns...</div>
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No campaigns yet. Create your first Instagram campaign to get started.
            </p>
            <Link href="/instagram/campaign-builder">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              No campaigns match your filters. Try adjusting your search or filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Showing {filteredCampaigns.length} of {campaigns.length} campaigns
              </CardTitle>
              <CardDescription>
                {statusFilter !== 'all' && `Filtered by: ${statusFilter}`}
                {searchTerm && ` • Search: "${searchTerm}"`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead 
                    className="w-[16%] px-3 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('campaign')}
                  >
                    <div className="flex items-center gap-1">
                      Campaign {getSortIndicator('campaign')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[10%] px-2 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('clients')}
                  >
                    <div className="flex items-center gap-1">
                      Client {getSortIndicator('clients')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[9%] px-2 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status {getSortIndicator('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[18%] px-2 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center gap-1">
                      Progress {getSortIndicator('progress')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right w-[10%] px-2 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('budget')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Budget {getSortIndicator('budget')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right w-[10%] px-2 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('spend')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Spend {getSortIndicator('spend')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right w-[10%] px-2 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('remaining')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Left {getSortIndicator('remaining')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[9%] px-2 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('salespeople')}
                  >
                    <div className="flex items-center gap-1">
                      Sales {getSortIndicator('salespeople')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[8%] px-2 cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Date {getSortIndicator('date')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign: any) => {
                  // Calculate budget progress using calculated values when available
                  const priceNum = parseFloat(campaign.price?.replace(/[^0-9.]/g, '') || '0');
                  const spendNum = campaign.calculated_spend ?? parseFloat(campaign.spend?.replace(/[^0-9.]/g, '') || '0');
                  const committedNum = campaign.calculated_committed ?? spendNum;
                  const remainingNum = campaign.calculated_remaining ?? parseFloat(campaign.remaining?.replace(/[^0-9.]/g, '') || '0');
                  // Progress shows committed amount (what's been allocated to creators)
                  const progressPercent = priceNum > 0 ? (committedNum / priceNum) * 100 : 0;
                  
                  return (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewDetails(campaign)}
                    >
                      <TableCell className="font-medium py-2 px-3">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {campaign.sound_url && <Music className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                          <span className="font-semibold text-xs truncate">
                            {campaign.campaign || 'Untitled'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="text-xs truncate block">{campaign.clients || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Badge className={getStatusColor(campaign.status || 'pending')} variant="outline">
                          <span className="text-[10px]">{formatStatusLabel(campaign.status || 'pending')}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Progress value={Math.min(progressPercent, 100)} className="h-1 flex-1" />
                            <span className="text-[10px] font-medium min-w-[28px] text-right">
                              {progressPercent.toFixed(0)}%
                            </span>
                          </div>
                          {progressPercent >= 100 ? (
                            <div className="text-[10px] text-green-600 font-medium">
                              ✓ Done
                            </div>
                          ) : remainingNum > 0 ? (
                            <div className="text-[10px] text-orange-600 font-medium truncate">
                              ${remainingNum.toLocaleString()} left
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2 px-2">
                        <span className="font-semibold text-xs">
                          {campaign.price || '$0'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2 px-2">
                        <span className="font-semibold text-xs text-green-600">
                          {campaign.spend || '$0'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2 px-2">
                        <span className="font-semibold text-xs text-orange-600">
                          {campaign.remaining || '$0'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="text-xs truncate block">{campaign.salespeople || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="text-[10px]">{campaign.start_date || '-'}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Campaign Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => {
        setIsDetailsOpen(open);
        if (!open) {
          setSelectedCreators([]);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl">
                  {selectedCampaign?.campaign || 'Campaign Details'}
                </DialogTitle>
                <DialogDescription>
                  Client: {selectedCampaign?.clients || 'N/A'}
                </DialogDescription>
              </div>
              {!isEditMode && (
                <div className="flex gap-2">
                  <Link href={`/instagram/campaigns/${selectedCampaign?.id}/analytics`}>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View Analytics
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/share/campaign/${selectedCampaign?.id}`;
                      navigator.clipboard.writeText(shareUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="flex items-center gap-2"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share className="h-4 w-4" />
                        Share Link
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              )}
              {isEditMode && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div>
                {isEditMode ? (
                  <select
                    value={normalizeStatus(editForm.status) || 'pending'}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="px-3 py-1 border rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="ready">Ready</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="complete">Complete</option>
                  </select>
                ) : (
                  <Badge className={getStatusColor(selectedCampaign.status || 'pending')}>
                    {formatStatusLabel(selectedCampaign.status || 'pending')}
                  </Badge>
                )}
              </div>

              {/* Financial Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Price</p>
                    {isEditMode ? (
                      <Input
                        value={editForm.price || ''}
                        onChange={(e) => updateField('price', e.target.value)}
                        placeholder="$0"
                      />
                    ) : (
                      <p className="text-xl font-bold">{selectedCampaign.price || '$0'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Spend</p>
                    {isEditMode ? (
                      <Input
                        value={editForm.spend || ''}
                        onChange={(e) => updateField('spend', e.target.value)}
                        placeholder="$0"
                      />
                    ) : (
                      <p className="text-xl font-bold">{selectedCampaign.spend || '$0'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                    {isEditMode ? (
                      <Input
                        value={editForm.remaining || ''}
                        onChange={(e) => updateField('remaining', e.target.value)}
                        placeholder="$0"
                      />
                    ) : (
                      <p className="text-xl font-bold">{selectedCampaign.remaining || '$0'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Invoice Status</p>
                    {isEditMode ? (
                      <Input
                        value={editForm.invoice || ''}
                        onChange={(e) => updateField('invoice', e.target.value)}
                        placeholder="N/A"
                      />
                    ) : (
                      <p className="text-lg font-medium">
                        {selectedCampaign.invoice_status || selectedCampaign.invoice || 'N/A'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Invoice ID</p>
                    <p className="text-lg font-medium">{selectedCampaign.source_invoice_id || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Campaign Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedCampaign.start_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">{selectedCampaign.start_date}</span>
                    </div>
                  )}
                  {selectedCampaign.salespeople && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salesperson:</span>
                      <span className="font-medium">{selectedCampaign.salespeople}</span>
                    </div>
                  )}
                  {selectedCampaign.campaign_started && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campaign Started:</span>
                      <span className="font-medium">{selectedCampaign.campaign_started}</span>
                    </div>
                  )}
                  {selectedCampaign.paid_ops && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid Ops:</span>
                      <span className="font-medium">{selectedCampaign.paid_ops}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Seeding Configuration */}
              <Card className="border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Seeding Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Seeding Type:</span>
                    {isEditMode ? (
                      <select
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={editForm.seeding_type || 'audio'}
                        onChange={(e) => updateField('seeding_type', e.target.value)}
                      >
                        <option value="audio">Audio Seeding</option>
                        <option value="footage">Footage Seeding</option>
                      </select>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {selectedCampaign.seeding_type || 'audio'} seeding
                      </Badge>
                    )}
                  </div>
                  
                  {(selectedCampaign.preferred_pages?.length > 0 || isEditMode) && (
                    <div>
                      <span className="text-muted-foreground text-sm">Preferred Pages:</span>
                      {isEditMode ? (
                        <Input
                          className="mt-1"
                          value={Array.isArray(editForm.preferred_pages) 
                            ? editForm.preferred_pages.join(', ') 
                            : editForm.preferred_pages || ''}
                          onChange={(e) => updateField('preferred_pages', e.target.value)}
                          placeholder="@page1, @page2, @page3"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(selectedCampaign.preferred_pages || []).map((page: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              @{page.replace(/^@/, '')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(selectedCampaign.brief || isEditMode) && (
                    <div>
                      <span className="text-muted-foreground text-sm">Campaign Brief:</span>
                      {isEditMode ? (
                        <Textarea
                          className="mt-1"
                          rows={4}
                          value={editForm.brief || ''}
                          onChange={(e) => updateField('brief', e.target.value)}
                          placeholder="Campaign goals, posting expectations, content guidelines..."
                        />
                      ) : (
                        <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                          {selectedCampaign.brief}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sound/Music Details */}
              {selectedCampaign.sound_url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Music/Sound
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a 
                      href={selectedCampaign.sound_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      View Sound/Track
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardContent>
                </Card>
              )}

              {/* Tracker */}
              {selectedCampaign.tracker && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Campaign Tracker</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a 
                      href={selectedCampaign.tracker} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      View Tracker
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardContent>
                </Card>
              )}

              {/* Instagram Scraper Settings */}
              <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    Instagram Analytics Tracking
                  </CardTitle>
                  <CardDescription>
                    {(() => {
                      const status = (selectedCampaign.status || '').toLowerCase();
                      const isInactive = status.includes('inactive') || status.includes('cancelled') || status.includes('canceled');
                      if (isInactive) {
                        return "This campaign is inactive - not being tracked";
                      } else if (selectedCampaign.instagram_url) {
                        return "✓ Automatically tracked daily at 6 AM UTC";
                      } else {
                        return "Add an Instagram URL to enable automatic tracking";
                      }
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tracking Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Tracking Status:</span>
                    {(() => {
                      const status = (selectedCampaign.status || '').toLowerCase();
                      const isInactive = status.includes('inactive') || status.includes('cancelled') || status.includes('canceled');
                      if (isInactive) {
                        return <Badge variant="secondary">Inactive - Not Tracked</Badge>;
                      } else if (selectedCampaign.instagram_url) {
                        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active - Tracking</Badge>;
                      } else {
                        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">Needs URL</Badge>;
                      }
                    })()}
                  </div>

                  {/* Instagram URL Input */}
                  <div>
                    <Label htmlFor="instagram_url" className="text-sm font-medium mb-2 block">
                      Instagram Profile or Post URL
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="instagram_url"
                        value={editForm.instagram_url || ''}
                        onChange={(e) => updateField('instagram_url', e.target.value)}
                        placeholder="https://www.instagram.com/username or https://www.instagram.com/p/..."
                        className="font-mono text-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {selectedCampaign.instagram_url ? (
                          <>
                            <a 
                              href={selectedCampaign.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline font-mono truncate flex-1"
                            >
                              {selectedCampaign.instagram_url}
                            </a>
                            <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            No Instagram URL set - Click Edit to add one
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      All active campaigns with a valid Instagram URL are automatically tracked daily
                    </p>
                  </div>

                  {/* Last Scraped Info */}
                  {selectedCampaign.last_scraped_at && (
                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-sm text-muted-foreground">Last Scraped:</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedCampaign.last_scraped_at).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Manual Scrape Button */}
                  {!isEditMode && selectedCampaign.instagram_url && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScrapeCampaign}
                        disabled={isScrapingCampaign}
                        className="w-full flex items-center gap-2"
                      >
                        {isScrapingCampaign ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Scraping...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Scrape Now
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Manually trigger a scrape to fetch latest Instagram data
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Internal Notes */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Internal Notes (Ops Only):</p>
                    {isEditMode ? (
                      <Textarea
                        value={editForm.report_notes || ''}
                        onChange={(e) => updateField('report_notes', e.target.value)}
                        placeholder="Add report notes..."
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm">{selectedCampaign.report_notes || '-'}</p>
                    )}
                  </div>

                  {/* Client Notes */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Client Notes (Visible to Clients):</p>
                    <p className="text-xs text-muted-foreground mb-2">Brief plan, posting window, what to expect</p>
                    {isEditMode ? (
                      <Textarea
                        value={editForm.client_notes || ''}
                        onChange={(e) => updateField('client_notes', e.target.value)}
                        placeholder="Add client-facing notes (brief, posting window, expectations)..."
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm">{selectedCampaign.client_notes || '-'}</p>
                    )}
                  </div>

                  {/* Admin Notes */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Admin Notes:</p>
                    <p className="text-xs text-muted-foreground mb-2">Page selection, payment details, admin info</p>
                    {isEditMode ? (
                      <Textarea
                        value={editForm.admin_notes || ''}
                        onChange={(e) => updateField('admin_notes', e.target.value)}
                        placeholder="Add admin notes (page/payment/admin details)..."
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm">{selectedCampaign.admin_notes || '-'}</p>
                    )}
                  </div>

                  {/* Issues Notes */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-orange-600 mb-1">Issues / Do-Not-Use Notes:</p>
                    <p className="text-xs text-muted-foreground mb-2">Known issues, do-not-use pages, problems</p>
                    {isEditMode ? (
                      <Textarea
                        value={editForm.issues_notes || ''}
                        onChange={(e) => updateField('issues_notes', e.target.value)}
                        placeholder="Add issues (do-not-use pages, known problems)..."
                        rows={3}
                        className="border-orange-200 focus:border-orange-400"
                      />
                    ) : (
                      <p className="text-sm">{selectedCampaign.issues_notes || '-'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reporting Schedule */}
              <ReportingScheduleCard 
                campaign={selectedCampaign}
                onUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: ['instagram-campaigns'] });
                  setIsDetailsOpen(false);
                }}
              />

              {/* Legacy Tracking Checkboxes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={selectedCampaign.send_tracker === 'checked'} 
                      disabled 
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Tracker Sent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={selectedCampaign.send_final_report === 'checked' || !!selectedCampaign.final_report_sent_at} 
                      disabled 
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Final Report Sent</span>
                  </div>
                </CardContent>
              </Card>

              {/* Creator Management Section */}
              <Card className="border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Creator Management
                  </CardTitle>
                  <CardDescription>
                    Track payment, post, and approval status for campaign creators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCreators ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading creators...
                    </div>
                  ) : campaignCreators.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No creators assigned to this campaign yet.</p>
                      <p className="text-sm mt-1">Build a campaign to auto-select creators.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Bulk Actions */}
                      {selectedCreators.length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <span className="text-sm font-medium">{selectedCreators.length} selected</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => bulkUpdateCreators(selectedCreators, { payment_status: 'paid' })}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => bulkUpdateCreators(selectedCreators, { post_status: 'posted' })}
                              className="text-blue-600"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark Posted
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedCreators([])}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Creator Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {campaignCreators.filter(c => c.payment_status === 'paid').length}
                          </div>
                          <div className="text-xs text-muted-foreground">Paid</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {campaignCreators.filter(c => c.post_status === 'posted').length}
                          </div>
                          <div className="text-xs text-muted-foreground">Posted</div>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {campaignCreators.filter(c => c.approval_status === 'approved').length}
                          </div>
                          <div className="text-xs text-muted-foreground">Approved</div>
                        </div>
                      </div>

                      {/* Creator Table */}
                      <ScrollArea className="h-64">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={selectedCreators.length === campaignCreators.length}
                                  onCheckedChange={(checked) => {
                                    setSelectedCreators(checked ? campaignCreators.map(c => c.id) : []);
                                  }}
                                />
                              </TableHead>
                              <TableHead>Creator</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead className="text-right">Budget Override</TableHead>
                              <TableHead>Page Status</TableHead>
                              <TableHead>Payment</TableHead>
                              <TableHead>Post</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {campaignCreators.map((creator) => (
                              <TableRow key={creator.id} className={creator.do_not_use ? 'opacity-50 bg-orange-50' : ''}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedCreators.includes(creator.id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedCreators(prev => 
                                        checked 
                                          ? [...prev, creator.id]
                                          : prev.filter(id => id !== creator.id)
                                      );
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-sm flex items-center gap-1">
                                      @{creator.instagram_handle}
                                      {creator.is_auto_selected === false && (
                                        <Badge variant="outline" className="text-[10px] ml-1">Manual</Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {creator.posts_count} post{creator.posts_count > 1 ? 's' : ''} • {creator.post_type}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-muted-foreground">
                                  ${creator.rate?.toLocaleString() || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={creator.budget_allocation ?? creator.rate ?? ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      updateCreatorStatus(creator.id, { budget_allocation: value } as any);
                                    }}
                                    className="w-20 h-8 text-right"
                                    placeholder={String(creator.rate || 0)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={creator.page_status || 'proposed'}
                                    onValueChange={(value) => updateCreatorStatus(creator.id, { page_status: value } as any)}
                                  >
                                    <SelectTrigger className="w-24 h-8">
                                      <span className="text-xs">{(creator.page_status || 'proposed').charAt(0).toUpperCase() + (creator.page_status || 'proposed').slice(1)}</span>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="proposed">Proposed</SelectItem>
                                      <SelectItem value="approved">Approved</SelectItem>
                                      <SelectItem value="paid">Paid</SelectItem>
                                      <SelectItem value="ready">Ready</SelectItem>
                                      <SelectItem value="posted">Posted</SelectItem>
                                      <SelectItem value="complete">Complete</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={creator.payment_status}
                                    onValueChange={(value) => updateCreatorStatus(creator.id, { payment_status: value as PaymentStatus })}
                                  >
                                    <SelectTrigger className="w-24 h-8">
                                      <StatusIndicator type="payment" status={creator.payment_status} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unpaid"><StatusIndicator type="payment" status="unpaid" /></SelectItem>
                                      <SelectItem value="pending"><StatusIndicator type="payment" status="pending" /></SelectItem>
                                      <SelectItem value="paid"><StatusIndicator type="payment" status="paid" /></SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={creator.post_status}
                                    onValueChange={(value) => updateCreatorStatus(creator.id, { post_status: value as PostStatus })}
                                  >
                                    <SelectTrigger className="w-28 h-8">
                                      <StatusIndicator type="post" status={creator.post_status} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="not_posted"><StatusIndicator type="post" status="not_posted" /></SelectItem>
                                      <SelectItem value="scheduled"><StatusIndicator type="post" status="scheduled" /></SelectItem>
                                      <SelectItem value="posted"><StatusIndicator type="post" status="posted" /></SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Post URLs Management */}
              <Card className="border-pink-500/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    Campaign Posts
                  </CardTitle>
                  <CardDescription>
                    Track Instagram post URLs for this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add Post URL Form */}
                  <div className="space-y-2 mb-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste Instagram post URL (e.g., https://instagram.com/p/...)"
                        value={newPostUrl}
                        onChange={(e) => setNewPostUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addPostUrl()}
                        className="flex-1"
                      />
                      <Button onClick={addPostUrl} disabled={addingPost || !newPostUrl.trim()}>
                        {addingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                    {/* Creator/Page Selector */}
                    {campaignCreators.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Link to page:</Label>
                        <Select
                          value={selectedCreatorForPost}
                          onValueChange={setSelectedCreatorForPost}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select page (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No page link</SelectItem>
                            {campaignCreators.map((creator) => (
                              <SelectItem key={creator.id} value={creator.id}>
                                @{creator.instagram_handle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {loadingPosts ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading posts...
                    </div>
                  ) : campaignPosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Instagram className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No post URLs added yet.</p>
                      <p className="text-sm mt-1">Add Instagram post URLs to track campaign performance.</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {campaignPosts.map((post: any) => (
                          <div key={post.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Badge variant="outline" className="shrink-0">
                                {post.post_type || 'post'}
                              </Badge>
                              {post.instagram_handle && post.instagram_handle !== 'pending' && (
                                <Badge variant="secondary" className="shrink-0 text-xs">
                                  @{post.instagram_handle}
                                </Badge>
                              )}
                              <a 
                                href={post.post_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline truncate"
                              >
                                {post.post_url}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {post.creator_id && (
                                <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-600">
                                  Linked
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePost(post.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCampaign?.campaign}"? 
              This action cannot be undone and will permanently remove the campaign 
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Modal */}
      <CampaignImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />
    </div>
  );
}


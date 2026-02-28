"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ExternalLink, Music, DollarSign, Calendar, Edit, Trash2, Search, ArrowUpDown, TrendingUp, TrendingDown, BarChart3, Share, Check, Instagram, Loader2, Users, CheckCircle, Clock, AlertCircle, Upload } from "lucide-react";
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
import { notifySlack } from "@/lib/slack-notify";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CREATOR_CONTENT_TYPES } from "../seedstorm-builder/lib/genreSystem";

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

function formatReportNotes(raw: string | null | undefined): string {
  if (!raw) return '-';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    const lines: string[] = [];
    const creators: any[] = parsed.selected_creators ?? [];
    const totals = parsed.totals ?? {};
    const form = parsed.form_data ?? {};

    if (form.campaign_type) lines.push(`Type: ${form.campaign_type}`);
    const niches: string[] = form.selected_genres ?? [];
    if (niches.length) lines.push(`Niches: ${niches.join(', ')}`);
    if (form.territory_preference) lines.push(`Territory: ${form.territory_preference}`);
    const budget = form.total_budget ?? totals.total_cost ?? 0;
    lines.push(`Budget: $${Number(budget).toLocaleString()}`);
    if (totals.total_posts) lines.push(`Total posts: ${totals.total_posts}`);
    if (totals.projected_total_views) lines.push(`Projected views: ${Number(totals.projected_total_views).toLocaleString()}`);
    if (totals.avg_cp1k) lines.push(`Avg CP1K: $${Number(totals.avg_cp1k).toFixed(2)}`);

    if (creators.length) {
      lines.push('');
      lines.push(`Selected creators (${creators.length}):`);
      for (const c of creators) {
        const handle = c.instagram_handle || 'unknown';
        const posts = c.posts_count || 1;
        const rate = c.reel_rate || c.selected_rate || 0;
        lines.push(`  @${handle} — ${posts} post${posts !== 1 ? 's' : ''}, $${rate}/post`);
      }
    }
    return lines.join('\n');
  } catch {
    return trimmed;
  }
}

// Unified page status config
const getPageStatusConfig = (status: string) => {
  switch (status) {
    case 'paid': return { color: 'bg-green-500', label: 'PAID' };
    case 'posted': return { color: 'bg-blue-500', label: 'Posted' };
    default: return { color: 'bg-gray-500', label: 'Proposed' };
  }
};

const PageStatusIndicator = ({ status }: { status: string }) => {
  const config = getPageStatusConfig(status);
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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Quick Create Campaign
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateForm, setQuickCreateForm] = useState({ campaign: '', clients: '', price: '', status: 'pending' });
  const [quickCreating, setQuickCreating] = useState(false);

  // Add Creator inside campaign
  const [isAddCreatorOpen, setIsAddCreatorOpen] = useState(false);
  const [addCreatorTab, setAddCreatorTab] = useState<'existing' | 'new'>('existing');
  const [creatorSearchTerm, setCreatorSearchTerm] = useState('');
  const [selectedExistingCreator, setSelectedExistingCreator] = useState<any>(null);
  const [placementRate, setPlacementRate] = useState('');
  const [placementPostType, setPlacementPostType] = useState('reel');
  const [newCreatorForm, setNewCreatorForm] = useState({ handle: '', email: '', reel_rate: '', genres: [] as string[], content_types: [] as string[] });
  const [addingCreator, setAddingCreator] = useState(false);

  // Manual handle for post tracking
  const [manualPostHandle, setManualPostHandle] = useState("");

  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  const filterParam = searchParams.get("filter");

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

  // Fetch all creators for the "Linked Creator" dropdown and "From Database" picker
  const { data: allCreators = [] } = useQuery({
    queryKey: ['all-creators-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, instagram_handle, followers, reel_rate, engagement_rate, music_genres')
        .order('instagram_handle');
      if (error) throw error;
      return data || [];
    },
    enabled: isDetailsOpen,
    staleTime: 60_000,
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

  // Fallback sync: if campaign has selected_creators but no placements, create them
  const [syncAttempted, setSyncAttempted] = useState<string | null>(null);
  useEffect(() => {
    if (!isDetailsOpen || !selectedCampaign?.id || loadingCreators) return;
    if (campaignCreators.length > 0) return;
    if (syncAttempted === String(selectedCampaign.id)) return;

    const selected: any[] = selectedCampaign.selected_creators;
    if (!Array.isArray(selected) || selected.length === 0) return;

    setSyncAttempted(String(selectedCampaign.id));

    const placementRows = selected.map((creator: any) => ({
      campaign_id: String(selectedCampaign.id),
      instagram_handle: creator.instagram_handle,
      rate: creator.campaign_rate || creator.reel_rate || creator.selected_rate || 0,
      posts_count: creator.posts_count || 1,
      post_type: creator.selected_post_type || 'reel',
      page_status: 'proposed' as const,
      payment_status: 'unpaid' as const,
      post_status: 'not_posted' as const,
      approval_status: 'pending' as const,
      is_auto_selected: false,
    }));

    supabase
      .from('instagram_campaign_creators')
      .insert(placementRows)
      .then(({ error }) => {
        if (error) {
          console.error('Fallback sync failed:', error);
        } else {
          console.log(`Fallback sync: created ${placementRows.length} placements`);
        }
        refetchCreators();
      });
  }, [isDetailsOpen, selectedCampaign?.id, campaignCreators.length, loadingCreators, syncAttempted]);

  // State for adding post URLs
  const [newPostUrl, setNewPostUrl] = useState("");
  const [addingPost, setAddingPost] = useState(false);
  const [selectedCreatorForPost, setSelectedCreatorForPost] = useState<string>("");
  const [refreshingTracking, setRefreshingTracking] = useState(false);

  // Fetch campaign posts
  const { data: campaignPosts = [], isLoading: loadingPosts, refetch: refetchPosts } = useQuery({
    queryKey: ['campaign-posts', selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return [];
      const { data, error } = await supabase
        .from('campaign_posts')
        .select('*')
        .eq('campaign_id', String(selectedCampaign.id))
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
      const postType = newPostUrl.includes('/reel/') ? 'reel' : newPostUrl.includes('/p/') ? 'post' : 'other';
      
      // Find the selected creator to get their handle (optional)
      const linkedCreator = selectedCreatorForPost 
        ? campaignCreators.find(c => c.id === selectedCreatorForPost)
          || allCreators.find(c => c.id === selectedCreatorForPost)
        : null;

      const resolvedHandle = linkedCreator?.instagram_handle || manualPostHandle.replace(/^@/, '').trim() || 'unknown';
      
      const { data: insertedPost, error } = await supabase
        .from('campaign_posts')
        .insert({
          campaign_id: String(selectedCampaign.id),
          creator_id: selectedCreatorForPost || null,
          org_id: user?.tenantId || '00000000-0000-0000-0000-000000000001',
          post_url: newPostUrl.trim(),
          post_type: postType,
          instagram_handle: resolvedHandle,
          status: 'live'
        })
        .select('id')
        .single();
      if (error) throw error;
      setNewPostUrl("");
      setSelectedCreatorForPost("");
      setManualPostHandle("");
      refetchPosts();
      
      // Update placement page_status to posted if creator is a campaign placement
      const isPlacement = campaignCreators.some((c: CampaignCreator) => c.id === selectedCreatorForPost);
      if (selectedCreatorForPost && isPlacement) {
        await updateCreatorStatus(selectedCreatorForPost, { page_status: 'posted' as PageStatus });
      }

      // Fire background scrape to immediately fetch post metrics
      if (insertedPost?.id) {
        fetch('/api/instagram-scraper/track-campaign-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postIds: [insertedPost.id] }),
        })
          .then(() => { setTimeout(() => refetchPosts(), 5000); })
          .catch(() => {});
      }
      
      toast({ 
        title: "Post Added", 
        description: linkedCreator 
          ? `Instagram post linked to @${linkedCreator.instagram_handle} — tracking will start shortly` 
          : `Instagram post added (${resolvedHandle !== 'unknown' ? '@' + resolvedHandle : 'no creator linked'}) — tracking will start shortly`
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
        .select('campaign_id, rate, posts_count, payment_status, page_status');
      
      if (creatorsError) {
        console.warn('⚠️ Could not fetch instagram_campaign_creators:', creatorsError);
      }
      
      // Calculate spend and remaining for each campaign
      const campaignsWithCalculatedSpend = (campaignsData || []).map(campaign => {
        // Get creators for this campaign (campaign_id is TEXT in instagram_campaign_creators)
        const campaignCreators = (creatorsData || []).filter(
          (c: any) => String(c.campaign_id) === String(campaign.id)
        );
        
        const creatorIsPaid = (c: any) => c.page_status === 'paid' || c.page_status === 'posted' || c.payment_status === 'paid';
        const paidAmount = campaignCreators
          .filter(creatorIsPaid)
          .reduce((sum: number, c: any) => sum + ((c.rate || 0) * (c.posts_count || 1)), 0);
        
        const totalCommitted = campaignCreators
          .reduce((sum: number, c: any) => sum + ((c.rate || 0) * (c.posts_count || 1)), 0);
        
        const budgetNum = parseFloat(campaign.price?.replace(/[^0-9.]/g, '') || '0');
        const calculatedRemaining = Math.max(0, budgetNum - totalCommitted);
        const hasCreatorData = campaignCreators.length > 0;
        
        return {
          ...campaign,
          calculated_spend: paidAmount,
          calculated_committed: totalCommitted,
          calculated_remaining: calculatedRemaining,
          spend: hasCreatorData ? `$${paidAmount.toFixed(2)}` : campaign.spend,
          remaining: hasCreatorData ? `$${calculatedRemaining.toFixed(2)}` : campaign.remaining,
          creator_count: campaignCreators.length,
          paid_creator_count: campaignCreators.filter(creatorIsPaid).length,
        };
      });
      
      console.log(`✅ Fetched ${campaignsWithCalculatedSpend?.length || 0} campaigns with calculated spend`);
      return campaignsWithCalculatedSpend;
    }
  });

  // Campaign IDs that need attention (for filter=attention)
  const { data: attentionCampaignIds = [] } = useQuery({
    queryKey: ["instagram-attention-campaign-ids", filterParam],
    queryFn: async (): Promise<string[]> => {
      if (filterParam !== "attention") return [];
      const now = new Date();
      const { data: campaignsData } = await supabase
        .from("instagram_campaigns")
        .select("id, tracker");
      const { data: creatorsData } = await supabase
        .from("instagram_campaign_creators")
        .select("campaign_id, post_status, payment_status, expected_post_date");
      const campaigns = campaignsData || [];
      const creators = creatorsData || [];
      const ids = new Set<string>();
      for (const c of creators) {
        const cid = String(c.campaign_id);
        const posted = c.post_status === "posted";
        const unpaid = c.payment_status === "unpaid" || c.payment_status === "pending";
        const expected = c.expected_post_date ? new Date(c.expected_post_date) : null;
        const overdue = expected && !isNaN(expected.getTime()) && expected < now && c.post_status !== "posted";
        if ((posted && unpaid) || overdue) ids.add(cid);
      }
      for (const camp of campaigns) {
        const cid = String(camp.id);
        const hasPlacements = creators.some((c: any) => String(c.campaign_id) === cid);
        const noTracker = !camp.tracker || String(camp.tracker).trim() === "";
        if (hasPlacements && noTracker) ids.add(cid);
      }
      return Array.from(ids);
    },
    enabled: filterParam === "attention",
  });

  // Open campaign panel when ?open=<id> is present
  useEffect(() => {
    if (!openParam || !campaigns.length) return;
    const campaign = campaigns.find((c: any) => String(c.id) === openParam);
    if (campaign) {
      setSelectedCampaign(campaign);
      setEditForm({
        ...campaign,
        report_notes: formatReportNotes(campaign.report_notes),
      });
      setIsEditMode(false);
      setIsDetailsOpen(true);
    }
  }, [openParam, campaigns]);

  const handleViewDetails = (campaign: any) => {
    setSelectedCampaign(campaign);
    setEditForm({
      ...campaign,
      report_notes: formatReportNotes(campaign.report_notes),
    });
    setIsEditMode(false);
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditForm({
      ...selectedCampaign,
      report_notes: formatReportNotes(selectedCampaign?.report_notes),
    });
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
      notifySlack("instagram", "campaign_status_change", {
        campaignId: String(selectedCampaign?.id || ''),
        campaignName: selectedCampaign?.campaign_name || '',
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

  const handleQuickCreate = async () => {
    if (!quickCreateForm.campaign.trim()) {
      toast({ title: "Error", description: "Campaign name is required", variant: "destructive" });
      return;
    }
    setQuickCreating(true);
    try {
      const { error } = await supabase
        .from('instagram_campaigns')
        .insert({
          campaign: quickCreateForm.campaign.trim(),
          clients: quickCreateForm.clients.trim() || null,
          price: quickCreateForm.price.trim() || '$0',
          status: quickCreateForm.status,
        });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['instagram-campaigns'] });
      setIsQuickCreateOpen(false);
      setQuickCreateForm({ campaign: '', clients: '', price: '', status: 'pending' });
      toast({ title: "Campaign Created", description: `"${quickCreateForm.campaign}" has been created` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" });
    } finally {
      setQuickCreating(false);
    }
  };

  const resetAddCreatorDialog = () => {
    setIsAddCreatorOpen(false);
    setAddCreatorTab('existing');
    setCreatorSearchTerm('');
    setSelectedExistingCreator(null);
    setPlacementRate('');
    setPlacementPostType('reel');
    setNewCreatorForm({ handle: '', email: '', reel_rate: '', genres: [], content_types: [] });
  };

  const handleAddExistingCreatorToCampaign = async () => {
    if (!selectedExistingCreator || !selectedCampaign?.id) return;
    setAddingCreator(true);
    try {
      const { error } = await supabase
        .from('instagram_campaign_creators')
        .insert({
          campaign_id: String(selectedCampaign.id),
          instagram_handle: selectedExistingCreator.instagram_handle,
          rate: parseFloat(placementRate) || selectedExistingCreator.reel_rate || 0,
          post_type: placementPostType || 'reel',
          posts_count: 1,
          page_status: 'proposed',
          payment_status: 'unpaid',
          post_status: 'not_posted',
          is_auto_selected: false,
        });
      if (error) throw error;
      refetchCreators();
      resetAddCreatorDialog();
      toast({ title: "Creator Added", description: `@${selectedExistingCreator.instagram_handle} added to campaign` });
    } catch (error: any) {
      const msg = error?.message?.includes('unique') ? 'This creator is already in this campaign' : 'Failed to add creator to campaign';
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setAddingCreator(false);
    }
  };

  const handleAddNewCreatorToCampaign = async () => {
    const handle = newCreatorForm.handle.replace(/^@/, '').trim();
    if (!handle) {
      toast({ title: "Error", description: "Instagram handle is required", variant: "destructive" });
      return;
    }
    if (!selectedCampaign?.id) {
      toast({ title: "Error", description: "No campaign selected", variant: "destructive" });
      return;
    }
    const rateNum = Number(newCreatorForm.reel_rate) || 0;
    setAddingCreator(true);
    try {
      const { error: creatorError } = await supabase.from('creators').insert({
        instagram_handle: handle,
        email: newCreatorForm.email || null,
        reel_rate: rateNum,
        music_genres: newCreatorForm.genres.length > 0 ? newCreatorForm.genres : ['General'],
        content_types: newCreatorForm.content_types.length > 0 ? newCreatorForm.content_types : ['Audio Seeding'],
        base_country: '',
        followers: 0,
        median_views_per_video: 0,
        engagement_rate: 0,
        scrape_status: 'pending',
        org_id: user?.tenantId || '00000000-0000-0000-0000-000000000001',
      });
      if (creatorError && !creatorError.message?.includes('duplicate') && creatorError.code !== '23505') {
        throw creatorError;
      }

      const { error: placementError } = await supabase
        .from('instagram_campaign_creators')
        .insert({
          campaign_id: String(selectedCampaign.id),
          instagram_handle: handle,
          rate: rateNum,
          post_type: placementPostType || 'reel',
          posts_count: 1,
          page_status: 'proposed',
          payment_status: 'unpaid',
          post_status: 'not_posted',
          is_auto_selected: false,
        });
      if (placementError) throw placementError;

      refetchCreators();
      queryClient.invalidateQueries({ queryKey: ['all-creators-for-linking'] });
      resetAddCreatorDialog();
      toast({ title: "Creator Created & Added", description: `@${handle} created and added to campaign` });

      fetch('/api/instagram-scraper/creator-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handles: [handle] }),
      }).catch(() => {});
    } catch (error: any) {
      const msg = error?.message?.includes('unique') || error?.message?.includes('duplicate')
        ? 'A creator with this handle already exists. Use "From Database" tab instead.'
        : error?.message || 'Failed to create creator';
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setAddingCreator(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setEditForm((prev: any) => ({
      ...prev,
      [field]: value
    }));
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

  // Filter campaigns based on search, status, and optional attention filter
  const filteredCampaigns = campaigns
    .filter((campaign: any) => {
    const matchesSearch = 
      campaign.campaign?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.clients?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.salespeople?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || normalizeStatus(campaign.status) === statusFilter.toLowerCase();
    
    const matchesAttention = filterParam !== "attention" || attentionCampaignIds.includes(String(campaign.id));
    
    return matchesSearch && matchesStatus && matchesAttention;
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
          <Button variant="outline" onClick={() => setIsQuickCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Quick Create
          </Button>
          <Link href="/instagram/campaign-builder">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Campaign Builder
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
            <div className="flex items-center gap-2 justify-center">
              <Button variant="outline" onClick={() => setIsQuickCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Quick Create
              </Button>
              <Link href="/instagram/campaign-builder">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Campaign Builder
                </Button>
              </Link>
            </div>
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
                {filterParam === "attention" && "Needs attention • "}
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
                      <TableCell className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={normalizeStatus(campaign.status)}
                          onValueChange={async (value) => {
                            try {
                              await updateCampaignAsync({ id: campaign.id, updates: { status: value } });
                              toast({ title: "Status Updated", description: `Campaign status changed to ${formatStatusLabel(value)}` });
                            } catch {
                              toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 w-24 border-0 p-0 focus:ring-0">
                            <Badge className={getStatusColor(campaign.status || 'pending')} variant="outline">
                              <span className="text-[10px]">{formatStatusLabel(campaign.status || 'pending')}</span>
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                          </SelectContent>
                        </Select>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/share/instagram/${selectedCampaign?.public_token || selectedCampaign?.id}`;
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

          {selectedCampaign && (() => {
            const budgetNum = parseFloat(selectedCampaign.price?.replace(/[^0-9.]/g, '') || '0');
            const isPaid = (c: CampaignCreator) => c.page_status === 'paid' || c.page_status === 'posted' || c.payment_status === 'paid';
            const isPosted = (c: CampaignCreator) => c.page_status === 'posted' || c.post_status === 'posted';
            const totalPaid = campaignCreators
              .filter((c: CampaignCreator) => isPaid(c))
              .reduce((s: number, c: CampaignCreator) => s + ((c.rate || 0) * (c.posts_count || 1)), 0);
            const totalCommitted = campaignCreators
              .reduce((s: number, c: CampaignCreator) => s + ((c.rate || 0) * (c.posts_count || 1)), 0);
            const totalOwed = campaignCreators
              .filter((c: CampaignCreator) => !isPaid(c) && isPosted(c))
              .reduce((s: number, c: CampaignCreator) => s + ((c.rate || 0) * (c.posts_count || 1)), 0);
            const autoSpend = totalPaid;
            const autoRemaining = Math.max(0, budgetNum - totalCommitted);
            const totalPostsAgreed = campaignCreators.reduce((s: number, c: CampaignCreator) => s + (c.posts_count || 1), 0);
            const postsPosted = campaignCreators.filter((c: CampaignCreator) => isPosted(c)).length;
            const postsPending = campaignCreators.filter((c: CampaignCreator) => !isPosted(c)).length;
            const totalViews = campaignPosts.reduce((s: number, p: any) => s + (p.tracked_views || 0), 0);
            const campaignCp1k = totalViews > 0 && autoSpend > 0 ? (autoSpend / (totalViews / 1000)) : 0;
            const budgetUtil = budgetNum > 0 ? Math.round((totalCommitted / budgetNum) * 1000) / 10 : 0;

            return (
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

              {/* Financial Details (Auto-Calculated) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Price (Budget)</p>
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
                    <p className="text-xl font-bold">${autoSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p className="text-xs text-muted-foreground">Auto-calculated from paid placements</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                    <p className="text-xl font-bold">${autoRemaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Posts Agreed</div><div className="text-2xl font-bold">{totalPostsAgreed}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Posts Posted</div><div className="text-2xl font-bold text-green-600">{postsPosted}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Posts Pending</div><div className="text-2xl font-bold text-yellow-600">{postsPending}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Views</div><div className="text-2xl font-bold">{totalViews > 0 ? totalViews.toLocaleString() : '—'}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Campaign CP1K</div><div className="text-2xl font-bold">{campaignCp1k > 0 ? `$${campaignCp1k.toFixed(2)}` : '—'}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Paid</div><div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Owed</div><div className="text-2xl font-bold text-orange-600">${totalOwed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Budget Utilization</div><div className="text-2xl font-bold">{budgetUtil}%</div></CardContent></Card>
              </div>

              {/* Client Instagram & IG Sound */}
              <Card className="border-pink-500/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    Campaign Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Client Instagram</Label>
                    {isEditMode ? (
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                        <Input
                          className="pl-8"
                          value={(editForm.client_instagram_handle || '').replace(/^@/, '')}
                          onChange={(e) => updateField('client_instagram_handle', e.target.value.replace(/^@/, ''))}
                          placeholder="client_handle"
                        />
                      </div>
                    ) : selectedCampaign.client_instagram_handle ? (
                      <a
                        href={`https://instagram.com/${selectedCampaign.client_instagram_handle.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 mt-1 text-sm text-pink-600 hover:underline"
                      >
                        <Instagram className="h-4 w-4" />
                        @{selectedCampaign.client_instagram_handle.replace(/^@/, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Not set</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Music className="h-4 w-4 text-pink-500" />
                      IG Sound
                    </Label>
                    <p className="text-xs text-muted-foreground mb-1">Instagram audio/sound URL for pages to use</p>
                    {isEditMode ? (
                      <Input
                        className="mt-1"
                        value={editForm.ig_sound_url || ''}
                        onChange={(e) => updateField('ig_sound_url', e.target.value)}
                        placeholder="https://www.instagram.com/reels/audio/..."
                      />
                    ) : selectedCampaign.ig_sound_url ? (
                      <a
                        href={selectedCampaign.ig_sound_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 mt-1 text-sm text-blue-600 hover:underline break-all"
                      >
                        <Music className="h-4 w-4 flex-shrink-0" />
                        {selectedCampaign.ig_sound_url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Not set</p>
                    )}
                    {isEditMode && editForm.ig_sound_url && !editForm.ig_sound_url.includes('instagram.com') && (
                      <p className="text-xs text-orange-500 mt-1">This doesn't look like an Instagram URL. Pages need an IG sound link.</p>
                    )}
                  </div>
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

              {/* Placements (Agreed Inventory) */}
              <Card className="border-purple-500/20">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      Placements (Agreed Inventory)
                    </CardTitle>
                    <CardDescription>
                      Agreements and statuses for campaign creators
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setIsAddCreatorOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Creator
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingCreators ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading placements...
                    </div>
                  ) : campaignCreators.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No placements assigned to this campaign yet.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsAddCreatorOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Creator
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedCreators.length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                          <span className="text-sm font-medium">{selectedCreators.length} selected</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white border-green-600"
                              onClick={() => bulkUpdateCreators(selectedCreators, { payment_status: 'paid' as PaymentStatus, page_status: 'paid' as PageStatus })}
                            >
                              Mark Paid
                            </Button>
                            <Select onValueChange={(value) => {
                              const updates: Partial<CampaignCreator> = {};
                              if (value === 'posted') { updates.post_status = 'posted' as PostStatus; updates.page_status = 'posted' as PageStatus; }
                              if (value === 'proposed') { updates.post_status = 'not_posted' as PostStatus; updates.page_status = 'proposed' as PageStatus; updates.payment_status = 'unpaid' as PaymentStatus; }
                              bulkUpdateCreators(selectedCreators, updates);
                            }}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue placeholder="Set status..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="proposed"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-500" /><span className="text-xs">Proposed</span></div></SelectItem>
                                <SelectItem value="posted"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-xs">Posted</span></div></SelectItem>
                              </SelectContent>
                            </Select>
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

                      <ScrollArea className="h-64">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={selectedCreators.length === campaignCreators.length && campaignCreators.length > 0}
                                  onCheckedChange={(checked) => {
                                    setSelectedCreators(checked ? campaignCreators.map((c: CampaignCreator) => c.id) : []);
                                  }}
                                />
                              </TableHead>
                              <TableHead>Creator</TableHead>
                              <TableHead>Post Type</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead className="text-center">Paid</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {campaignCreators.map((creator: CampaignCreator) => {
                              const creatorIsPaid = creator.page_status === 'paid' || creator.page_status === 'posted' || creator.payment_status === 'paid';
                              return (
                              <TableRow key={creator.id}>
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
                                  <span className="font-medium text-sm">@{creator.instagram_handle}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{creator.post_type || 'Reel'}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  ${creator.rate?.toLocaleString() || 0}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    variant={creatorIsPaid ? "default" : "outline"}
                                    className={`h-7 px-3 text-xs font-semibold ${creatorIsPaid ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-muted-foreground hover:bg-green-50 hover:text-green-700 hover:border-green-300'}`}
                                    onClick={() => {
                                      const newPaid = !creatorIsPaid;
                                      updateCreatorStatus(creator.id, {
                                        payment_status: (newPaid ? 'paid' : 'unpaid') as PaymentStatus,
                                        page_status: newPaid
                                          ? (creator.page_status === 'posted' ? 'posted' : 'paid') as PageStatus
                                          : 'proposed' as PageStatus,
                                      });
                                    }}
                                  >
                                    {creatorIsPaid ? '✓ PAID' : 'UNPAID'}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={(creator.page_status === 'posted' || creator.post_status === 'posted') ? 'posted' : 'proposed'}
                                    onValueChange={(value) => {
                                      const updates: Partial<CampaignCreator> = { post_status: value === 'posted' ? 'posted' as PostStatus : 'not_posted' as PostStatus };
                                      if (value === 'posted') {
                                        updates.page_status = 'posted' as PageStatus;
                                      } else {
                                        updates.page_status = creatorIsPaid ? 'paid' as PageStatus : 'proposed' as PageStatus;
                                      }
                                      updateCreatorStatus(creator.id, updates);
                                    }}
                                  >
                                    <SelectTrigger className="w-28 h-8">
                                      <PageStatusIndicator status={(creator.page_status === 'posted' || creator.post_status === 'posted') ? 'posted' : 'proposed'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="proposed"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-500" /><span className="text-xs">Proposed</span></div></SelectItem>
                                      <SelectItem value="posted"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-xs">Posted</span></div></SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Campaign Posts (Live Tracking) */}
              <Card className="border-pink-500/20">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Instagram className="h-5 w-5 text-pink-500" />
                      Campaign Posts (Live Tracking)
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Track actual live Instagram posts tied to placements
                    </CardDescription>
                    {(() => {
                      const lastScraped = selectedCampaign?.last_scraped_at;
                      const SCRAPE_HOURS_UTC = [6, 14, 22];
                      const now = new Date();
                      const nextScrape = (() => {
                        for (const h of SCRAPE_HOURS_UTC) {
                          const t = new Date(now);
                          t.setUTCHours(h, 0, 0, 0);
                          if (t > now) return t;
                        }
                        const t = new Date(now);
                        t.setUTCDate(t.getUTCDate() + 1);
                        t.setUTCHours(SCRAPE_HOURS_UTC[0], 0, 0, 0);
                        return t;
                      })();
                      const diffMs = nextScrape.getTime() - now.getTime();
                      const diffH = Math.floor(diffMs / 3600000);
                      const diffM = Math.floor((diffMs % 3600000) / 60000);
                      const nextLabel = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;
                      const lastLabel = lastScraped
                        ? (() => {
                            const ago = now.getTime() - new Date(lastScraped).getTime();
                            const agoH = Math.floor(ago / 3600000);
                            const agoM = Math.floor((ago % 3600000) / 60000);
                            if (agoH > 24) return `${Math.floor(agoH / 24)}d ago`;
                            if (agoH > 0) return `${agoH}h ${agoM}m ago`;
                            return `${agoM}m ago`;
                          })()
                        : null;
                      return (
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          {lastLabel && (
                            <span className="flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-green-500 inline-block" />
                              Last scraped {lastLabel}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            Next in {nextLabel}
                          </span>
                          <span className="text-muted-foreground/60">3x daily · 6am 2pm 10pm UTC</span>
                        </div>
                      );
                    })()}
                  </div>
                  {campaignPosts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={refreshingTracking}
                      onClick={async () => {
                        setRefreshingTracking(true);
                        try {
                          const res = await fetch('/api/instagram-scraper/track-campaign-posts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ campaignId: String(selectedCampaign?.id) }),
                          });
                          const json = await res.json();
                          refetchPosts();
                          toast({
                            title: 'Tracking Refreshed',
                            description: json.message || 'Post metrics updated',
                          });
                        } catch {
                          toast({ title: 'Error', description: 'Failed to refresh tracking', variant: 'destructive' });
                        } finally {
                          setRefreshingTracking(false);
                        }
                      }}
                    >
                      {refreshingTracking ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <TrendingUp className="h-4 w-4 mr-1" />}
                      Refresh Tracking
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste Instagram post URL (e.g., https://instagram.com/reel/...)"
                        value={newPostUrl}
                        onChange={(e) => setNewPostUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addPostUrl()}
                        className="flex-1"
                      />
                      <Button onClick={addPostUrl} disabled={addingPost || !newPostUrl.trim()}>
                        {addingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Linked Creator:</Label>
                      <Select
                        value={selectedCreatorForPost || "__none__"}
                        onValueChange={(v) => {
                          setSelectedCreatorForPost(v === "__none__" ? "" : v);
                          if (v !== "__none__") setManualPostHandle("");
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select creator (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None (type handle below)</SelectItem>
                          {campaignCreators.length > 0 && (
                            <>
                              {campaignCreators.map((creator: CampaignCreator) => (
                                <SelectItem key={creator.id} value={creator.id}>
                                  @{creator.instagram_handle} (placement)
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {allCreators
                            .filter(c => !campaignCreators.some((cc: CampaignCreator) => cc.instagram_handle === c.instagram_handle))
                            .map(creator => (
                              <SelectItem key={creator.id} value={creator.id}>
                                @{creator.instagram_handle}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!selectedCreatorForPost && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Or type handle:</Label>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                          <Input
                            className="h-8 text-sm pl-7"
                            value={manualPostHandle}
                            onChange={(e) => setManualPostHandle(e.target.value.replace(/^@/, ''))}
                            placeholder="creator_handle"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {loadingPosts ? (
                    <div className="text-center py-4 text-muted-foreground">Loading posts...</div>
                  ) : campaignPosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Instagram className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No post URLs added yet.</p>
                      <p className="text-sm mt-1">Add Instagram post URLs to track campaign performance.</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-56">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Post URL</TableHead>
                            <TableHead>Creator</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaignPosts.map((post: any) => (
                            <TableRow key={post.id}>
                              <TableCell>
                                <a
                                  href={post.post_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline truncate max-w-[200px] block"
                                >
                                  {post.post_url.replace('https://www.instagram.com', '').replace('https://instagram.com', '')}
                                </a>
                              </TableCell>
                              <TableCell>
                                {post.instagram_handle && post.instagram_handle !== 'pending' ? (
                                  <span className="text-sm font-medium">@{post.instagram_handle}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Unlinked</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {post.tracked_views > 0 ? post.tracked_views.toLocaleString() : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {post.created_at ? new Date(post.created_at).toLocaleDateString() : '—'}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const ts = post.tracking_status || 'pending';
                                  if (ts === 'active') return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Active</Badge>;
                                  if (ts === 'failed') return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
                                  return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
                                })()}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => deletePost(post.id)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
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

              {/* Note to Client */}
              <Card className="border-blue-500/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Share className="h-5 w-5 text-blue-500" />
                    Note to Client
                  </CardTitle>
                  <CardDescription>Visible to the client — brief plan, posting window, what to expect</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={isEditMode ? (editForm.client_notes || '') : (selectedCampaign.client_notes || '')}
                    onChange={(e) => updateField('client_notes', e.target.value)}
                    onBlur={async () => {
                      if (!isEditMode && selectedCampaign.client_notes !== editForm.client_notes) {
                        const newVal = editForm.client_notes || '';
                        await updateCampaignAsync({ id: selectedCampaign.id, updates: { client_notes: newVal } });
                        await addNoteHistory('client', newVal);
                        toast({ title: "Saved", description: "Client note updated" });
                      }
                    }}
                    placeholder="Write a note for the client..."
                    rows={3}
                    readOnly={!isEditMode && !selectedCampaign.client_notes && false}
                  />
                </CardContent>
              </Card>

              {/* Internal Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Ops Notes:</p>
                    {isEditMode ? (
                      <Textarea
                        value={editForm.report_notes || ''}
                        onChange={(e) => updateField('report_notes', e.target.value)}
                        placeholder="Internal notes, page selection, payment details..."
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{formatReportNotes(selectedCampaign.report_notes)}</p>
                    )}
                  </div>

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
            </div>
            );
          })()}
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

      {/* Quick Create Campaign Modal */}
      <Dialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Create Campaign</DialogTitle>
            <DialogDescription>Create a campaign without the builder. Add creators afterwards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                value={quickCreateForm.campaign}
                onChange={(e) => setQuickCreateForm(p => ({ ...p, campaign: e.target.value }))}
                placeholder="Campaign name"
              />
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Input
                value={quickCreateForm.clients}
                onChange={(e) => setQuickCreateForm(p => ({ ...p, clients: e.target.value }))}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <Input
                value={quickCreateForm.price}
                onChange={(e) => setQuickCreateForm(p => ({ ...p, price: e.target.value }))}
                placeholder="$5,000"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={quickCreateForm.status} onValueChange={(v) => setQuickCreateForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsQuickCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleQuickCreate} disabled={quickCreating || !quickCreateForm.campaign.trim()}>
                {quickCreating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Creator to Campaign Dialog */}
      <Dialog open={isAddCreatorOpen} onOpenChange={(open) => { if (!open) resetAddCreatorDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Creator to Campaign</DialogTitle>
            <DialogDescription>Select an existing creator from your database or add a new one.</DialogDescription>
          </DialogHeader>
          <Tabs value={addCreatorTab} onValueChange={(v) => setAddCreatorTab(v as 'existing' | 'new')}>
            <TabsList className="w-full">
              <TabsTrigger value="existing" className="flex-1">From Database</TabsTrigger>
              <TabsTrigger value="new" className="flex-1">New Creator</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Search by handle..."
                  value={creatorSearchTerm}
                  onChange={(e) => setCreatorSearchTerm(e.target.value)}
                />
              </div>
              <ScrollArea className="h-48 border rounded-md">
                {(() => {
                  const assignedHandles = new Set(campaignCreators.map((c: CampaignCreator) => c.instagram_handle?.toLowerCase()));
                  const filtered = allCreators.filter((c: any) =>
                    !assignedHandles.has(c.instagram_handle?.toLowerCase()) &&
                    c.instagram_handle?.toLowerCase().includes(creatorSearchTerm.toLowerCase())
                  );
                  if (filtered.length === 0) return (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      {creatorSearchTerm ? 'No matching creators found.' : 'No creators available.'}
                    </div>
                  );
                  return filtered.map((creator: any) => (
                    <div
                      key={creator.id}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${selectedExistingCreator?.id === creator.id ? 'bg-purple-500/10' : ''}`}
                      onClick={() => {
                        setSelectedExistingCreator(creator);
                        setPlacementRate(String(creator.reel_rate || ''));
                      }}
                    >
                      <div>
                        <span className="font-medium text-sm">@{creator.instagram_handle}</span>
                        {creator.music_genres?.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">{creator.music_genres.slice(0, 2).join(', ')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {creator.followers > 0 && <span>{creator.followers >= 1000 ? `${(creator.followers / 1000).toFixed(1)}K` : creator.followers} followers</span>}
                        {creator.reel_rate > 0 && <span>${creator.reel_rate}</span>}
                        {selectedExistingCreator?.id === creator.id && <Check className="h-4 w-4 text-purple-500" />}
                      </div>
                    </div>
                  ));
                })()}
              </ScrollArea>
              {selectedExistingCreator && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs">Agreed Rate ($)</Label>
                    <Input
                      className="h-8 text-sm mt-1"
                      type="number"
                      value={placementRate}
                      onChange={(e) => setPlacementRate(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Post Type</Label>
                    <Select value={placementPostType} onValueChange={setPlacementPostType}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reel">Reel</SelectItem>
                        <SelectItem value="carousel">Carousel</SelectItem>
                        <SelectItem value="story">Story</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleAddExistingCreatorToCampaign}
                  disabled={addingCreator || !selectedExistingCreator}
                >
                  {addingCreator ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add to Campaign
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-3 mt-3">
              <div>
                <Label className="text-xs">Instagram Handle *</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    className="pl-7 h-8 text-sm"
                    value={newCreatorForm.handle}
                    onChange={(e) => setNewCreatorForm(p => ({ ...p, handle: e.target.value.replace(/^@/, '') }))}
                    placeholder="handle"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  className="h-8 text-sm mt-1"
                  value={newCreatorForm.email}
                  onChange={(e) => setNewCreatorForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Rate per Reel ($)</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    type="number"
                    value={newCreatorForm.reel_rate}
                    onChange={(e) => setNewCreatorForm(p => ({ ...p, reel_rate: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Post Type</Label>
                  <Select value={placementPostType} onValueChange={setPlacementPostType}>
                    <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reel">Reel</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Genres {newCreatorForm.genres.length > 0 && <span className="text-muted-foreground">({newCreatorForm.genres.length} selected)</span>}</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['EDM', 'Techno', 'House', 'Tech House', 'Bass Music', 'Hip Hop', 'Trap', 'Pop', 'R&B', 'Afro', 'Latin', 'Rock', 'Indie', 'Dancehall', 'Country', 'K-Pop'].map((g) => (
                    <Badge
                      key={g}
                      variant={newCreatorForm.genres.includes(g) ? "default" : "outline"}
                      className="cursor-pointer text-xs py-1 px-2.5"
                      onClick={() => setNewCreatorForm(f => ({
                        ...f,
                        genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g]
                      }))}
                    >
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Content Types</Label>
                <div className="flex gap-2 mt-1">
                  {CREATOR_CONTENT_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={newCreatorForm.content_types.includes(t)}
                        onCheckedChange={(v) => setNewCreatorForm(f => ({
                          ...f,
                          content_types: v ? [...f.content_types, t] : f.content_types.filter(x => x !== t)
                        }))}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleAddNewCreatorToCampaign}
                  disabled={addingCreator || !newCreatorForm.handle.trim()}
                >
                  {addingCreator ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Create & Add to Campaign
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}


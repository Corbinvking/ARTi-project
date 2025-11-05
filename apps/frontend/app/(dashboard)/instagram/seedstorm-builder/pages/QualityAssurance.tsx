import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Clock, AlertCircle, FileCheck, DollarSign, Upload, BarChart3, Filter, ArrowUpDown, ArrowUp, ArrowDown, Edit2, Save, X, StickyNote, Calendar, TrendingDown } from "lucide-react";
import { GlobalSearch } from "../components/GlobalSearch";
import { KeyboardShortcutsHelp } from "../components/KeyboardShortcutsHelp";
import { useGlobalShortcuts } from "../hooks/useKeyboardShortcuts";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { StatusIndicator } from "../components/StatusIndicator";
import { PaymentFilters } from "../components/PaymentFilters";
import { PostStatusFilters } from "../components/PostStatusFilters";
import { PaymentNotesModal } from "../components/PaymentNotesModal";

import { BulkActionsBar } from "../components/BulkActionsBar";
import { useCampaignCreators, CampaignCreator } from "../hooks/useCampaignCreators";
import { usePaymentTracking, PaymentTrackingCreator } from "../hooks/usePaymentTracking";
import { usePostStatusTracking, PostStatusTrackingCreator } from "../hooks/usePostStatusTracking";
import { supabase } from "../integrations/supabase/client";
import { Campaign } from "../lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "../hooks/use-toast";

// Local interface for campaigns loaded from database
interface QACampaign {
  id: string;
  name: string;
  status: string;
  campaign_type: string;
  campaign_name?: string; // For compatibility
  totals?: {
    average_cpv?: number;
    total_cost?: number;
    total_creators?: number;
    total_median_views?: number;
    budget_remaining?: number;
  };
  budget?: number;
}

interface UnderperformedCampaign extends QACampaign {
  actual_cpv: number;
  performance_deficit: number;
  total_views: number;
}

type SortField = 'creator' | 'campaign' | 'rate' | 'payment_status' | 'post_status' | 'approval_status';
type SortDirection = 'asc' | 'desc' | null;

const QualityAssurance = () => {
  const [activeTab, setActiveTab] = useState('pending-approval');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<QACampaign[]>([]);
  const [allCreators, setAllCreators] = useState<CampaignCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('creator');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingStatus, setEditingStatus] = useState<{creatorId: string, field: string} | null>(null);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [notesModalCreator, setNotesModalCreator] = useState<PaymentTrackingCreator | null>(null);
  const [postStatusModalCreator, setPostStatusModalCreator] = useState<PostStatusTrackingCreator | null>(null);
  const [postCompletionStats, setPostCompletionStats] = useState<any>(null);
  const [underperformedCampaigns, setUnderperformedCampaigns] = useState<UnderperformedCampaign[]>([]);
  
  // Enhanced Payment Tracking Hook
  const paymentTracking = usePaymentTracking();
  
  // Enhanced Post Status Tracking Hook
  const postStatusTracking = usePostStatusTracking();

  // Global keyboard shortcuts - QA is accessible via Ctrl+5
  useGlobalShortcuts(
    () => setIsSearchOpen(true),
    undefined,
    undefined,
    () => setIsHelpOpen(true)
  );

  useEffect(() => {
    loadCampaignsAndCreators();
    loadUnderperformedCampaigns();
  }, []);

  useEffect(() => {
    // Load post completion stats when post status tracking loads
    if (!postStatusTracking.loading) {
      postStatusTracking.getCompletionStats().then(setPostCompletionStats);
    }
  }, [postStatusTracking.loading]);

  const loadCampaignsAndCreators = async () => {
    setLoading(true);
    try {
      // Load Instagram campaigns from Supabase that have associated creators
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id, name, status, campaign_type, totals, budget,
          campaign_creators!inner(id)
        `)
        .eq('campaign_type', 'instagram')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      
      // Transform the data to match the expected QACampaign interface
      const transformedCampaigns: QACampaign[] = (campaignsData || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        campaign_type: campaign.campaign_type,
        campaign_name: campaign.name, // Add compatibility field
        totals: campaign.totals as any || {},
        budget: campaign.budget || 0
      }));
      
      setCampaigns(transformedCampaigns);

      // Load all campaign creators from Supabase
      const { data: creators, error } = await supabase
        .from('campaign_creators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAllCreators((creators || []).map(creator => ({
        ...creator,
        payment_status: creator.payment_status as CampaignCreator['payment_status'],
        post_status: creator.post_status as CampaignCreator['post_status'],
        approval_status: creator.approval_status as CampaignCreator['approval_status']
      })));
    } catch (error) {
      console.error('Error loading QA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnderperformedCampaigns = async () => {
    try {
      // Load completed campaigns with cost data
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('id, name, status, campaign_type, totals, budget')
        .eq('status', 'Completed')
        .eq('campaign_type', 'instagram')
        .not('totals', 'is', null);

      if (error) throw error;

      // Filter campaigns with average_cpv > 1.0 ($1 per 1k views)
      const underperformed: UnderperformedCampaign[] = (campaignsData || [])
        .filter(campaign => {
          const totals = campaign.totals as any;
          return totals && totals.average_cpv && totals.average_cpv > 1.0;
        })
        .map(campaign => {
          const totals = campaign.totals as any;
          const actual_cpv = totals.average_cpv || 0;
          const performance_deficit = actual_cpv - 1.0;
          const total_views = totals.total_median_views || 0;
          
          return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            campaign_type: campaign.campaign_type,
            campaign_name: campaign.name,
            totals,
            budget: campaign.budget || 0,
            actual_cpv,
            performance_deficit,
            total_views
          };
        })
        // Sort by worst performance first
        .sort((a, b) => b.actual_cpv - a.actual_cpv);

      setUnderperformedCampaigns(underperformed);
    } catch (error) {
      console.error('Error loading underperformed campaigns:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => 
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      );
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortCreators = (creators: CampaignCreator[]) => {
    if (!sortDirection || !sortField) return creators;

    return [...creators].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'creator':
          aValue = a.instagram_handle.toLowerCase();
          bValue = b.instagram_handle.toLowerCase();
          break;
        case 'campaign':
          const aCampaign = campaigns.find(c => c.id === a.campaign_id);
          const bCampaign = campaigns.find(c => c.id === b.campaign_id);
          aValue = (aCampaign?.name || aCampaign?.campaign_name || '').toLowerCase();
          bValue = (bCampaign?.name || bCampaign?.campaign_name || '').toLowerCase();
          break;
        case 'rate':
          aValue = a.rate || 0;
          bValue = b.rate || 0;
          break;
        case 'payment_status':
          aValue = a.payment_status;
          bValue = b.payment_status;
          break;
        case 'post_status':
          aValue = a.post_status;
          bValue = b.post_status;
          break;
        case 'approval_status':
          aValue = a.approval_status;
          bValue = b.approval_status;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  };

  const updateCreatorStatus = async (
    creatorId: string,
    field: 'payment_status' | 'post_status' | 'approval_status',
    value: string
  ) => {
    try {
      const updates = { [field]: value };
      
      const { error } = await supabase
        .from('campaign_creators')
        .update(updates)
        .eq('id', creatorId);

      if (error) throw error;

      // Update local state
      setAllCreators(prev => prev.map(creator => 
        creator.id === creatorId 
          ? { ...creator, [field]: value }
          : creator
      ));

      toast({
        title: "Status Updated",
        description: "Creator status updated successfully",
      });
    } catch (error) {
      console.error('Error updating creator status:', error);
      toast({
        title: "Error",
        description: "Failed to update creator status",
        variant: "destructive",
      });
    }
  };

  const SortableTableHead = ({ field, children, className = "" }: { 
    field: SortField; 
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortField === field;
    const direction = isActive ? sortDirection : null;
    
    return (
      <TableHead 
        className={`cursor-pointer select-none hover:bg-muted/50 ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          {children}
          {isActive && direction === 'asc' && <ArrowUp className="h-4 w-4" />}
          {isActive && direction === 'desc' && <ArrowDown className="h-4 w-4" />}
          {(!isActive || direction === null) && <ArrowUpDown className="h-4 w-4 opacity-50" />}
        </div>
      </TableHead>
    );
  };

  const EditableStatusCell = ({ 
    creator, 
    field, 
    type 
  }: { 
    creator: CampaignCreator; 
    field: 'payment_status' | 'post_status' | 'approval_status';
    type: 'payment' | 'post' | 'approval';
  }) => {
    const currentValue = creator[field];

    const getOptions = () => {
      switch (type) {
        case 'payment':
          return [
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' }
          ];
        case 'post':
          return [
            { value: 'not_posted', label: 'Not Posted' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'posted', label: 'Posted' }
          ];
        case 'approval':
          return [
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'revision_requested', label: 'Revision Requested' },
            { value: 'rejected', label: 'Rejected' }
          ];
      }
    };

    const handleValueChange = (value: string) => {
      updateCreatorStatus(creator.id, field, value);
    };

    return (
      <Select 
        value={currentValue} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-32">
          <SelectValue>
            <StatusIndicator type={type} status={currentValue} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-50 bg-background border shadow-lg">
          {getOptions().map(option => (
            <SelectItem key={option.value} value={option.value}>
              <StatusIndicator type={type} status={option.value} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const getFilteredCreators = () => {
    let filtered = allCreators;

    if (campaignFilter === 'active') {
      const activeCampaignIds = campaigns
        .filter(c => c.status === 'Active')
        .map(c => c.id);
      filtered = filtered.filter(creator => 
        activeCampaignIds.includes(creator.campaign_id)
      );
    } else if (campaignFilter === 'completed') {
      const completedCampaignIds = campaigns
        .filter(c => c.status === 'Completed')
        .map(c => c.id);
      filtered = filtered.filter(creator => 
        completedCampaignIds.includes(creator.campaign_id)
      );
    }

    return filtered;
  };

  const getPendingApprovalCreators = () => {
    return getFilteredCreators().filter(creator => 
      creator.approval_status === 'pending' || 
      creator.approval_status === 'revision_requested'
    );
  };

  const getPaymentTrackingCreators = () => {
    return getFilteredCreators().filter(creator => 
      creator.payment_status === 'unpaid' || 
      creator.payment_status === 'pending'
    );
  };

  const getPostStatusCreators = () => {
    return getFilteredCreators().filter(creator => 
      creator.post_status === 'not_posted' || 
      creator.post_status === 'scheduled'
    );
  };

  const getOverviewStats = () => {
    const filtered = getFilteredCreators();
    const totalCreators = filtered.length;
    
    return {
      totalCreators,
      pendingApproval: filtered.filter(c => c.approval_status === 'pending').length,
      pendingPayment: filtered.filter(c => c.payment_status === 'unpaid').length,
      notPosted: filtered.filter(c => c.post_status === 'not_posted').length,
      completionRate: totalCreators > 0 ? 
        Math.round((filtered.filter(c => 
          c.approval_status === 'approved' && 
          c.payment_status === 'paid' && 
          c.post_status === 'posted'
        ).length / totalCreators) * 100) : 0
    };
  };

  const CreatorTable = ({ creators, showAllColumns = true }: { creators: CampaignCreator[], showAllColumns?: boolean }) => {
    const sortedCreators = sortCreators(creators);
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead field="creator">Creator</SortableTableHead>
            <SortableTableHead field="campaign">Campaign</SortableTableHead>
            <SortableTableHead field="rate">Rate</SortableTableHead>
            {showAllColumns && <SortableTableHead field="payment_status">Payment</SortableTableHead>}
            {showAllColumns && <SortableTableHead field="post_status">Post Status</SortableTableHead>}
            {showAllColumns && <SortableTableHead field="approval_status">Approval</SortableTableHead>}
            {!showAllColumns && (
              <SortableTableHead 
                field={
                  activeTab === 'pending-approval' ? 'approval_status' :
                  activeTab === 'payment-tracking' ? 'payment_status' :
                  'post_status'
                }
              >
                {activeTab === 'pending-approval' && 'Approval Status'}
                {activeTab === 'payment-tracking' && 'Payment Status'}
                {activeTab === 'post-status' && 'Post Status'}
              </SortableTableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCreators.map((creator) => {
            const campaign = campaigns.find(c => c.id === creator.campaign_id);
            return (
              <TableRow key={creator.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">@{creator.instagram_handle}</div>
                    <div className="text-sm text-muted-foreground">
                      {creator.posts_count} post{creator.posts_count > 1 ? 's' : ''} • {creator.post_type}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {campaign?.name || campaign?.campaign_name || 'Unknown Campaign'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    ${creator.rate?.toLocaleString() || 0}
                  </div>
                </TableCell>
                {showAllColumns && (
                  <TableCell>
                    <EditableStatusCell creator={creator} field="payment_status" type="payment" />
                  </TableCell>
                )}
                {showAllColumns && (
                  <TableCell>
                    <EditableStatusCell creator={creator} field="post_status" type="post" />
                  </TableCell>
                )}
                {showAllColumns && (
                  <TableCell>
                    <EditableStatusCell creator={creator} field="approval_status" type="approval" />
                  </TableCell>
                )}
                {!showAllColumns && (
                  <TableCell>
                    {activeTab === 'pending-approval' && (
                      <EditableStatusCell creator={creator} field="approval_status" type="approval" />
                    )}
                    {activeTab === 'payment-tracking' && (
                      <EditableStatusCell creator={creator} field="payment_status" type="payment" />
                    )}
                    {activeTab === 'post-status' && (
                      <EditableStatusCell creator={creator} field="post_status" type="post" />
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const overviewStats = getOverviewStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading QA dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-8 py-8">
        <Breadcrumbs />
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quality Assurance</h1>
            <p className="text-muted-foreground mt-2">
              Monitor campaign progress and manage creator status across all campaigns
            </p>
          </div>
          
          {/* Filter Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="completed">Completed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* QA Sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending-approval" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Pending Approval
            </TabsTrigger>
            <TabsTrigger value="payment-tracking" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Tracking
            </TabsTrigger>
            <TabsTrigger value="post-status" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Post Status
            </TabsTrigger>
            <TabsTrigger value="underperformed" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Underperformed
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending-approval" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Posts Awaiting Approval
                </CardTitle>
                <CardDescription>
                  Creators waiting for content approval or revision feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getPendingApprovalCreators().length > 0 ? (
                  <CreatorTable creators={getPendingApprovalCreators()} showAllColumns={false} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No posts pending approval
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-tracking" className="space-y-6">
            {/* Payment Tracking Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Total Amount</p>
                      <p className="text-2xl font-bold">${paymentTracking.totals.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">Unpaid</p>
                      <p className="text-2xl font-bold text-red-600">${paymentTracking.totals.unpaidAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">${paymentTracking.totals.pendingAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">Overdue</p>
                      <p className="text-2xl font-bold text-orange-600">{paymentTracking.totals.overdue}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Comprehensive Payment Management
                </CardTitle>
                <CardDescription>
                  Advanced payment tracking with filtering, bulk operations, and detailed management across all campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Filters */}
                <PaymentFilters 
                  filters={paymentTracking.filters} 
                  onFiltersChange={paymentTracking.setFilters} 
                />

                {/* Bulk Actions Bar */}
                <BulkActionsBar
                  selectedCount={selectedCreators.length}
                  onBulkUpdate={(status) => {
                    paymentTracking.bulkUpdatePaymentStatus(selectedCreators, status);
                    setSelectedCreators([]);
                  }}
                  onExport={paymentTracking.exportPaymentReport}
                  onClearSelection={() => setSelectedCreators([])}
                />

                {/* Enhanced Payment Table */}
                {paymentTracking.loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading payment data...
                  </div>
                ) : paymentTracking.creators.length > 0 ? (
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedCreators.length === paymentTracking.creators.length}
                              onCheckedChange={(checked) => {
                                setSelectedCreators(
                                  checked ? paymentTracking.creators.map(c => c.id) : []
                                );
                              }}
                            />
                          </TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentTracking.creators.map((creator) => {
                          const isOverdue = creator.payment_status !== 'paid' && 
                                          new Date(creator.due_date) < new Date();
                          const isDueSoon = creator.payment_status !== 'paid' && 
                                          new Date(creator.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                          
                          return (
                            <TableRow 
                              key={creator.id}
                              className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}
                            >
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
                                <div className="text-sm font-medium">
                                  {creator.campaign_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">@{creator.instagram_handle}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {creator.posts_count} post{creator.posts_count > 1 ? 's' : ''}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-bold text-lg">
                                  ${creator.rate.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${
                                    isOverdue ? 'text-red-600 font-semibold' :
                                    isDueSoon ? 'text-orange-600 font-medium' :
                                    'text-muted-foreground'
                                  }`}>
                                    {new Date(creator.due_date).toLocaleDateString()}
                                  </span>
                                  {isOverdue && (
                                    <Badge variant="destructive" className="text-xs">
                                      Overdue
                                    </Badge>
                                  )}
                                  {!isOverdue && isDueSoon && (
                                    <Badge variant="secondary" className="text-xs">
                                      Due Soon
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={creator.payment_status} 
                                  onValueChange={(value) => paymentTracking.updatePaymentStatus(creator.id, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue>
                                      <StatusIndicator type="payment" status={creator.payment_status} />
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="z-50 bg-background border shadow-lg">
                                    <SelectItem value="unpaid">
                                      <StatusIndicator type="payment" status="unpaid" />
                                    </SelectItem>
                                    <SelectItem value="pending">
                                      <StatusIndicator type="payment" status="pending" />
                                    </SelectItem>
                                    <SelectItem value="paid">
                                      <StatusIndicator type="payment" status="paid" />
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setNotesModalCreator(creator)}
                                  >
                                    <StickyNote className="h-4 w-4" />
                                  </Button>
                                  
                                  {creator.payment_status !== 'paid' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => paymentTracking.updatePaymentStatus(creator.id, 'paid')}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Mark Paid
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No creators found matching the current filters
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="post-status" className="space-y-6">
            {/* Post Status Filters */}
            <PostStatusFilters
              filters={postStatusTracking.filters}
              onFiltersChange={postStatusTracking.setFilters}
              onExport={postStatusTracking.exportPostReport}
              campaignOptions={campaigns.map(c => ({ id: c.id, name: c.name || c.campaign_name || 'Unknown Campaign' }))}
            />

            {/* Post Completion Stats Cards */}
            {postCompletionStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{postCompletionStats.totalPosts}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Not Posted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{postCompletionStats.notPosted}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{postCompletionStats.scheduled}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Posted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{postCompletionStats.posted}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Enhanced Post Status Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-500" />
                  Post Status Monitoring
                </CardTitle>
                <CardDescription>
                  Track posting completion and status updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Bulk Actions for Post Status - Moved to Top */}
                {selectedCreators.length > 0 && (
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">
                        {selectedCreators.length} creator{selectedCreators.length !== 1 ? 's' : ''} selected
                      </span>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            postStatusTracking.bulkUpdatePostStatus(selectedCreators, 'posted');
                            setSelectedCreators([]);
                          }}
                          className="text-green-600 hover:text-green-700"
                        >
                          Mark Posted
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            postStatusTracking.bulkUpdatePostStatus(selectedCreators, 'scheduled');
                            setSelectedCreators([]);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Mark Scheduled
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            postStatusTracking.bulkUpdatePostStatus(selectedCreators, 'not_posted');
                            setSelectedCreators([]);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Mark Not Posted
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={postStatusTracking.exportPostReport}>
                        Export Selected
                      </Button>
                      
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCreators([])}>
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}

                {postStatusTracking.loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading post status data...
                  </div>
                ) : postStatusTracking.creators.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedCreators.length === postStatusTracking.creators.length}
                              onCheckedChange={(checked) => {
                                setSelectedCreators(
                                  checked ? postStatusTracking.creators.map(c => c.id) : []
                                );
                              }}
                            />
                          </TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {postStatusTracking.creators.map((creator) => (
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
                              <div className="text-sm font-medium">
                                {creator.campaign_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">@{creator.instagram_handle}</div>
                                <div className="text-sm text-muted-foreground">
                                  {creator.posts_count} post{creator.posts_count > 1 ? 's' : ''}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={creator.post_status} 
                                onValueChange={(value) => postStatusTracking.updatePostStatus(creator.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue>
                                    <StatusIndicator type="post" status={creator.post_status} />
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="z-50 bg-background border shadow-lg">
                                  <SelectItem value="not_posted">
                                    <StatusIndicator type="post" status="not_posted" />
                                  </SelectItem>
                                  <SelectItem value="scheduled">
                                    <StatusIndicator type="post" status="scheduled" />
                                  </SelectItem>
                                  <SelectItem value="posted">
                                    <StatusIndicator type="post" status="posted" />
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No creators found for the current filters
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="underperformed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Underperformed Campaigns
                </CardTitle>
                <CardDescription>
                  Completed campaigns that cost over $1 per 1k views - opportunities for additional posts or engagement boosts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {underperformedCampaigns.length > 0 ? (
                  <div className="space-y-4">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-500" />
                            <div>
                              <p className="text-sm font-medium">Total Underperformed</p>
                              <p className="text-2xl font-bold text-red-600">{underperformedCampaigns.length}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-orange-500" />
                            <div>
                              <p className="text-sm font-medium">Avg Cost per 1k Views</p>
                              <p className="text-2xl font-bold text-orange-600">
                                ${(underperformedCampaigns.reduce((sum, c) => sum + c.actual_cpv, 0) / underperformedCampaigns.length).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                            <div>
                              <p className="text-sm font-medium">Total Excess Cost</p>
                              <p className="text-2xl font-bold text-yellow-600">
                                ${underperformedCampaigns.reduce((sum, c) => 
                                  sum + (c.performance_deficit * (c.total_views / 1000)), 0
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Underperformed Campaigns Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Total Budget</TableHead>
                          <TableHead>Actual CPV</TableHead>
                          <TableHead>Performance Deficit</TableHead>
                          <TableHead>Creators</TableHead>
                          <TableHead>Total Views</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {underperformedCampaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{campaign.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Status: {campaign.status}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                ${campaign.budget?.toLocaleString() || 0}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-red-600">
                                  ${campaign.actual_cpv.toFixed(2)}
                                </span>
                                <Badge variant="destructive" className="text-xs">
                                  {((campaign.actual_cpv / 1.0 - 1) * 100).toFixed(0)}% over
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-orange-600">
                                +${campaign.performance_deficit.toFixed(2)}/1k
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                {campaign.totals?.total_creators || 0}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {campaign.total_views.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  Add More Posts
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Engagement Boost
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingDown className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">No Underperformed Campaigns</h3>
                    <p>All completed campaigns performed within target cost of $1 per 1k views or better!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Creators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewStats.totalCreators}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{overviewStats.pendingApproval}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{overviewStats.pendingPayment}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Not Posted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{overviewStats.notPosted}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{overviewStats.completionRate}%</div>
                </CardContent>
              </Card>
            </div>

            {/* All Creators Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Campaign Overview - All Creators
                </CardTitle>
                <CardDescription>
                  Complete status overview across all filtered campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getFilteredCreators().length > 0 ? (
                  <ScrollArea className="h-96">
                    <CreatorTable creators={getFilteredCreators()} showAllColumns={true} />
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No creators found for the selected filter
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Notes Modal */}
      <PaymentNotesModal
        creator={notesModalCreator}
        isOpen={!!notesModalCreator}
        onClose={() => setNotesModalCreator(null)}
        onSave={(creatorId, status, notes) => {
          paymentTracking.updatePaymentStatus(creatorId, status, notes);
        }}
      />


      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
      />
    </div>
  );
};

export default QualityAssurance;
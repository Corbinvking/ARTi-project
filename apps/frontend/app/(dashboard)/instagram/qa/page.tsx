"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Clock, AlertCircle, FileCheck, DollarSign, Upload, BarChart3, Filter, ArrowUpDown, ArrowUp, ArrowDown, TrendingDown, Users, StickyNote } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/auth";
import Link from "next/link";

// Types
interface QACampaign {
  id: string;
  name: string;
  status: string;
  campaign_type: string;
  totals?: {
    average_cpv?: number;
    total_cost?: number;
    total_creators?: number;
    total_median_views?: number;
    budget_remaining?: number;
  };
  budget?: number;
}

interface CampaignCreator {
  id: string;
  campaign_id: string;
  instagram_handle: string;
  rate: number;
  posts_count: number;
  post_type: string;
  payment_status: 'unpaid' | 'pending' | 'paid';
  post_status: 'not_posted' | 'scheduled' | 'posted';
  approval_status: 'pending' | 'approved' | 'revision_requested' | 'rejected';
  payment_notes?: string;
  approval_notes?: string;
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

type SortField = 'creator' | 'campaign' | 'rate' | 'payment_status' | 'post_status' | 'approval_status';
type SortDirection = 'asc' | 'desc' | null;

export default function InstagramQAPage() {
  const [activeTab, setActiveTab] = useState('pending-approval');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [campaigns, setCampaigns] = useState<QACampaign[]>([]);
  const [allCreators, setAllCreators] = useState<CampaignCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('creator');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadCampaignsAndCreators();
  }, []);

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
      
      const transformedCampaigns: QACampaign[] = (campaignsData || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        campaign_type: campaign.campaign_type,
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
      toast({
        title: "Error",
        description: "Failed to load QA data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
          aValue = (aCampaign?.name || '').toLowerCase();
          bValue = (bCampaign?.name || '').toLowerCase();
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
      const { error } = await supabase
        .from('campaign_creators')
        .update({ [field]: value })
        .eq('id', creatorId);

      if (error) throw error;

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

  const bulkUpdateStatus = async (
    field: 'payment_status' | 'post_status' | 'approval_status',
    value: string
  ) => {
    if (selectedCreators.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('campaign_creators')
        .update({ [field]: value })
        .in('id', selectedCreators);

      if (error) throw error;

      setAllCreators(prev => prev.map(creator => 
        selectedCreators.includes(creator.id)
          ? { ...creator, [field]: value }
          : creator
      ));

      setSelectedCreators([]);
      toast({
        title: "Bulk Update Complete",
        description: `Updated ${selectedCreators.length} creators`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update creators",
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
            <TableHead className="w-10">
              <Checkbox
                checked={selectedCreators.length === creators.length && creators.length > 0}
                onCheckedChange={(checked) => {
                  setSelectedCreators(checked ? creators.map(c => c.id) : []);
                }}
              />
            </TableHead>
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
                    <div className="font-medium">@{creator.instagram_handle}</div>
                    <div className="text-sm text-muted-foreground">
                      {creator.posts_count} post{creator.posts_count > 1 ? 's' : ''} • {creator.post_type}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {campaign?.name || 'Unknown Campaign'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    ${creator.rate?.toLocaleString() || 0}
                  </div>
                </TableCell>
                {showAllColumns && (
                  <TableCell>
                    <Select
                      value={creator.payment_status}
                      onValueChange={(value) => updateCreatorStatus(creator.id, 'payment_status', value)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <StatusIndicator type="payment" status={creator.payment_status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid"><StatusIndicator type="payment" status="unpaid" /></SelectItem>
                        <SelectItem value="pending"><StatusIndicator type="payment" status="pending" /></SelectItem>
                        <SelectItem value="paid"><StatusIndicator type="payment" status="paid" /></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}
                {showAllColumns && (
                  <TableCell>
                    <Select
                      value={creator.post_status}
                      onValueChange={(value) => updateCreatorStatus(creator.id, 'post_status', value)}
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
                )}
                {showAllColumns && (
                  <TableCell>
                    <Select
                      value={creator.approval_status}
                      onValueChange={(value) => updateCreatorStatus(creator.id, 'approval_status', value)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <StatusIndicator type="approval" status={creator.approval_status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending"><StatusIndicator type="approval" status="pending" /></SelectItem>
                        <SelectItem value="approved"><StatusIndicator type="approval" status="approved" /></SelectItem>
                        <SelectItem value="revision_requested"><StatusIndicator type="approval" status="revision_requested" /></SelectItem>
                        <SelectItem value="rejected"><StatusIndicator type="approval" status="rejected" /></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}
                {!showAllColumns && (
                  <TableCell>
                    {activeTab === 'pending-approval' && (
                      <Select
                        value={creator.approval_status}
                        onValueChange={(value) => updateCreatorStatus(creator.id, 'approval_status', value)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <StatusIndicator type="approval" status={creator.approval_status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending"><StatusIndicator type="approval" status="pending" /></SelectItem>
                          <SelectItem value="approved"><StatusIndicator type="approval" status="approved" /></SelectItem>
                          <SelectItem value="revision_requested"><StatusIndicator type="approval" status="revision_requested" /></SelectItem>
                          <SelectItem value="rejected"><StatusIndicator type="approval" status="rejected" /></SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {activeTab === 'payment-tracking' && (
                      <Select
                        value={creator.payment_status}
                        onValueChange={(value) => updateCreatorStatus(creator.id, 'payment_status', value)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <StatusIndicator type="payment" status={creator.payment_status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid"><StatusIndicator type="payment" status="unpaid" /></SelectItem>
                          <SelectItem value="pending"><StatusIndicator type="payment" status="pending" /></SelectItem>
                          <SelectItem value="paid"><StatusIndicator type="payment" status="paid" /></SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {activeTab === 'post-status' && (
                      <Select
                        value={creator.post_status}
                        onValueChange={(value) => updateCreatorStatus(creator.id, 'post_status', value)}
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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading QA dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Quality Assurance</h1>
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

      {/* Bulk Actions Bar */}
      {selectedCreators.length > 0 && (
        <Card className="mb-6 border-purple-500/20 bg-purple-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedCreators.length} creator(s) selected</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('payment_status', 'paid')} className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mark Paid
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('post_status', 'posted')} className="text-blue-600">
                  <Upload className="h-3 w-3 mr-1" />
                  Mark Posted
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('approval_status', 'approved')} className="text-purple-600">
                  <FileCheck className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedCreators([])}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QA Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending-approval" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Pending Approval
            {getPendingApprovalCreators().length > 0 && (
              <Badge variant="secondary">{getPendingApprovalCreators().length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment-tracking" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payment Tracking
            {getPaymentTrackingCreators().length > 0 && (
              <Badge variant="secondary">{getPaymentTrackingCreators().length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="post-status" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Post Status
            {getPostStatusCreators().length > 0 && (
              <Badge variant="secondary">{getPostStatusCreators().length}</Badge>
            )}
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
                <ScrollArea className="h-96">
                  <CreatorTable creators={getPendingApprovalCreators()} showAllColumns={false} />
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No posts pending approval</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-tracking" className="space-y-6">
          {/* Payment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Unpaid</p>
                    <p className="text-2xl font-bold text-red-600">
                      {getFilteredCreators().filter(c => c.payment_status === 'unpaid').length}
                    </p>
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
                    <p className="text-2xl font-bold text-yellow-600">
                      {getFilteredCreators().filter(c => c.payment_status === 'pending').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {getFilteredCreators().filter(c => c.payment_status === 'paid').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Payment Management
              </CardTitle>
              <CardDescription>
                Track and manage creator payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getPaymentTrackingCreators().length > 0 ? (
                <ScrollArea className="h-96">
                  <CreatorTable creators={getPaymentTrackingCreators()} showAllColumns={false} />
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>All creators are paid!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="post-status" className="space-y-6">
          {/* Post Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Not Posted</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {getFilteredCreators().filter(c => c.post_status === 'not_posted').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {getFilteredCreators().filter(c => c.post_status === 'scheduled').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Posted</p>
                    <p className="text-2xl font-bold text-green-600">
                      {getFilteredCreators().filter(c => c.post_status === 'posted').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
              {getPostStatusCreators().length > 0 ? (
                <ScrollArea className="h-96">
                  <CreatorTable creators={getPostStatusCreators()} showAllColumns={false} />
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>All posts are live!</p>
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
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No creators found for the selected filter</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

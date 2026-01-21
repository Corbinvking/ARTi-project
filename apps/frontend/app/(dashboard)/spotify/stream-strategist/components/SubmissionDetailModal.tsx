"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  User, 
  Mail, 
  CheckCircle,
  XCircle,
  Clock,
  Music,
  Globe,
  Package,
  Plus,
  Trash2,
  Save,
  Edit2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../hooks/use-toast';
import { useVendors } from '../hooks/useVendors';
import { useUpdateSubmissionVendors } from '../hooks/useCampaignSubmissions';

interface VendorAssignment {
  vendor_id: string;
  vendor_name: string;
  allocated_streams: number;
  allocated_budget: number;
  playlist_ids?: string[];
  cost_per_1k?: number; // Vendor's rate, can be overridden
}

interface Submission {
  id: string;
  campaign_name: string;
  client_name: string;
  client_id?: string;
  client_emails: string[];
  salesperson: string;
  track_url: string;
  sfa_url?: string;
  stream_goal: number;
  price_paid: number;
  start_date: string;
  duration_days: number;
  music_genres?: string[];
  territory_preferences?: string[];
  notes?: string;
  status: string;
  vendor_assignments?: VendorAssignment[];
  rejection_reason?: string;
  created_at: string;
}

interface SubmissionDetailModalProps {
  submission: Submission | null;
  open: boolean;
  onClose: () => void;
  onApprove: (submissionId: string) => void;
  onReject: (submissionId: string, reason: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function SubmissionDetailModal({
  submission,
  open,
  onClose,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: SubmissionDetailModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isEditingVendors, setIsEditingVendors] = useState(false);
  const [editedAssignments, setEditedAssignments] = useState<VendorAssignment[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const { toast } = useToast();
  
  const { data: vendors = [] } = useVendors();
  const updateVendorsMutation = useUpdateSubmissionVendors();

  // Sync edited assignments when modal opens or submission changes
  useEffect(() => {
    if (submission?.vendor_assignments) {
      setEditedAssignments([...submission.vendor_assignments]);
    } else {
      setEditedAssignments([]);
    }
    setIsEditingVendors(false);
  }, [submission?.id, open]);

  if (!submission) return null;
  
  // Get vendors not yet assigned
  const availableVendors = vendors.filter(
    v => !editedAssignments.some(a => a.vendor_id === v.id)
  );

  const handleAddVendor = () => {
    if (!selectedVendorId) return;
    const vendor = vendors.find(v => v.id === selectedVendorId);
    if (!vendor) return;
    
    // Calculate default allocation based on remaining streams/budget
    const currentAllocatedStreams = editedAssignments.reduce((sum, a) => sum + a.allocated_streams, 0);
    const currentAllocatedBudget = editedAssignments.reduce((sum, a) => sum + a.allocated_budget, 0);
    const remainingStreams = Math.max(0, submission.stream_goal - currentAllocatedStreams);
    const remainingBudget = Math.max(0, submission.price_paid - currentAllocatedBudget);
    
    // Split remaining evenly if adding to existing, or take all if first vendor
    const vendorCount = editedAssignments.length + 1;
    const defaultStreams = editedAssignments.length === 0 
      ? remainingStreams 
      : Math.round(remainingStreams / 2);
    
    // Calculate budget based on vendor's rate or default $8/1k
    const ratePer1k = vendor.cost_per_1k_streams || 8;
    const defaultBudget = (defaultStreams / 1000) * ratePer1k;
    
    setEditedAssignments([
      ...editedAssignments,
      {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        allocated_streams: defaultStreams,
        allocated_budget: Math.round(defaultBudget * 100) / 100,
        cost_per_1k: ratePer1k,
        playlist_ids: []
      }
    ]);
    setSelectedVendorId('');
  };

  const handleRemoveVendor = (vendorId: string) => {
    setEditedAssignments(editedAssignments.filter(a => a.vendor_id !== vendorId));
  };

  const handleUpdateAllocation = (vendorId: string, field: 'allocated_streams' | 'allocated_budget' | 'cost_per_1k', value: number) => {
    setEditedAssignments(editedAssignments.map(a => {
      if (a.vendor_id !== vendorId) return a;
      
      const vendor = vendors.find(v => v.id === vendorId);
      const updated = { ...a, [field]: value };
      
      // Auto-recalculate budget when streams or cost_per_1k changes
      if (field === 'allocated_streams' || field === 'cost_per_1k') {
        const streams = field === 'allocated_streams' ? value : (a.allocated_streams || 0);
        const costPer1k = field === 'cost_per_1k' ? value : (a.cost_per_1k ?? vendor?.cost_per_1k_streams ?? 8);
        updated.allocated_budget = Math.round((streams / 1000) * costPer1k * 100) / 100;
        if (field === 'cost_per_1k') {
          updated.cost_per_1k = value;
        }
      }
      
      return updated;
    }));
  };

  const handleSaveVendors = async () => {
    try {
      await updateVendorsMutation.mutateAsync({
        submissionId: submission.id,
        vendorAssignments: editedAssignments
      });
      setIsEditingVendors(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancelEdit = () => {
    setEditedAssignments(submission.vendor_assignments ? [...submission.vendor_assignments] : []);
    setIsEditingVendors(false);
  };

  // Auto-suggest vendors based on daily capacity
  const handleAutoSuggest = () => {
    console.log('🔧 Auto-suggest started');
    console.log('🔧 Total vendors:', vendors.length);
    
    if (vendors.length === 0) {
      toast({
        title: "No vendors available",
        description: "Please wait for vendor data to load.",
        variant: "destructive"
      });
      return;
    }
    
    // Get active vendors with capacity, sorted by max daily streams
    const activeVendors = vendors
      .filter(v => v.is_active && (v.max_daily_streams || 0) > 0)
      .sort((a, b) => (b.max_daily_streams || 0) - (a.max_daily_streams || 0));
    
    console.log('🔧 Active vendors with capacity:', activeVendors.map(v => 
      `${v.name}: ${v.max_daily_streams}/day @ $${v.cost_per_1k_streams || 8}/1K`
    ));
    
    if (activeVendors.length === 0) {
      toast({
        title: "No active vendors",
        description: "All vendors are inactive or have no daily capacity set.",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate proportional allocation based on daily capacity
    const totalDailyCapacity = activeVendors.reduce((sum, v) => sum + (v.max_daily_streams || 0), 0);
    const campaignDays = submission.duration_days || 90;
    const dailyStreamsNeeded = submission.stream_goal / campaignDays;
    
    console.log('🔧 Campaign analysis:', {
      streamGoal: submission.stream_goal,
      campaignDays,
      dailyNeeded: dailyStreamsNeeded.toFixed(0),
      totalDailyCapacity,
      utilizationPercent: ((dailyStreamsNeeded / totalDailyCapacity) * 100).toFixed(1) + '%'
    });
    
    const newAssignments: VendorAssignment[] = [];
    let remainingStreams = submission.stream_goal;
    
    for (const vendor of activeVendors) {
      if (remainingStreams <= 0) break;
      
      // Allocate proportionally based on daily capacity
      const vendorDailyCapacity = vendor.max_daily_streams || 0;
      const proportion = vendorDailyCapacity / totalDailyCapacity;
      const allocatedStreams = Math.min(
        Math.round(submission.stream_goal * proportion),
        remainingStreams
      );
      
      // Calculate budget based on vendor's rate
      const ratePer1k = vendor.cost_per_1k_streams || 8;
      const allocatedBudget = (allocatedStreams / 1000) * ratePer1k;
      
      console.log(`🔧 ${vendor.name}: capacity=${vendorDailyCapacity}/day, proportion=${(proportion * 100).toFixed(1)}%, streams=${allocatedStreams}, budget=$${allocatedBudget.toFixed(2)}`);
      
      if (allocatedStreams > 0) {
        newAssignments.push({
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          allocated_streams: allocatedStreams,
          allocated_budget: Math.round(allocatedBudget * 100) / 100,
          cost_per_1k: ratePer1k,
          playlist_ids: []
        });
        
        remainingStreams -= allocatedStreams;
      }
    }
    
    console.log('✅ Auto-suggest complete:', newAssignments.map(a => 
      `${a.vendor_name}: ${a.allocated_streams.toLocaleString()} streams, $${a.allocated_budget.toFixed(2)}`
    ));
    
    setEditedAssignments(newAssignments);
    toast({
      title: "Vendors auto-suggested",
      description: `${newAssignments.length} vendors assigned based on daily capacity. Click Save to apply.`
    });
  };

  const handleApprove = () => {
    onApprove(submission.id);
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this submission",
        variant: "destructive",
      });
      return;
    }
    onReject(submission.id, rejectionReason);
    setRejectionReason('');
    setShowRejectDialog(false);
  };

  const totalAllocatedStreams = submission.vendor_assignments?.reduce(
    (sum, va) => sum + va.allocated_streams, 0
  ) || 0;
  
  const totalAllocatedBudget = submission.vendor_assignments?.reduce(
    (sum, va) => sum + va.allocated_budget, 0
  ) || 0;

  // Calculate client's cost per 1K streams (what they pay us)
  const clientCostPer1K = submission.stream_goal > 0 
    ? (submission.price_paid / submission.stream_goal * 1000)
    : 0;

  // Calculate average vendor rate from actual allocations
  const vendorAssignments = submission.vendor_assignments || [];
  const avgVendorRatePer1K = vendorAssignments.length > 0 && totalAllocatedStreams > 0
    ? vendorAssignments.reduce((sum, va) => {
        // Use stored cost_per_1k if available, otherwise look up vendor's default rate
        const vendor = vendors.find(v => v.id === va.vendor_id);
        const vendorRate = va.cost_per_1k ?? vendor?.cost_per_1k_streams ?? 8;
        // Weight by streams allocated
        return sum + (vendorRate * va.allocated_streams);
      }, 0) / totalAllocatedStreams
    : null;
  
  // Estimated margin (client rate - vendor rate)
  const estimatedMarginPer1K = avgVendorRatePer1K !== null && clientCostPer1K > 0
    ? clientCostPer1K - avgVendorRatePer1K
    : null;

  return (
    <>
      <Dialog open={open && !showRejectDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Music className="h-6 w-6 text-primary" />
              {submission.campaign_name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant={submission.status === 'pending_approval' ? 'default' : 'secondary'}>
                {submission.status === 'pending_approval' ? 'Pending Approval' : submission.status}
              </Badge>
              <span className="text-muted-foreground">
                Submitted {format(new Date(submission.created_at), 'PPp')}
              </span>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Campaign Details</TabsTrigger>
              <TabsTrigger value="vendors">
                Vendor Assignments
                {submission.vendor_assignments && submission.vendor_assignments.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {submission.vendor_assignments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="additional">Additional Info</TabsTrigger>
            </TabsList>

            {/* Tab 1: Campaign Details */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Client Name</Label>
                      <p className="font-medium">{submission.client_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Salesperson</Label>
                      <p className="font-medium">{submission.salesperson}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Client Emails
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {submission.client_emails.map((email, idx) => (
                        <Badge key={idx} variant="outline">{email}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Track Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Spotify Track URL</Label>
                    <a
                      href={submission.track_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Spotify
                    </a>
                  </div>
                  {submission.sfa_url && (
                    <div>
                      <Label className="text-muted-foreground">Spotify for Artists URL</Label>
                      <a
                        href={submission.sfa_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View SFA Dashboard
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Campaign Goals & Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Stream Goal</Label>
                      <p className="text-xl font-bold">{submission.stream_goal.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Budget</Label>
                      <p className="text-xl font-bold">${submission.price_paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Client Rate/1K</Label>
                      <p className="text-xl font-bold">${clientCostPer1K.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Avg Vendor Rate/1K</Label>
                      <p className="text-xl font-bold">
                        {avgVendorRatePer1K !== null 
                          ? `$${avgVendorRatePer1K.toFixed(2)}`
                          : <span className="text-muted-foreground text-base">Not assigned</span>
                        }
                      </p>
                    </div>
                  </div>
                  {estimatedMarginPer1K !== null && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Est. Margin per 1K Streams</Label>
                        <p className={`text-lg font-bold ${estimatedMarginPer1K >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${estimatedMarginPer1K.toFixed(2)} ({((estimatedMarginPer1K / clientCostPer1K) * 100).toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Start Date</Label>
                      <p className="font-medium">{format(new Date(submission.start_date), 'PPP')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Duration</Label>
                      <p className="font-medium">{submission.duration_days} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Vendor Assignments */}
            <TabsContent value="vendors" className="space-y-4 mt-4">
              {/* Edit Mode Controls */}
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {isEditingVendors ? 'Edit Vendor Assignments' : 'Vendor Assignments'}
                </h3>
                <div className="flex gap-2">
                  {isEditingVendors ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveVendors}
                        disabled={updateVendorsMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateVendorsMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingVendors(true)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit Assignments
                    </Button>
                  )}
                </div>
              </div>

              {/* Allocation Summary - always show */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Allocation Summary</CardTitle>
                  <CardDescription>
                    {isEditingVendors 
                      ? 'Preview of current allocations (save to apply changes)'
                      : 'Total allocations across all vendors'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const displayAssignments = isEditingVendors ? editedAssignments : (submission.vendor_assignments || []);
                    const displayAllocatedStreams = displayAssignments.reduce((sum, a) => sum + a.allocated_streams, 0);
                    const displayAllocatedBudget = displayAssignments.reduce((sum, a) => sum + a.allocated_budget, 0);
                    
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Total Allocated Streams</Label>
                          <p className="text-lg font-bold">{displayAllocatedStreams.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {submission.stream_goal > 0 
                              ? `${((displayAllocatedStreams / submission.stream_goal) * 100).toFixed(0)}% of goal`
                              : '0% of goal'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Total Allocated Budget</Label>
                          <p className="text-lg font-bold">${displayAllocatedBudget.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {submission.price_paid > 0 
                              ? `${((displayAllocatedBudget / submission.price_paid) * 100).toFixed(0)}% of budget`
                              : '0% of budget'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Remaining Streams</Label>
                          <p className={`text-lg font-bold ${(submission.stream_goal - displayAllocatedStreams) < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {(submission.stream_goal - displayAllocatedStreams).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Remaining Budget</Label>
                          <p className={`text-lg font-bold ${(submission.price_paid - displayAllocatedBudget) < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            ${(submission.price_paid - displayAllocatedBudget).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Edit Mode: Add Vendor + Auto-Suggest */}
              {isEditingVendors && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Vendor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-sm text-muted-foreground mb-1 block">Select Vendor</Label>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={selectedVendorId}
                          onChange={(e) => setSelectedVendorId(e.target.value)}
                        >
                          <option value="">Choose a vendor...</option>
                          {availableVendors.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name} (${v.cost_per_1k_streams || 8}/1K, max {v.max_daily_streams.toLocaleString()}/day)
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button 
                        onClick={handleAddVendor} 
                        disabled={!selectedVendorId}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={handleAutoSuggest}
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Auto-Suggest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vendor List */}
              {(() => {
                const displayAssignments = isEditingVendors ? editedAssignments : (submission.vendor_assignments || []);
                
                if (displayAssignments.length === 0) {
                  return (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No vendor assignments yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {isEditingVendors 
                            ? 'Use the dropdown above to add vendors or click Auto-Suggest'
                            : 'Click "Edit Assignments" to add vendors'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {displayAssignments.map((assignment, idx) => {
                      const vendor = vendors.find(v => v.id === assignment.vendor_id);
                      // Use stored cost_per_1k if available, otherwise use vendor's default rate
                      const effectiveRate = assignment.cost_per_1k ?? vendor?.cost_per_1k_streams ?? 8;
                      const vendorCostPerStream = effectiveRate.toFixed(2);
                      
                      return (
                        <Card key={assignment.vendor_id || idx}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                {assignment.vendor_name}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  Rate: ${vendor?.cost_per_1k_streams || 8}/1K
                                </Badge>
                                {isEditingVendors && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveVendor(assignment.vendor_id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <Label className="text-muted-foreground">Allocated Streams</Label>
                                {isEditingVendors ? (
                                  <Input
                                    type="number"
                                    value={assignment.allocated_streams || 0}
                                    onChange={(e) => handleUpdateAllocation(
                                      assignment.vendor_id, 
                                      'allocated_streams', 
                                      parseInt(e.target.value) || 0
                                    )}
                                    className="mt-1"
                                  />
                                ) : (
                                  <p className="text-lg font-bold">{(assignment.allocated_streams || 0).toLocaleString()}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Rate/1K</Label>
                                {isEditingVendors ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={assignment.cost_per_1k ?? vendor?.cost_per_1k_streams ?? 8}
                                    onChange={(e) => handleUpdateAllocation(
                                      assignment.vendor_id, 
                                      'cost_per_1k', 
                                      parseFloat(e.target.value) || 0
                                    )}
                                    className="mt-1"
                                  />
                                ) : (
                                  <p className="text-lg font-bold">${vendorCostPerStream}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Budget (auto)</Label>
                                <p className="text-lg font-bold">${assignment.allocated_budget.toLocaleString()}</p>
                                {isEditingVendors && (
                                  <p className="text-xs text-muted-foreground">Auto-calculated</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </TabsContent>

            {/* Tab 3: Additional Info */}
            <TabsContent value="additional" className="space-y-4 mt-4">
              {submission.music_genres && submission.music_genres.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Music Genres
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {submission.music_genres.map((genre, idx) => (
                        <Badge key={idx} variant="secondary">{genre}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {submission.territory_preferences && submission.territory_preferences.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Territory Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {submission.territory_preferences.map((territory, idx) => (
                        <Badge key={idx} variant="outline">{territory}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {submission.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{submission.notes}</p>
                  </CardContent>
                </Card>
              )}

              {submission.rejection_reason && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-base text-destructive flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Rejection Reason
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{submission.rejection_reason}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {submission.status === 'pending_approval' && (
            <DialogFooter className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isApproving || isRejecting}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                disabled={isApproving || isRejecting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Create Campaign
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Reject Campaign Submission
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{submission.campaign_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please explain why this campaign is being rejected..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectionReason('');
                setShowRejectDialog(false);
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={!rejectionReason.trim() || isRejecting}
            >
              {isRejecting ? 'Rejecting...' : 'Reject Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


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
import { Plus, ExternalLink, Music, DollarSign, Calendar, User, Edit, Trash2, Search, ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useInstagramCampaignMutations } from "../seedstorm-builder/hooks/useInstagramCampaignMutations";

export default function InstagramCampaignsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { updateCampaign, deleteCampaign, isUpdating, isDeleting } = useInstagramCampaignMutations();

  // Fetch campaigns from Supabase
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['instagram-campaigns'],
    queryFn: async () => {
      console.log('📡 Fetching Instagram campaigns...');
      const { data, error } = await supabase
        .from('instagram_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching campaigns:', error);
        throw error;
      }
      
      console.log(`✅ Fetched ${data?.length || 0} campaigns:`, data?.[0]);
      return data || [];
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

  const handleSaveEdit = () => {
    updateCampaign({
      id: selectedCampaign.id,
      updates: editForm
    });
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

  const updateField = (field: string, value: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'draft': return 'bg-gray-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'unreleased': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Calculate KPIs and status counts
  const kpis = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c: any) => c.status?.toLowerCase() === 'active').length,
    completedCampaigns: campaigns.filter((c: any) => c.status?.toLowerCase() === 'completed').length,
    draftCampaigns: campaigns.filter((c: any) => c.status?.toLowerCase() === 'draft').length,
    pausedCampaigns: campaigns.filter((c: any) => c.status?.toLowerCase() === 'paused').length,
    cancelledCampaigns: campaigns.filter((c: any) => c.status?.toLowerCase() === 'cancelled').length,
    unreleasedCampaigns: campaigns.filter((c: any) => c.status?.toLowerCase() === 'unreleased').length,
    totalBudget: campaigns.reduce((sum: number, c: any) => {
      const price = parseFloat(c.price?.replace(/[^0-9.]/g, '') || '0');
      return sum + price;
    }, 0),
    totalSpend: campaigns.reduce((sum: number, c: any) => {
      const spend = parseFloat(c.spend?.replace(/[^0-9.]/g, '') || '0');
      return sum + spend;
    }, 0),
    totalRemaining: campaigns.reduce((sum: number, c: any) => {
      const remaining = parseFloat(c.remaining?.replace(/[^0-9.]/g, '') || '0');
      return sum + remaining;
    }, 0),
  };

  // Calculate completion rate
  const completionRate = kpis.totalBudget > 0 
    ? ((kpis.totalSpend / kpis.totalBudget) * 100).toFixed(1)
    : '0';

  // Filter campaigns based on search and status
  const filteredCampaigns = campaigns.filter((campaign: any) => {
    const matchesSearch = 
      campaign.campaign?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.clients?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.salespeople?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || campaign.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
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
        <Link href="/instagram/campaign-builder">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
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
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                Completed
                <Badge variant="secondary" className="ml-1">
                  {kpis.completedCampaigns}
                </Badge>
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-gray-500"></span>
                Draft
                <Badge variant="secondary" className="ml-1">
                  {kpis.draftCampaigns}
                </Badge>
              </Button>
              <Button
                variant={statusFilter === "paused" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("paused")}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                Paused
                <Badge variant="secondary" className="ml-1">
                  {kpis.pausedCampaigns}
                </Badge>
              </Button>
              {kpis.unreleasedCampaigns > 0 && (
                <Button
                  variant={statusFilter === "unreleased" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("unreleased")}
                  className="flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  Unreleased
                  <Badge variant="secondary" className="ml-1">
                    {kpis.unreleasedCampaigns}
                  </Badge>
                </Button>
              )}
              {kpis.cancelledCampaigns > 0 && (
                <Button
                  variant={statusFilter === "cancelled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("cancelled")}
                  className="flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  Cancelled
                  <Badge variant="secondary" className="ml-1">
                    {kpis.cancelledCampaigns}
                  </Badge>
                </Button>
              )}
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
                  <TableHead className="w-[16%] px-3">Campaign</TableHead>
                  <TableHead className="w-[10%] px-2">Client</TableHead>
                  <TableHead className="w-[9%] px-2">Status</TableHead>
                  <TableHead className="w-[18%] px-2">Progress</TableHead>
                  <TableHead className="text-right w-[10%] px-2">Budget</TableHead>
                  <TableHead className="text-right w-[10%] px-2">Spend</TableHead>
                  <TableHead className="text-right w-[10%] px-2">Left</TableHead>
                  <TableHead className="w-[9%] px-2">Sales</TableHead>
                  <TableHead className="w-[8%] px-2">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign: any) => {
                  // Calculate budget progress
                  const priceNum = parseFloat(campaign.price?.replace(/[^0-9.]/g, '') || '0');
                  const spendNum = parseFloat(campaign.spend?.replace(/[^0-9.]/g, '') || '0');
                  const remainingNum = parseFloat(campaign.remaining?.replace(/[^0-9.]/g, '') || '0');
                  const progressPercent = priceNum > 0 ? (spendNum / priceNum) * 100 : 0;
                  
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
                        <Badge className={getStatusColor(campaign.status || 'draft')} variant="outline">
                          <span className="text-[10px]">{campaign.status || 'Draft'}</span>
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
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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
                    value={editForm.status || 'draft'}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="px-3 py-1 border rounded-md"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <Badge className={getStatusColor(selectedCampaign.status || 'draft')}>
                    {selectedCampaign.status || 'Draft'}
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
                      <p className="text-lg font-medium">{selectedCampaign.invoice || 'N/A'}</p>
                    )}
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

              {/* Notes */}
              {(selectedCampaign.report_notes || selectedCampaign.client_notes || isEditMode) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Report Notes:</p>
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
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Client Notes:</p>
                      {isEditMode ? (
                        <Textarea
                          value={editForm.client_notes || ''}
                          onChange={(e) => updateField('client_notes', e.target.value)}
                          placeholder="Add client notes..."
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm">{selectedCampaign.client_notes || '-'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tracking Checkboxes */}
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
                      checked={selectedCampaign.send_final_report === 'checked'} 
                      disabled 
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Final Report Sent</span>
                  </div>
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
    </div>
  );
}


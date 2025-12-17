"use client"

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { useVendorPayouts, useMarkPayoutPaid, useBulkMarkPayoutsPaid, VendorPayout } from '../hooks/useVendorPayouts';
import { useCreatePaymentRecord } from '../hooks/usePaymentHistory';
import { Search, Download, DollarSign, CheckCircle, Clock, Receipt, Edit, Save, X, ChevronRight, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '../hooks/use-toast';

export function VendorPayoutManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());
  const [editingPayouts, setEditingPayouts] = useState<Map<string, number>>(new Map());
  const [pendingEdits, setPendingEdits] = useState<Map<string, number>>(new Map());
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  
  const { data: vendorPayouts, isLoading } = useVendorPayouts();
  const markPayoutPaid = useMarkPayoutPaid();
  const bulkMarkPayoutsPaid = useBulkMarkPayoutsPaid();
  const createPaymentRecord = useCreatePaymentRecord();
  const { toast } = useToast();

  // Filter and sort vendors by total owed
  const filteredVendors = vendorPayouts?.filter(vendor => {
    const matchesSearch = vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.campaigns.some(campaign => 
                           campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesStatus = statusFilter === 'all' || 
                         vendor.campaigns.some(campaign => campaign.payment_status === statusFilter);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.total_owed - a.total_owed) || [];

  // Calculate summary stats from all vendors
  const allUnpaidCampaigns = vendorPayouts?.flatMap(vendor => 
    vendor.campaigns.filter(campaign => campaign.payment_status === 'unpaid')
  ) || [];
  const totalUnpaidAmount = allUnpaidCampaigns.reduce((sum, campaign) => sum + campaign.amount_owed, 0);
  const uniqueVendorsWithUnpaidCampaigns = new Set(
    allUnpaidCampaigns.map(campaign => campaign.vendor_id)
  ).size;

  const handleMarkPaid = (payout: VendorPayout) => {
    markPayoutPaid.mutate({
      campaignId: payout.campaign_id,
      vendorId: payout.vendor_id,
      amount: payout.amount_owed
    });
  };

  const handleSelectPayout = (payoutKey: string, checked: boolean) => {
    setSelectedPayouts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(payoutKey);
      } else {
        newSet.delete(payoutKey);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unpaidKeys = allUnpaidCampaigns.map(p => `${p.campaign_id}-${p.vendor_id}`);
      setSelectedPayouts(new Set(unpaidKeys));
    } else {
      setSelectedPayouts(new Set());
    }
  };

  const handleSelectVendor = (vendorId: string, checked: boolean) => {
    const vendor = vendorPayouts?.find(v => v.vendor_id === vendorId);
    if (!vendor) return;

    const unpaidCampaignKeys = vendor.campaigns
      .filter(campaign => campaign.payment_status === 'unpaid')
      .map(campaign => `${campaign.campaign_id}-${campaign.vendor_id}`);

    setSelectedPayouts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        unpaidCampaignKeys.forEach(key => newSet.add(key));
      } else {
        unpaidCampaignKeys.forEach(key => newSet.delete(key));
      }
      return newSet;
    });
  };

  const toggleVendorExpanded = (vendorId: string) => {
    setExpandedVendors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vendorId)) {
        newSet.delete(vendorId);
      } else {
        newSet.add(vendorId);
      }
      return newSet;
    });
  };

  const handleBulkMarkPaid = () => {
    const selectedUnpaidPayouts = allUnpaidCampaigns.filter(p => 
      selectedPayouts.has(`${p.campaign_id}-${p.vendor_id}`)
    );

    if (selectedUnpaidPayouts.length === 0) {
      toast({
        title: "No Payouts Selected",
        description: "Please select unpaid campaigns to mark as paid.",
        variant: "destructive",
      });
      return;
    }

    const payoutData = selectedUnpaidPayouts.map(p => {
      const payoutKey = `${p.campaign_id}-${p.vendor_id}`;
      const editedAmount = pendingEdits.get(payoutKey);
      return {
        campaignId: p.campaign_id,
        vendorId: p.vendor_id,
        amount: editedAmount !== undefined ? editedAmount : p.amount_owed
      };
    });

    bulkMarkPayoutsPaid.mutate(payoutData);
    setSelectedPayouts(new Set());
    setPendingEdits(new Map());
    setEditingPayouts(new Map());
  };

  const handleEditAmount = (payoutKey: string, currentAmount: number) => {
    setEditingPayouts(prev => new Map(prev).set(payoutKey, currentAmount));
    setPendingEdits(prev => new Map(prev).set(payoutKey, currentAmount));
  };

  const handleSaveAmount = (payoutKey: string) => {
    setEditingPayouts(prev => {
      const newMap = new Map(prev);
      newMap.delete(payoutKey);
      return newMap;
    });
  };

  const handleCancelEdit = (payoutKey: string) => {
    setEditingPayouts(prev => {
      const newMap = new Map(prev);
      newMap.delete(payoutKey);
      return newMap;
    });
    setPendingEdits(prev => {
      const newMap = new Map(prev);
      newMap.delete(payoutKey);
      return newMap;
    });
  };

  const handleAmountChange = (payoutKey: string, newAmount: string) => {
    const amount = parseFloat(newAmount) || 0;
    setPendingEdits(prev => new Map(prev).set(payoutKey, amount));
  };

  const exportPayouts = () => {
    const csvData = filteredVendors.flatMap(vendor => 
      vendor.campaigns.map(campaign => ({
        'Vendor': vendor.vendor_name,
        'Vendor Total Owed': vendor.total_owed.toFixed(2),
        'Campaign': campaign.campaign_name,
        'Amount Owed': campaign.amount_owed.toFixed(2),
        'Payment Status': campaign.payment_status,
        'Allocated Streams': campaign.allocated_streams.toLocaleString(),
        'Actual Streams': campaign.actual_streams.toLocaleString(),
        'Cost Per Stream': campaign.cost_per_stream.toFixed(4),
        'Campaign Completion': campaign.campaign_completion_date || '',
        'Payment Date': campaign.payment_date || ''
      }))
    );

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendor-payouts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Vendor payouts exported successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading vendor payouts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unpaid Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalUnpaidAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {allUnpaidCampaigns.length} campaigns
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors Awaiting Payment</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueVendorsWithUnpaidCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              Unique vendors with unpaid campaigns
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected for Payout</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedPayouts.size}</div>
            <p className="text-xs text-muted-foreground">
              Campaigns ready for processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Payouts</CardTitle>
          <CardDescription>
            Manage vendor payments for completed campaigns. Select campaigns to process Friday payouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors or campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'paid' | 'unpaid') => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="unpaid">Unpaid Only</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportPayouts} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedPayouts.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedPayouts.size} campaigns selected
              </span>
              <Button 
                onClick={handleBulkMarkPaid} 
                disabled={bulkMarkPayoutsPaid.isPending}
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All as Paid
              </Button>
            </div>
          )}

          {/* Payouts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedPayouts.size === allUnpaidCampaigns.length && allUnpaidCampaigns.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Vendor / Campaign</TableHead>
                  <TableHead>Amount Owed</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Streams</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => {
                  const isExpanded = expandedVendors.has(vendor.vendor_id);
                  const unpaidCampaigns = vendor.campaigns.filter(c => c.payment_status === 'unpaid');
                  const selectedUnpaidCampaigns = unpaidCampaigns.filter(c => 
                    selectedPayouts.has(`${c.campaign_id}-${c.vendor_id}`)
                  );
                  const allUnpaidSelected = unpaidCampaigns.length > 0 && selectedUnpaidCampaigns.length === unpaidCampaigns.length;
                  
                  return (
                    <>
                      {/* Vendor Header Row */}
                      <TableRow key={vendor.vendor_id} className="bg-muted/50 border-b-2">
                        <TableCell>
                          {unpaidCampaigns.length > 0 && (
                            <Checkbox
                              checked={allUnpaidSelected}
                              onCheckedChange={(checked) => handleSelectVendor(vendor.vendor_id, checked as boolean)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVendorExpanded(vendor.vendor_id)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-bold text-lg">
                          {vendor.vendor_name}
                          <div className="text-sm text-muted-foreground font-normal">
                            {vendor.campaigns.length} campaigns
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-lg text-primary">
                            ${vendor.total_owed.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total owed
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-lg text-green-600">
                            ${(vendor.amount_paid || 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Amount paid
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{vendor.campaigns.reduce((sum, c) => sum + c.actual_streams, 0).toLocaleString()} total</div>
                            <div className="text-muted-foreground text-xs">
                              across all campaigns
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {unpaidCampaigns.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-2 h-2 mr-1" />
                                {unpaidCampaigns.length} unpaid
                              </Badge>
                            )}
                            {vendor.campaigns.filter(c => c.payment_status === 'paid').length > 0 && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="w-2 h-2 mr-1" />
                                {vendor.campaigns.filter(c => c.payment_status === 'paid').length} paid
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell>
                          {unpaidCampaigns.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelectVendor(vendor.vendor_id, !allUnpaidSelected)}
                            >
                              {allUnpaidSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Campaign Detail Rows */}
                      {isExpanded && vendor.campaigns.map((campaign) => {
                        const payoutKey = `${campaign.campaign_id}-${campaign.vendor_id}`;
                        const isSelected = selectedPayouts.has(payoutKey);
                        
                        return (
                          <TableRow key={payoutKey} className="bg-background">
                            <TableCell className="pl-8">
                              {campaign.payment_status === 'unpaid' && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleSelectPayout(payoutKey, checked as boolean)}
                                />
                              )}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell className="pl-8 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-4 bg-muted rounded-full"></div>
                                {campaign.campaign_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {editingPayouts.has(payoutKey) ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={pendingEdits.get(payoutKey) || 0}
                                    onChange={(e) => handleAmountChange(payoutKey, e.target.value)}
                                    className="w-24 h-8"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSaveAmount(payoutKey)}
                                  >
                                    <Save className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCancelEdit(payoutKey)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>${(pendingEdits.get(payoutKey) || campaign.amount_owed).toFixed(2)}</span>
                                  {campaign.payment_status === 'unpaid' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditAmount(payoutKey, campaign.amount_owed)}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-green-600 font-medium">
                                {campaign.payment_status === 'paid' ? `$${campaign.amount_owed.toFixed(2)}` : '$0.00'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{campaign.actual_streams.toLocaleString()} actual</div>
                                <div className="text-muted-foreground text-xs">
                                  {campaign.allocated_streams.toLocaleString()} allocated
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={campaign.payment_status === 'paid' ? 'default' : 'outline'}>
                                {campaign.payment_status === 'paid' ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    Unpaid
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {campaign.campaign_completion_date}
                            </TableCell>
                            <TableCell>
                              {campaign.payment_status === 'unpaid' ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const editedAmount = pendingEdits.get(payoutKey);
                                    const finalAmount = editedAmount !== undefined ? editedAmount : campaign.amount_owed;
                                    markPayoutPaid.mutate({
                                      campaignId: campaign.campaign_id,
                                      vendorId: campaign.vendor_id,
                                      amount: finalAmount,
                                      markAsPaid: true
                                    });
                                    setPendingEdits(prev => {
                                      const newMap = new Map(prev);
                                      newMap.delete(payoutKey);
                                      return newMap;
                                    });
                                  }}
                                  disabled={markPayoutPaid.isPending}
                                >
                                  Mark Paid
                                </Button>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {campaign.payment_date && (
                                    <div className="text-xs text-muted-foreground">
                                      Paid on {campaign.payment_date}
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      markPayoutPaid.mutate({
                                        campaignId: campaign.campaign_id,
                                        vendorId: campaign.vendor_id,
                                        amount: campaign.amount_owed,
                                        markAsPaid: false
                                      });
                                    }}
                                    disabled={markPayoutPaid.isPending}
                                  >
                                    Mark Unpaid
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredVendors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No vendor payouts found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}









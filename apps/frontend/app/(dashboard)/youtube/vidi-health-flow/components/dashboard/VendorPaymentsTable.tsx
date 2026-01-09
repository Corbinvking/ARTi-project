import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { SERVICE_TYPES } from "../../lib/constants";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calculator,
  Download,
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Calendar,
  History,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { usePaymentNotifications } from "../../hooks/usePaymentNotifications";
import { calculateVendorPayment, formatCurrency, exportVendorPayments, type VendorPaymentResult } from "../../lib/vendorPaymentCalculator";
import { WeeklySummary } from "./WeeklySummary";
import { PaymentAnalyticsDashboard } from "./PaymentAnalyticsDashboard";
import { PaymentHistoryTracker } from "./PaymentHistoryTracker";
import { PaymentAuditLog } from "./PaymentAuditLog";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

import type { Database } from "../../integrations/supabase/types";
type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

type SortField = 'campaign_name' | 'service_type' | 'current_views' | 'sale_price' | 'vendor_cost' | 'vendor_paid';
type SortDirection = 'asc' | 'desc';

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};

export const VendorPaymentsTable = () => {
  const { campaigns, loading, updateCampaign, refreshData } = useCampaigns();
  const { toast } = useToast();
  const { sendBulkPaymentProcessed, triggerAutomatedCalculation } = usePaymentNotifications();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState<SortField>('campaign_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [vendorPayments, setVendorPayments] = useState<Map<string, VendorPaymentResult>>(new Map());
  const [calculatingPayments, setCalculatingPayments] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'summary' | 'analytics' | 'history' | 'audit'>('summary');
  const [editingCustomCost, setEditingCustomCost] = useState<string | null>(null);
  const [customCostValue, setCustomCostValue] = useState<string>('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleVendorPaidChange = async (campaignId: string, paid: boolean) => {
    try {
      const { error } = await updateCampaign(campaignId, { vendor_paid: paid });
      
      if (error) throw error;
      
      toast({
        title: paid ? "Payment Marked as Paid" : "Payment Marked as Unpaid",
        description: `Vendor payment status updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating vendor payment status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkVendorPaidChange = async (paid: boolean) => {
    try {
      const promises = selectedCampaigns.map(campaignId => 
        updateCampaign(campaignId, { vendor_paid: paid })
      );
      
      const results = await Promise.allSettled(promises);
      
      // Count successes and failures
      const successCount = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
      const failureCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)).length;
      
      // Send notification for bulk payment processing
      if (paid && successCount > 0) {
        const totalAmount = selectedCampaigns.reduce((total, campaignId) => {
          const payment = vendorPayments.get(campaignId);
          return total + (payment?.total_cost || 0);
        }, 0);
        
        try {
          await sendBulkPaymentProcessed(selectedCampaigns, totalAmount);
        } catch (error) {
          console.error('Failed to send bulk payment notification:', error);
        }
      }
      
      // Show result toast
      if (failureCount === 0) {
        toast({
          title: "Bulk Update Complete",
          description: `Successfully updated ${successCount} campaign payment status${successCount > 1 ? 'es' : ''}.`,
        });
      } else {
        toast({
          title: "Bulk Update Partial",
          description: `Updated ${successCount} campaigns. ${failureCount} failed.`,
          variant: failureCount > successCount ? "destructive" : "default",
        });
      }
      
      setSelectedCampaigns([]);
    } catch (error) {
      console.error('Error in bulk vendor payment update:', error);
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update payment statuses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(filteredAndSortedCampaigns.map(c => c.id));
    } else {
      setSelectedCampaigns([]);
    }
  };

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(prev => [...prev, campaignId]);
    } else {
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId));
    }
  };

  const calculateSinglePayment = async (campaignId: string) => {
    setCalculatingPayments(prev => new Set(prev).add(campaignId));
    try {
      // Find campaign data to avoid re-fetching
      const campaignData = campaigns.find(c => c.id === campaignId);
      const result = await calculateVendorPayment(campaignId, campaignData);
      setVendorPayments(prev => new Map(prev).set(campaignId, result));
      if (result.error) {
        toast({
          title: "Calculation Warning",
          description: `Payment calculated with issues: ${result.error}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Calculation Complete",
          description: `Vendor payment calculated: ${formatCurrency(result.total_cost)}`,
        });
      }
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Failed to calculate vendor payment",
        variant: "destructive",
      });
    } finally {
      setCalculatingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  const calculateAllPayments = async () => {
    const campaignsToCalculate = filteredAndSortedCampaigns;
    const campaignIds = campaignsToCalculate.map(c => c.id);
    setCalculatingPayments(new Set(campaignIds));
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
      // Pass campaign data directly to avoid re-fetching each one
      const results = await Promise.allSettled(
        campaignsToCalculate.map(campaign => calculateVendorPayment(campaign.id, campaign))
      );
      
      const paymentMap = new Map();
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          paymentMap.set(campaignIds[index], result.value);
          if (result.value.error) {
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          errorCount++;
          paymentMap.set(campaignIds[index], {
            total_cost: 0,
            breakdown: [],
            campaign_id: campaignIds[index],
            error: 'Calculation failed'
          });
        }
      });
      
      setVendorPayments(paymentMap);
      toast({
        title: "Batch Calculation Complete",
        description: `Success: ${successCount}, Errors: ${errorCount}`,
        variant: errorCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Failed to calculate vendor payments",
        variant: "destructive",
      });
    } finally {
      setCalculatingPayments(new Set());
    }
  };

  const handleExportPayments = () => {
    exportVendorPayments(filteredAndSortedCampaigns, vendorPayments);
    toast({
      title: "Export Complete",
      description: "Vendor payments exported successfully",
    });
  };

  const toggleRowExpansion = (campaignId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const startEditingCustomCost = (campaignId: string, currentCost?: number) => {
    setEditingCustomCost(campaignId);
    setCustomCostValue(currentCost ? currentCost.toString() : '');
  };

  const cancelEditingCustomCost = () => {
    setEditingCustomCost(null);
    setCustomCostValue('');
  };

  const saveCustomCost = async (campaignId: string) => {
    try {
      const customCost = parseFloat(customCostValue);
      if (isNaN(customCost) || customCost < 0) {
        toast({
          title: "Invalid Cost",
          description: "Please enter a valid positive number",
          variant: "destructive",
        });
        return;
      }

      const { error } = await updateCampaign(campaignId, { 
        custom_vendor_cost: customCost 
      });
      
      if (error) throw error;
      
      // Update the vendor payments map with the custom cost
      setVendorPayments(prev => {
        const newMap = new Map(prev);
        newMap.set(campaignId, {
          total_cost: customCost,
          breakdown: [{
            service_type: 'custom' as any,
            views: 0,
            rate_per_1k: 0,
            cost: customCost
          }],
          campaign_id: campaignId,
          isCustomCost: true
        });
        return newMap;
      });
      
      toast({
        title: "Custom Cost Saved",
        description: `Vendor cost set to ${formatCurrency(customCost)}`,
      });
      
      setEditingCustomCost(null);
      setCustomCostValue('');
    } catch (error) {
      console.error('Error saving custom cost:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save custom cost. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearCustomCost = async (campaignId: string) => {
    try {
      const { error } = await updateCampaign(campaignId, { 
        custom_vendor_cost: null 
      });
      
      if (error) throw error;
      
      // Clear from vendor payments so it can be recalculated
      setVendorPayments(prev => {
        const newMap = new Map(prev);
        newMap.delete(campaignId);
        return newMap;
      });
      
      toast({
        title: "Custom Cost Cleared",
        description: "Vendor cost will be calculated automatically",
      });
    } catch (error) {
      console.error('Error clearing custom cost:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear custom cost. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Auto-calculate payments when campaigns load
  // Uses cached campaign data, no additional database calls
  useEffect(() => {
    const calculatePaymentsInBatches = async () => {
      if (campaigns.length === 0) return;
      
      // Only calculate for campaigns we haven't calculated yet
      const campaignsToCalculate = campaigns.filter(c => !vendorPayments.has(c.id));
      if (campaignsToCalculate.length === 0) return;
      
      // Process in batches of 50 to avoid UI freezing
      const batchSize = 50;
      const newPayments = new Map(vendorPayments);
      
      for (let i = 0; i < campaignsToCalculate.length; i += batchSize) {
        const batch = campaignsToCalculate.slice(i, i + batchSize);
        
        const results = await Promise.all(
          batch.map(campaign => calculateVendorPayment(campaign.id, campaign))
        );
        
        results.forEach((result, index) => {
          newPayments.set(batch[index].id, result);
        });
        
        // Update state after each batch for progressive loading
        setVendorPayments(new Map(newPayments));
      }
    };
    
    calculatePaymentsInBatches();
  }, [campaigns]);

  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns.filter(campaign => {
      // Search filter
      const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Vendor payment filter
      switch (filterType) {
        case 'paid':
          return campaign.vendor_paid === true;
        case 'unpaid':
          return campaign.vendor_paid === false;
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'campaign_name':
          aValue = a.campaign_name.toLowerCase();
          bValue = b.campaign_name.toLowerCase();
          break;
        case 'service_type':
          const aServiceType = SERVICE_TYPES.find(type => type.value === a.service_type)?.label || a.custom_service_type || '';
          const bServiceType = SERVICE_TYPES.find(type => type.value === b.service_type)?.label || b.custom_service_type || '';
          aValue = aServiceType.toLowerCase();
          bValue = bServiceType.toLowerCase();
          break;
        case 'current_views':
          aValue = a.current_views || 0;
          bValue = b.current_views || 0;
          break;
        case 'sale_price':
          aValue = a.sale_price || 0;
          bValue = b.sale_price || 0;
          break;
        case 'vendor_cost':
          const aPayment = vendorPayments.get(a.id);
          const bPayment = vendorPayments.get(b.id);
          aValue = aPayment?.total_cost || 0;
          bValue = bPayment?.total_cost || 0;
          break;
        case 'vendor_paid':
          aValue = a.vendor_paid ? 1 : 0;
          bValue = b.vendor_paid ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [campaigns, searchTerm, filterType, sortField, sortDirection]);

  const allSelected = selectedCampaigns.length === filteredAndSortedCampaigns.length && filteredAndSortedCampaigns.length > 0;
  const someSelected = selectedCampaigns.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading vendor payments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: 'summary', label: 'Weekly Summary', icon: DollarSign },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'history', label: 'Payment History', icon: Calendar },
          { id: 'audit', label: 'Audit Log', icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        onCalculateAll={calculateAllPayments}
        onExport={handleExportPayments}
        onRefresh={refreshData}
        onMarkAllPaid={() => {
          const unpaidCampaigns = filteredAndSortedCampaigns.filter(c => !c.vendor_paid);
          if (unpaidCampaigns.length > 0) {
            handleBulkVendorPaidChange(true);
          }
        }}
        selectedCount={selectedCampaigns.length}
        onBulkMarkPaid={() => handleBulkVendorPaidChange(true)}
        onBulkMarkUnpaid={() => handleBulkVendorPaidChange(false)}
      />

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <WeeklySummary 
          campaigns={campaigns}
          vendorPayments={vendorPayments}
          onBulkMarkPaid={handleBulkVendorPaidChange.bind(null, true)}
        />
      )}
      
      {activeTab === 'analytics' && (
        <PaymentAnalyticsDashboard 
          campaigns={campaigns}
          vendorPayments={vendorPayments}
        />
      )}
      
      {activeTab === 'history' && (
        <>
          <PaymentHistoryTracker campaigns={campaigns} />
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Vendor Payments
            </div>
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                variant="outline"
                onClick={calculateAllPayments}
                disabled={calculatingPayments.size > 0}
              >
                <Calculator className="w-4 h-4 mr-2" />
                {calculatingPayments.size > 0 ? 'Calculating...' : 'Calculate All'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPayments}
                disabled={vendorPayments.size === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {someSelected && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkVendorPaidChange(true)}
                  >
                    Mark Selected as Paid
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkVendorPaidChange(false)}
                  >
                    Mark Selected as Unpaid
                  </Button>
                </div>
              )}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectItem value="paid">Paid Campaigns</SelectItem>
                  <SelectItem value="unpaid">Unpaid Campaigns</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all campaigns"
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('campaign_name')}
                >
                  <div className="flex items-center gap-2">
                    Campaign Name
                    {getSortIcon('campaign_name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('service_type')}
                >
                  <div className="flex items-center gap-2">
                    Service Type
                    {getSortIcon('service_type')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('current_views')}
                >
                  <div className="flex items-center gap-2">
                    View Count
                    {getSortIcon('current_views')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('sale_price')}
                >
                  <div className="flex items-center gap-2">
                    Price Paid
                    {getSortIcon('sale_price')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('vendor_cost')}
                >
                  <div className="flex items-center gap-2">
                    Vendor Cost
                    {getSortIcon('vendor_cost')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('vendor_paid')}
                >
                  <div className="flex items-center gap-2">
                    Vendor Paid 
                    {getSortIcon('vendor_paid')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCampaigns.map((campaign) => {
                const serviceTypeLabel = SERVICE_TYPES.find(type => type.value === campaign.service_type)?.label || 
                  campaign.custom_service_type || 'Unknown';

                return (
                <>
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedCampaigns.includes(campaign.id)}
                        onCheckedChange={(checked) => handleSelectCampaign(campaign.id, !!checked)}
                        aria-label={`Select ${campaign.campaign_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRowExpansion(campaign.id)}
                          className="p-0 h-6 w-6"
                        >
                          {expandedRows.has(campaign.id) ? 
                            <ChevronDown className="w-4 h-4" /> : 
                            <ChevronRight className="w-4 h-4" />
                          }
                        </Button>
                        <div>
                          <div className="font-medium">{campaign.campaign_name}</div>
                          <div className="text-sm text-muted-foreground">{campaign.genre || 'No genre'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{serviceTypeLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono">
                        {formatNumber(campaign.current_views || 0)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono">
                        ${(campaign.sale_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {editingCustomCost === campaign.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={customCostValue}
                              onChange={(e) => setCustomCostValue(e.target.value)}
                              className="w-24 h-8 text-sm"
                              placeholder="0.00"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCustomCost(campaign.id);
                                if (e.key === 'Escape') cancelEditingCustomCost();
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => saveCustomCost(campaign.id)}
                            >
                              <Save className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={cancelEditingCustomCost}
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : calculatingPayments.has(campaign.id) ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-sm text-muted-foreground">Calculating...</span>
                          </div>
                        ) : (
                          <div className="font-mono flex items-center gap-1">
                            {vendorPayments.get(campaign.id) ? (
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                  <span>{formatCurrency(vendorPayments.get(campaign.id)!.total_cost)}</span>
                                  {vendorPayments.get(campaign.id)!.isCustomCost && (
                                    <span className="text-xs text-blue-500">(Custom)</span>
                                  )}
                                  {vendorPayments.get(campaign.id)!.error && (
                                    <span className="text-xs text-red-500">Error: {vendorPayments.get(campaign.id)!.error}</span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => startEditingCustomCost(campaign.id, vendorPayments.get(campaign.id)?.total_cost)}
                                  title="Set custom cost"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">$0.00</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => calculateSinglePayment(campaign.id)}
                                  title="Calculate cost"
                                >
                                  <Calculator className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => startEditingCustomCost(campaign.id)}
                                  title="Set custom cost"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={campaign.vendor_paid || false}
                        onCheckedChange={(checked) => handleVendorPaidChange(campaign.id, !!checked)}
                        aria-label={`Mark vendor paid for ${campaign.campaign_name}`}
                      />
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Row Details */}
                  {expandedRows.has(campaign.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30">
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Payment Breakdown</h4>
                            <div className="flex items-center gap-2">
                              {vendorPayments.get(campaign.id)?.isCustomCost && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => clearCustomCost(campaign.id)}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Clear Custom Cost
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingCustomCost(campaign.id, vendorPayments.get(campaign.id)?.total_cost)}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Set Custom Cost
                              </Button>
                            </div>
                          </div>
                          
                          {vendorPayments.get(campaign.id)?.isCustomCost ? (
                            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  Custom Cost
                                </Badge>
                              </div>
                              <div className="text-2xl font-bold">
                                {formatCurrency(vendorPayments.get(campaign.id)!.total_cost)}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                This is a manually set vendor cost. Click "Clear Custom Cost" to calculate automatically.
                              </div>
                            </div>
                          ) : vendorPayments.get(campaign.id)?.breakdown && vendorPayments.get(campaign.id)!.breakdown.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {vendorPayments.get(campaign.id)!.breakdown.map((breakdown, index) => (
                                <div key={index} className="bg-background p-3 rounded-lg border">
                                  <div className="flex justify-between items-center mb-2">
                                    <Badge variant="secondary">{breakdown.service_type}</Badge>
                                    <span className="font-bold">{formatCurrency(breakdown.cost)}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div>Views: {breakdown.views.toLocaleString()}</div>
                                    <div>Rate: ${breakdown.rate_per_1k.toFixed(4)}/1K</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No detailed breakdown available. Click "Calculate" or "Set Custom Cost" to add vendor cost.
                              {vendorPayments.get(campaign.id)?.error && (
                                <span className="text-red-500"> Error: {vendorPayments.get(campaign.id)!.error}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </>
      )}
      
      {activeTab === 'audit' && (
        <PaymentAuditLog />
      )}
    </div>
  );
};
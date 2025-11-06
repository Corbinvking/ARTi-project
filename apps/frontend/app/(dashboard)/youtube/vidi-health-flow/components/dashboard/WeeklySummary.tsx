import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CalendarIcon, DollarSign, Download, Check, Filter, X } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { formatCurrency, exportVendorPayments, type VendorPaymentResult } from "../../lib/vendorPaymentCalculator";
import { SERVICE_TYPES } from "../../lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

interface AdvancedFilters {
  dateRange: {
    start: string;
    end: string;
  };
  paymentRange: {
    min: number;
    max: number;
  };
  serviceTypes: string[];
  paymentStatus: 'all' | 'paid' | 'unpaid';
  campaignStatus: string[];
  clientSearch: string;
}

interface WeeklySummaryProps {
  campaigns: Campaign[];
  vendorPayments: Map<string, VendorPaymentResult>;
  onBulkMarkPaid: (campaignIds: string[]) => void;
}

export const WeeklySummary = ({ campaigns, vendorPayments, onBulkMarkPaid }: WeeklySummaryProps) => {
  const { toast } = useToast();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({
    dateRange: {
      start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
      end: format(endOfWeek(new Date()), 'yyyy-MM-dd')
    },
    paymentRange: {
      min: 0,
      max: 10000
    },
    serviceTypes: [],
    paymentStatus: 'all',
    campaignStatus: [],
    clientSearch: ''
  });

  // Calculate max payment for slider
  const maxPayment = useMemo(() => {
    return Math.max(...campaigns.map(c => {
      const payment = vendorPayments.get(c.id);
      return payment?.total_cost || 0;
    }), 1000);
  }, [campaigns, vendorPayments]);

  const filteredData = useMemo(() => {
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    
    // Apply all filters
    const filteredCampaigns = campaigns.filter(campaign => {
      const campaignDate = new Date(campaign.created_at);
      const payment = vendorPayments.get(campaign.id);
      const paymentAmount = payment?.total_cost || 0;

      // Date range filter
      if (campaignDate < startDate || campaignDate > endDate) return false;

      // Payment amount filter
      if (paymentAmount < filters.paymentRange.min || paymentAmount > filters.paymentRange.max) return false;

      // Service type filter
      if (filters.serviceTypes.length > 0 && !filters.serviceTypes.includes(campaign.service_type || '')) return false;

      // Payment status filter
      if (filters.paymentStatus === 'paid' && !campaign.vendor_paid) return false;
      if (filters.paymentStatus === 'unpaid' && campaign.vendor_paid) return false;

      // Campaign status filter
      if (filters.campaignStatus.length > 0 && !filters.campaignStatus.includes(campaign.status || '')) return false;

      // Client search filter
      if (filters.clientSearch && !campaign.clients?.name.toLowerCase().includes(filters.clientSearch.toLowerCase())) return false;

      return true;
    });

    const unpaidCampaigns = filteredCampaigns.filter(c => !c.vendor_paid);
    const paidCampaigns = filteredCampaigns.filter(c => c.vendor_paid);

    const unpaidTotal = unpaidCampaigns.reduce((total, campaign) => {
      const payment = vendorPayments.get(campaign.id);
      return total + (payment?.total_cost || 0);
    }, 0);

    const paidTotal = paidCampaigns.reduce((total, campaign) => {
      const payment = vendorPayments.get(campaign.id);
      return total + (payment?.total_cost || 0);
    }, 0);

    const totalCost = unpaidTotal + paidTotal;

    return {
      filteredCampaigns,
      unpaidCampaigns,
      paidCampaigns,
      unpaidTotal,
      paidTotal,
      totalCost,
      campaignCount: filteredCampaigns.length
    };
  }, [campaigns, vendorPayments, filters]);

  const handleSetThisWeek = () => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
        end: format(endOfWeek(new Date()), 'yyyy-MM-dd')
      }
    }));
  };

  const handleSetLastWeek = () => {
    const lastWeek = subDays(new Date(), 7);
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: format(startOfWeek(lastWeek), 'yyyy-MM-dd'),
        end: format(endOfWeek(lastWeek), 'yyyy-MM-dd')
      }
    }));
  };

  const handleMarkAllUnpaidAsPaid = () => {
    if (filteredData.unpaidCampaigns.length === 0) return;
    
    onBulkMarkPaid(filteredData.unpaidCampaigns.map(c => c.id));
    toast({
      title: "Payments Marked",
      description: `Marked ${filteredData.unpaidCampaigns.length} campaigns as paid`,
    });
  };

  const handleExportWeeklyReport = () => {
    exportVendorPayments(filteredData.filteredCampaigns, vendorPayments);
    toast({
      title: "Export Complete",
      description: `Report exported for ${filteredData.campaignCount} filtered campaigns`,
    });
  };

  const resetFilters = () => {
    setFilters({
      dateRange: {
        start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
        end: format(endOfWeek(new Date()), 'yyyy-MM-dd')
      },
      paymentRange: {
        min: 0,
        max: maxPayment
      },
      serviceTypes: [],
      paymentStatus: 'all',
      campaignStatus: [],
      clientSearch: ''
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.serviceTypes.length > 0) count++;
    if (filters.paymentStatus !== 'all') count++;
    if (filters.campaignStatus.length > 0) count++;
    if (filters.clientSearch) count++;
    if (filters.paymentRange.min > 0 || filters.paymentRange.max < maxPayment) count++;
    return count;
  }, [filters, maxPayment]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Weekly Payment Summary
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Date Range Selector */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-xs">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-xs">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-40"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={handleSetThisWeek}>
                This Week
              </Button>
              <Button size="sm" variant="outline" onClick={handleSetLastWeek}>
                Last Week
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Payment Amount Range */}
                <div className="space-y-2">
                  <Label>Payment Amount Range</Label>
                  <div className="px-2">
                    <Slider
                      value={[filters.paymentRange.min, filters.paymentRange.max]}
                      onValueChange={([min, max]) => setFilters(prev => ({
                        ...prev,
                        paymentRange: { min, max }
                      }))}
                      max={maxPayment}
                      min={0}
                      step={100}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(filters.paymentRange.min)}</span>
                    <span>{formatCurrency(filters.paymentRange.max)}</span>
                  </div>
                </div>

                {/* Service Types */}
                <div className="space-y-2">
                  <Label>Service Types</Label>
                  <Select
                    value={filters.serviceTypes.length > 0 ? filters.serviceTypes.join(',') : 'all'}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      serviceTypes: value === 'all' ? [] : [value]
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All service types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All service types</SelectItem>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Status */}
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select
                    value={filters.paymentStatus}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      paymentStatus: value as 'all' | 'paid' | 'unpaid'
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid Only</SelectItem>
                      <SelectItem value="unpaid">Unpaid Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Client Search */}
                <div className="space-y-2">
                  <Label>Client Search</Label>
                  <Input
                    placeholder="Search by client name..."
                    value={filters.clientSearch}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      clientSearch: e.target.value
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{filteredData.campaignCount}</div>
              <div className="text-sm text-muted-foreground">Filtered Campaigns</div>
              {activeFiltersCount > 0 && (
                <Badge variant="outline" className="mt-1">
                  {campaigns.length} total
                </Badge>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(filteredData.unpaidTotal)}</div>
              <div className="text-sm text-muted-foreground">Unpaid Amount</div>
              <Badge variant="destructive" className="mt-1">
                {filteredData.unpaidCampaigns.length} campaigns
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(filteredData.paidTotal)}</div>
              <div className="text-sm text-muted-foreground">Paid Amount</div>
              <Badge variant="secondary" className="mt-1">
                {filteredData.paidCampaigns.length} campaigns
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{formatCurrency(filteredData.totalCost)}</div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button
            onClick={handleMarkAllUnpaidAsPaid}
            disabled={filteredData.unpaidCampaigns.length === 0}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Mark All Unpaid as Paid
            {filteredData.unpaidCampaigns.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredData.unpaidCampaigns.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportWeeklyReport}
            disabled={filteredData.campaignCount === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Filtered Report
          </Button>
        </div>

        {/* Wire Transfer Note */}
        {filteredData.unpaidTotal > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <CalendarIcon className="w-4 h-4" />
              <span className="font-medium">Friday Wire Transfer</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Total amount to wire this Friday: <span className="font-bold">{formatCurrency(filteredData.unpaidTotal)}</span>
              {activeFiltersCount > 0 && (
                <span className="text-xs block mt-1">
                  (Filtered view - check full data for complete amount)
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, History, Download } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "../../lib/vendorPaymentCalculator";
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

interface PaymentHistory {
  campaign_id: string;
  campaign_name: string;
  vendor_cost: number;
  payment_date: string;
  marked_by?: string;
}

interface PaymentHistoryTrackerProps {
  campaigns: Campaign[];
}

export const PaymentHistoryTracker = ({ campaigns }: PaymentHistoryTrackerProps) => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentHistory();
  }, [dateFilter, campaigns]);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      // Since we don't have a payment_history table, we'll simulate it
      // by looking at campaigns that have been marked as paid
      const paidCampaigns = campaigns.filter(c => c.vendor_paid);
      
      const history: PaymentHistory[] = paidCampaigns.map(campaign => ({
        campaign_id: campaign.id,
        campaign_name: campaign.campaign_name,
        vendor_cost: campaign.calculated_vendor_payment || 0,
        payment_date: campaign.updated_at,
        marked_by: 'System' // We could track this better with user info
      }));

      setPaymentHistory(history);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: "Error",
        description: "Failed to load payment history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPaymentHistory = () => {
    const csvData = [
      ['Campaign Name', 'Payment Date', 'Vendor Cost', 'Marked By']
    ];

    const filteredHistory = paymentHistory.filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      const startDate = new Date(dateFilter.start);
      const endDate = new Date(dateFilter.end);
      return paymentDate >= startDate && paymentDate <= endDate;
    });

    filteredHistory.forEach(payment => {
      csvData.push([
        payment.campaign_name,
        format(new Date(payment.payment_date), 'MMM d, yyyy'),
        formatCurrency(payment.vendor_cost),
        payment.marked_by || 'Unknown'
      ]);
    });

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-history-${dateFilter.start}-to-${dateFilter.end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Payment history exported successfully",
    });
  };

  const filteredHistory = paymentHistory.filter(payment => {
    const paymentDate = new Date(payment.payment_date);
    const startDate = new Date(dateFilter.start);
    const endDate = new Date(dateFilter.end);
    return paymentDate >= startDate && paymentDate <= endDate;
  });

  const totalPaid = filteredHistory.reduce((sum, payment) => sum + payment.vendor_cost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Payment History
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={exportPaymentHistory}
            disabled={filteredHistory.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export History
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Filter */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Calendar className="w-4 h-4" />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="history-start-date" className="text-xs">From</Label>
              <Input
                id="history-start-date"
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="history-end-date" className="text-xs">To</Label>
              <Input
                id="history-end-date"
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                className="w-40"
              />
            </div>
          </div>
          <div className="ml-auto">
            <div className="text-right">
              <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <Badge variant="secondary" className="mt-1">
                {filteredHistory.length} payments
              </Badge>
            </div>
          </div>
        </div>

        {/* Payment History Table */}
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading payment history...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No payment history found for the selected date range
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Vendor Cost</TableHead>
                <TableHead>Marked By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((payment) => (
                <TableRow key={payment.campaign_id}>
                  <TableCell className="font-medium">
                    {payment.campaign_name}
                  </TableCell>
                  <TableCell>
                    {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(payment.vendor_cost)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {payment.marked_by || 'Unknown'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
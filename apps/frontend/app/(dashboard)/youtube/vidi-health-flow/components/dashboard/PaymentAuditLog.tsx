import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, User, Bot, DollarSign, Calendar, Search, Calculator } from "lucide-react";
import { format, subDays } from "date-fns";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "../../lib/vendorPaymentCalculator";

interface AuditLogEntry {
  id: string;
  campaign_id: string;
  action: string;
  old_value: any;
  new_value: any;
  user_id: string | null;
  automated: boolean;
  created_at: string;
  campaigns?: {
    campaign_name: string;
  } | null;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export const PaymentAuditLog = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [actionFilter, setActionFilter] = useState('all');
  const [campaignSearch, setCampaignSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, [dateFilter, actionFilter, campaignSearch]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // First get audit logs
      let query = supabase
        .from('payment_audit_log')
        .select('*')
        .gte('created_at', `${dateFilter.start}T00:00:00`)
        .lte('created_at', `${dateFilter.end}T23:59:59`)
        .order('created_at', { ascending: false });

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data: auditData, error } = await query.limit(100);
      if (error) throw error;

      if (!auditData || auditData.length === 0) {
        setAuditLogs([]);
        return;
      }

      // Get unique campaign IDs and user IDs
      const campaignIds = [...new Set(auditData.map(log => log.campaign_id))];
      const userIds = [...new Set(auditData.map(log => log.user_id).filter(Boolean))];

      // Fetch campaign names
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('id, campaign_name')
        .in('id', campaignIds);

      // Fetch user profiles
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      // Combine data
      const enrichedLogs = auditData.map(log => ({
        ...log,
        campaigns: campaignData?.find(c => c.id === log.campaign_id) || null,
        user_profiles: userProfiles?.find(u => u.id === log.user_id) || null
      }));

      // Apply campaign search filter if needed
      const filteredLogs = campaignSearch
        ? enrichedLogs.filter(log => 
            log.campaigns?.campaign_name?.toLowerCase().includes(campaignSearch.toLowerCase())
          )
        : enrichedLogs;

      setAuditLogs(filteredLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load payment audit logs",
        variant: "destructive",
      });
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'marked_paid':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'marked_unpaid':
        return <DollarSign className="w-4 h-4 text-red-600" />;
      case 'calculation_updated':
        return <Calculator className="w-4 h-4 text-blue-600" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'marked_paid':
        return 'Marked as Paid';
      case 'marked_unpaid':
        return 'Marked as Unpaid';
      case 'calculation_updated':
        return 'Payment Calculated';
      default:
        return action;
    }
  };

  const formatValue = (value: any, action: string) => {
    if (!value) return 'N/A';
    
    if (action === 'calculation_updated' && value.calculated_vendor_payment !== undefined) {
      return formatCurrency(value.calculated_vendor_payment || 0);
    }
    
    if (action.includes('marked_') && value.vendor_paid !== undefined) {
      return value.vendor_paid ? 'Paid' : 'Unpaid';
    }
    
    return JSON.stringify(value);
  };

  const getUserDisplay = (entry: AuditLogEntry) => {
    if (entry.automated) {
      return (
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-600" />
          <span className="text-sm">Automated</span>
        </div>
      );
    }
    
    if (entry.user_profiles) {
      return (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-600" />
          <div className="text-sm">
            <div>{entry.user_profiles.first_name} {entry.user_profiles.last_name}</div>
            <div className="text-xs text-muted-foreground">{entry.user_profiles.email}</div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-gray-600" />
        <span className="text-sm">Unknown User</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Payment Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-1">
              <Input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                className="text-xs"
              />
              <Input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                className="text-xs"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="marked_paid">Marked as Paid</SelectItem>
                <SelectItem value="marked_unpaid">Marked as Unpaid</SelectItem>
                <SelectItem value="calculation_updated">Payment Calculated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Campaign Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Summary</Label>
            <div className="text-sm">
              <div className="font-medium">{auditLogs.length} entries</div>
              <div className="text-muted-foreground">
                {auditLogs.filter(log => log.automated).length} automated
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading audit logs...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No audit logs found for the selected criteria
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Previous Value</TableHead>
                <TableHead>New Value</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div>{format(new Date(entry.created_at), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-medium text-sm">
                      {entry.campaigns?.campaign_name || 'Unknown Campaign'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(entry.action)}
                      <Badge variant="outline">
                        {getActionLabel(entry.action)}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm font-mono">
                      {formatValue(entry.old_value, entry.action)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm font-mono">
                      {formatValue(entry.new_value, entry.action)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getUserDisplay(entry)}
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
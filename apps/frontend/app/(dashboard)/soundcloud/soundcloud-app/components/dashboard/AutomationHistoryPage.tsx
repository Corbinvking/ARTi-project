"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "../../hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import { useNotifications } from "../../hooks/useNotifications";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
  Send,
  XCircle,
  Filter,
  Calendar
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AutomationHealth {
  id: string;
  automation_name: string;
  status: string; // Changed from union type to string
  last_run_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  success_count: number;
  error_count: number;
  total_runs: number;
  created_at: string;
  updated_at: string;
}

interface EmailLog {
  id: string;
  template_name: string;
  recipient_email: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  resend_message_id: string | null;
  related_object_type: string | null;
  related_object_id: string | null;
  user_id: string | null;
  template_data: any;
  metadata: any;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  created_at: string;
  updated_at: string;
}

export const AutomationHistoryPage = () => {
  const { toast } = useToast();
  const { sendEmail } = useNotifications();
  const [automationHealth, setAutomationHealth] = useState<AutomationHealth[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAutomationHealth = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_health')
        .select('*')
        .order('automation_name');

      if (error) throw error;
      setAutomationHealth(data || []);
    } catch (error: any) {
      console.error('Error fetching automation health:', error);
      toast({
        title: "Error",
        description: "Failed to fetch automation health data",
        variant: "destructive",
      });
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching email logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email logs",
        variant: "destructive",
      });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchAutomationHealth(), fetchEmailLogs()]);
    setLoading(false);
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setTestEmailLoading(true);
    try {
      const response = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: testEmail,
          template: 'test',
          data: {
            firstName: 'Test User',
            testMessage: 'This is a test email from the automation system.'
          },
          testEmail: true,
          relatedObjectType: 'test',
          relatedObjectId: null
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Test email sent to ${testEmail}`,
        variant: "default",
      });

      // Refresh data to show the new log entry
      setTimeout(refreshData, 1000);
      setTestEmail("");
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'disabled':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'healthy': 'default',
      'warning': 'secondary',
      'error': 'destructive',
      'disabled': 'outline',
      'sent': 'default',
      'failed': 'destructive',
      'pending': 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const filteredEmailLogs = emailLogs.filter(log => {
    const matchesEmail = emailFilter === "" || 
      log.recipient_email.toLowerCase().includes(emailFilter.toLowerCase()) ||
      log.template_name.toLowerCase().includes(emailFilter.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    return matchesEmail && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading automation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automation History</h1>
          <p className="text-muted-foreground">Monitor email automations and system health</p>
        </div>
        <Button onClick={refreshData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList>
          <TabsTrigger value="health">Automation Health</TabsTrigger>
          <TabsTrigger value="history">Email History</TabsTrigger>
          <TabsTrigger value="test">Test Email</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {automationHealth.map((health) => (
              <Card key={health.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {health.automation_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </CardTitle>
                  {getStatusIcon(health.status)}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getStatusBadge(health.status)}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Success: {health.success_count} / {health.total_runs}</div>
                      <div>Errors: {health.error_count}</div>
                      {health.last_run_at && (
                        <div>Last run: {formatDistanceToNow(new Date(health.last_run_at))} ago</div>
                      )}
                      {health.last_error_message && (
                        <div className="text-red-500 mt-2 p-2 bg-red-50 rounded text-xs">
                          {health.last_error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email History
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Input
                    placeholder="Filter by email or template..."
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="w-64"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <CardDescription>
                Recent email automation history (latest 100 records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Related Object</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.template_name}
                        </TableCell>
                        <TableCell>
                          {log.recipient_email.length > 20 
                            ? `${log.recipient_email.substring(0, 20)}...`
                            : log.recipient_email
                          }
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell>
                          {log.subject ? (
                            log.subject.length > 30 
                              ? `${log.subject.substring(0, 30)}...`
                              : log.subject
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {log.sent_at ? (
                            <div className="space-y-1">
                              <div>{format(new Date(log.sent_at), 'MMM d, yyyy')}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(log.sent_at), 'HH:mm:ss')}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Created: {format(new Date(log.created_at), 'MMM d, HH:mm')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.related_object_type && (
                            <div className="text-xs">
                              <div>{log.related_object_type}</div>
                              {log.related_object_id && (
                                <div className="text-muted-foreground">
                                  {log.related_object_id.substring(0, 8)}...
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.error_message && (
                            <div className="text-xs text-red-500 max-w-[200px] truncate" title={log.error_message}>
                              {log.error_message}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredEmailLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No email logs found matching your filters.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Test Email System
              </CardTitle>
              <CardDescription>
                Send a test email to verify the automation system is working correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  type="email"
                  placeholder="Enter email address..."
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={sendTestEmail} 
                  disabled={testEmailLoading || !testEmail}
                  className="gap-2"
                >
                  {testEmailLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Test Email
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                This will send a test email and create an entry in the email logs for monitoring.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
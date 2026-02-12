import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  Users, 
  DollarSign, 
  Calendar,
  Zap,
  MoreHorizontal,
  FileText,
  TrendingUp
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { toast } from "../hooks/use-toast";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'destructive';
  action: () => void;
}

export const QuickActionsPanel = () => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch actionable items (separate queries - no JOIN)
  const { data: actionableItems = [], isLoading } = useQuery({
    queryKey: ['actionable-items'],
    queryFn: async () => {
      // First get active campaign IDs from instagram_campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('instagram_campaigns')
        .select('id')
        .eq('status', 'active');

      if (campaignsError) throw campaignsError;
      const activeCampaignIds = (campaigns || []).map(c => String(c.id));

      if (activeCampaignIds.length === 0) return [];

      const { data, error } = await supabase
        .from('instagram_campaign_creators')
        .select(`
          id,
          campaign_id,
          payment_status,
          post_status,
          approval_status,
          due_date,
          expected_post_date,
          rate
        `)
        .in('campaign_id', activeCampaignIds);

      if (error) throw error;
      return data || [];
    }
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: any }) => {
      const { error } = await supabase
        .from('instagram_campaign_creators')
        .update(updates)
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actionable-items'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-creators-health'] });
      toast({
        title: "Success",
        description: "Bulk update completed successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update items: " + error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(null);
    }
  });

  // Calculate action counts
  const actionCounts = {
    overduePayments: actionableItems.filter(item => 
      item.payment_status === 'unpaid' && 
      new Date(item.due_date) < new Date()
    ).length,

    pendingApprovals: actionableItems.filter(item => 
      item.approval_status === 'pending'
    ).length,

    missedPosts: actionableItems.filter(item => 
      item.post_status === 'not_posted' && 
      new Date(item.expected_post_date) < new Date()
    ).length,

    readyForPayment: actionableItems.filter(item => 
      item.post_status === 'posted' && 
      item.approval_status === 'approved' && 
      item.payment_status === 'unpaid'
    ).length,

    scheduledPosts: actionableItems.filter(item => 
      item.post_status === 'scheduled'
    ).length,

    completedTasks: actionableItems.filter(item => 
      item.payment_status === 'paid' && 
      item.post_status === 'posted' && 
      item.approval_status === 'approved'
    ).length
  };

  // Quick action handlers
  const handleBulkAction = async (actionType: string) => {
    setIsProcessing(actionType);
    let targetItems: any[] = [];
    let updates: any = {};

    switch (actionType) {
      case 'approve-posts':
        targetItems = actionableItems.filter(item => 
          item.post_status === 'posted' && item.approval_status === 'pending'
        );
        updates = { approval_status: 'approved' };
        break;

      case 'mark-payments-pending':
        targetItems = actionableItems.filter(item => 
          item.post_status === 'posted' && 
          item.approval_status === 'approved' && 
          item.payment_status === 'unpaid'
        );
        updates = { payment_status: 'pending' };
        break;

      case 'mark-overdue-follow-up':
        targetItems = actionableItems.filter(item => 
          item.post_status === 'not_posted' && 
          new Date(item.expected_post_date) < new Date()
        );
        // This would typically send notifications or update a follow-up status
        updates = { post_status: 'follow_up_sent' };
        break;

      default:
        return;
    }

    if (targetItems.length === 0) {
      toast({
        title: "No items to update",
        description: "No items match the criteria for this action"
      });
      setIsProcessing(null);
      return;
    }

    bulkUpdateMutation.mutate({
      ids: targetItems.map(item => item.id),
      updates
    });
  };

  const quickActions: QuickAction[] = [
    {
      id: 'process-payments',
      title: 'Process Overdue Payments',
      description: 'Mark overdue payments as processing',
      count: actionCounts.overduePayments,
      icon: <CreditCard className="h-4 w-4" />,
      color: 'destructive',
      action: () => handleBulkAction('mark-payments-pending')
    },
    {
      id: 'approve-posts',
      title: 'Approve Posted Content',
      description: 'Bulk approve posted content',
      count: actionCounts.pendingApprovals,
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'success',
      action: () => handleBulkAction('approve-posts')
    },
    {
      id: 'follow-up-posts',
      title: 'Follow Up Missing Posts',
      description: 'Send reminders for overdue posts',
      count: actionCounts.missedPosts,
      icon: <Clock className="h-4 w-4" />,
      color: 'warning',
      action: () => handleBulkAction('mark-overdue-follow-up')
    },
    {
      id: 'ready-payments',
      title: 'Ready for Payment',
      description: 'Approved posts awaiting payment',
      count: actionCounts.readyForPayment,
      icon: <DollarSign className="h-4 w-4" />,
      color: 'primary',
      action: () => handleBulkAction('mark-payments-pending')
    }
  ];

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
          <Badge variant="outline" className="ml-auto">
            {actionableItems.length} active items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quickActions.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`text-${action.color}`}>
                  {action.icon}
                </div>
                <div>
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={action.count > 0 ? 'default' : 'outline'}
                  className={action.count > 0 ? `bg-${action.color} text-${action.color}-foreground` : ''}
                >
                  {action.count}
                </Badge>
                {action.count > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={action.action}
                    disabled={isProcessing === action.id}
                    className="hover:bg-primary hover:text-primary-foreground"
                  >
                    {isProcessing === action.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      'Action'
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t border-border/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-success">
                {actionCounts.completedTasks}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-warning">
                {actionCounts.scheduledPosts}
              </div>
              <div className="text-xs text-muted-foreground">Scheduled</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">
                {((actionCounts.completedTasks / Math.max(actionableItems.length, 1)) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
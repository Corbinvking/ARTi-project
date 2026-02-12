import { useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { addDays, differenceInDays, isAfter, isBefore, format } from 'date-fns';

export interface WorkflowRule {
  id: string;
  name: string;
  trigger: {
    field: string;
    value: any;
    condition: 'equals' | 'changes_to' | 'date_threshold';
  };
  action: {
    field: string;
    value: any;
    condition?: string;
  };
  enabled: boolean;
}

export interface DeadlineAlert {
  id: string;
  type: 'warning' | 'critical' | 'overdue';
  title: string;
  message: string;
  daysUntil: number;
  creatorId: string;
  campaignId: string;
  creatorHandle: string;
  campaignName: string;
}

export const useWorkflowOrchestration = () => {
  const { toast } = useToast();

  // Built-in workflow rules
  const defaultWorkflowRules: WorkflowRule[] = [
    {
      id: 'payment-to-scheduled',
      name: 'Auto-schedule when paid',
      trigger: { field: 'payment_status', value: 'paid', condition: 'changes_to' },
      action: { field: 'post_status', value: 'scheduled', condition: 'due_within_7_days' },
      enabled: true
    },
    {
      id: 'posted-to-pending-approval',
      name: 'Auto-pending approval when posted',
      trigger: { field: 'post_status', value: 'posted', condition: 'changes_to' },
      action: { field: 'approval_status', value: 'pending' },
      enabled: true
    },
    {
      id: 'overdue-escalation',
      name: 'Escalate overdue items',
      trigger: { field: 'due_date', value: 0, condition: 'date_threshold' },
      action: { field: 'escalated', value: true },
      enabled: true
    }
  ];

  // Execute workflow rules for a creator update
  const executeWorkflowRules = useCallback(async (
    creatorId: string,
    updatedFields: Record<string, any>,
    currentCreator: any
  ) => {
    try {
      const rulesToExecute = defaultWorkflowRules.filter(rule => rule.enabled);
      const cascadeUpdates: Record<string, any> = {};

      for (const rule of rulesToExecute) {
        const triggerField = rule.trigger.field;
        const triggerValue = rule.trigger.value;

        // Check if this update triggers the rule
        if (updatedFields[triggerField] !== undefined) {
          if (rule.trigger.condition === 'changes_to' && updatedFields[triggerField] === triggerValue) {
            // Execute the action
            if (rule.action.condition === 'due_within_7_days') {
              // Check if due date is within 7 days
              const dueDate = new Date(currentCreator.due_date || currentCreator.expected_post_date);
              const today = new Date();
              const daysUntilDue = differenceInDays(dueDate, today);
              
              if (daysUntilDue <= 7 && daysUntilDue >= 0) {
                cascadeUpdates[rule.action.field] = rule.action.value;
              }
            } else {
              cascadeUpdates[rule.action.field] = rule.action.value;
            }
          }
        }
      }

      // Apply cascade updates if any
      if (Object.keys(cascadeUpdates).length > 0) {
        const { error } = await supabase
          .from('instagram_campaign_creators')
          .update(cascadeUpdates)
          .eq('id', creatorId);

        if (error) throw error;

        toast({
          title: "Workflow Triggered",
          description: `Automatically updated ${Object.keys(cascadeUpdates).join(', ')} based on workflow rules`,
        });
      }

      return cascadeUpdates;
    } catch (error) {
      console.error('Error executing workflow rules:', error);
      toast({
        title: "Workflow Error",
        description: "Failed to execute workflow rules",
        variant: "destructive",
      });
      return {};
    }
  }, [toast]);

  // Check for deadline alerts
  const checkDeadlineAlerts = useCallback(async (): Promise<DeadlineAlert[]> => {
    try {
      const { data: creators, error } = await supabase
        .from('instagram_campaign_creators')
        .select('*')
        .in('post_status', ['not_posted', 'scheduled']);

      if (error) throw error;

      // Fetch campaign names for display
      const campaignIds = [...new Set((creators || []).map(c => c.campaign_id))];
      const { data: campaigns } = await supabase
        .from('instagram_campaigns')
        .select('id, campaign, status')
        .in('id', campaignIds.map(Number));

      const campaignMap: Record<string, any> = {};
      (campaigns || []).forEach(c => { campaignMap[String(c.id)] = c; });

      const alerts: DeadlineAlert[] = [];
      const today = new Date();

      creators?.forEach(creator => {
        const campaign = campaignMap[creator.campaign_id];
        if (!campaign || !['Active', 'Draft'].includes(campaign.status || '')) return;

        const dueDate = creator.due_date ? new Date(creator.due_date) : null;
        if (!dueDate) return;
        const daysUntil = differenceInDays(dueDate, today);
        
        let alertType: DeadlineAlert['type'] | null = null;
        let message = '';

        if (daysUntil < 0) {
          alertType = 'overdue';
          message = `Overdue by ${Math.abs(daysUntil)} day(s)`;
        } else if (daysUntil <= 1) {
          alertType = 'critical';
          message = daysUntil === 0 ? 'Due today' : 'Due tomorrow';
        } else if (daysUntil <= 3) {
          alertType = 'warning';
          message = `Due in ${daysUntil} day(s)`;
        }

        if (alertType) {
          alerts.push({
            id: `${creator.id}-deadline`,
            type: alertType,
            title: `${creator.instagram_handle} - ${alertType === 'overdue' ? 'Overdue' : 'Upcoming Deadline'}`,
            message,
            daysUntil,
            creatorId: creator.id,
            campaignId: creator.campaign_id,
            creatorHandle: creator.instagram_handle,
            campaignName: campaign?.campaign || 'Unknown Campaign'
          });
        }
      });

      return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
    } catch (error) {
      console.error('Error checking deadline alerts:', error);
      return [];
    }
  }, []);

  // Auto-update campaign status based on creator completion
  const checkCampaignCompletion = useCallback(async (campaignId: string) => {
    try {
      const { data: creators, error } = await supabase
        .from('instagram_campaign_creators')
        .select('approval_status, post_status')
        .eq('campaign_id', String(campaignId));

      if (error) throw error;

      if (creators && creators.length > 0) {
        const allApproved = creators.every(c => c.approval_status === 'approved');
        const allPosted = creators.every(c => c.post_status === 'posted');

        let newStatus = null;
        if (allApproved && allPosted) {
          newStatus = 'Completed';
        } else if (allPosted) {
          newStatus = 'Active'; // All posted but not all approved yet
        }

        if (newStatus) {
          const { error: updateError } = await supabase
            .from('instagram_campaigns')
            .update({ status: newStatus })
            .eq('id', Number(campaignId));

          if (!updateError) {
            toast({
              title: "Campaign Status Updated",
              description: `Campaign automatically updated to ${newStatus}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking campaign completion:', error);
    }
  }, [toast]);

  // Smart deadline calculation
  const calculateOptimalDeadlines = useCallback(async (campaignId: string, campaignEndDate: string) => {
    try {
      const { data: creators, error } = await supabase
        .from('instagram_campaign_creators')
        .select('id, posts_count, post_type')
        .eq('campaign_id', String(campaignId));

      if (error) throw error;

      const endDate = new Date(campaignEndDate);
      const updates = creators?.map((creator, index) => {
        // Stagger deadlines to spread out posts
        const bufferDays = creator.post_type === 'story' ? 1 : 3; // Stories need less buffer
        const staggerDays = Math.floor(index / 3) * 2; // Every 3rd creator gets +2 days
        const optimalDue = addDays(endDate, -(bufferDays + staggerDays));
        
        return {
          id: creator.id,
          due_date: format(optimalDue, 'yyyy-MM-dd'),
          expected_post_date: format(addDays(optimalDue, -2), 'yyyy-MM-dd')
        };
      }) || [];

      // Batch update deadlines
      for (const update of updates) {
        await supabase
          .from('instagram_campaign_creators')
          .update({
            due_date: update.due_date,
            expected_post_date: update.expected_post_date
          })
          .eq('id', update.id);
      }

      toast({
        title: "Deadlines Optimized",
        description: `Updated deadlines for ${updates.length} creators`,
      });
    } catch (error) {
      console.error('Error calculating optimal deadlines:', error);
      toast({
        title: "Error",
        description: "Failed to optimize deadlines",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    executeWorkflowRules,
    checkDeadlineAlerts,
    checkCampaignCompletion,
    calculateOptimalDeadlines,
    workflowRules: defaultWorkflowRules
  };
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';
import { addDays, differenceInDays, format } from 'date-fns';

export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  trigger_field: string;
  trigger_value: string;
  trigger_condition: 'equals' | 'changes_to' | 'date_threshold' | 'greater_than' | 'less_than';
  action_field: string;
  action_value: string;
  action_condition?: string;
  is_enabled: boolean;
  execution_count: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsNote {
  id: string;
  campaign_id?: string;
  creator_id?: string;
  title: string;
  content: string;
  note_type: 'general' | 'performance' | 'issue' | 'insight' | 'follow_up';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  is_archived: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SmartDeadline {
  id: string;
  campaign_id: string;
  creator_id?: string;
  original_deadline?: string;
  calculated_deadline: string;
  algorithm_version: string;
  calculation_factors: Record<string, any>;
  confidence_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useWorkflowAutomation = () => {
  const { toast } = useToast();
  const [workflowRules, setWorkflowRules] = useState<WorkflowRule[]>([]);
  const [analyticsNotes, setAnalyticsNotes] = useState<AnalyticsNote[]>([]);
  const [smartDeadlines, setSmartDeadlines] = useState<SmartDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  // Load workflow rules
  const loadWorkflowRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflowRules((data || []).map(rule => ({
        ...rule,
        trigger_condition: rule.trigger_condition as WorkflowRule['trigger_condition']
      })));
    } catch (error) {
      console.error('Error loading workflow rules:', error);
      toast({
        title: "Error",
        description: "Failed to load workflow rules",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load analytics notes
  const loadAnalyticsNotes = useCallback(async (campaignId?: string, creatorId?: string) => {
    try {
      let query = supabase
        .from('analytics_notes')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }
      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAnalyticsNotes((data || []).map(note => ({
        ...note,
        note_type: note.note_type as AnalyticsNote['note_type'],
        priority: note.priority as AnalyticsNote['priority']
      })));
    } catch (error) {
      console.error('Error loading analytics notes:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics notes",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Create workflow rule
  const createWorkflowRule = useCallback(async (rule: Omit<WorkflowRule, 'id' | 'execution_count' | 'created_at' | 'updated_at' | 'last_executed_at'>) => {
    try {
      const { data, error } = await supabase
        .from('workflow_rules')
        .insert([rule])
        .select()
        .single();

      if (error) throw error;

      await loadWorkflowRules();
      toast({
        title: "Success",
        description: "Workflow rule created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating workflow rule:', error);
      toast({
        title: "Error",
        description: "Failed to create workflow rule",
        variant: "destructive",
      });
      return null;
    }
  }, [loadWorkflowRules, toast]);

  // Update workflow rule
  const updateWorkflowRule = useCallback(async (id: string, updates: Partial<WorkflowRule>) => {
    try {
      const { error } = await supabase
        .from('workflow_rules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadWorkflowRules();
      toast({
        title: "Success",
        description: "Workflow rule updated successfully",
      });
    } catch (error) {
      console.error('Error updating workflow rule:', error);
      toast({
        title: "Error",
        description: "Failed to update workflow rule",
        variant: "destructive",
      });
    }
  }, [loadWorkflowRules, toast]);

  // Execute workflow rules
  const executeWorkflowRules = useCallback(async (
    triggeredField: string,
    triggeredValue: any,
    context: { campaignId?: string; creatorId?: string; [key: string]: any }
  ) => {
    try {
      const eligibleRules = workflowRules.filter(rule => 
        rule.is_enabled && 
        rule.trigger_field === triggeredField
      );

      for (const rule of eligibleRules) {
        let shouldExecute = false;

        switch (rule.trigger_condition) {
          case 'changes_to':
            shouldExecute = rule.trigger_value === triggeredValue;
            break;
          case 'equals':
            shouldExecute = rule.trigger_value === triggeredValue;
            break;
          case 'greater_than':
            shouldExecute = parseFloat(triggeredValue) > parseFloat(rule.trigger_value);
            break;
          case 'less_than':
            shouldExecute = parseFloat(triggeredValue) < parseFloat(rule.trigger_value);
            break;
          case 'date_threshold':
            // For date thresholds, check days until/past date
            const daysThreshold = parseInt(rule.trigger_value);
            const currentDate = new Date();
            const targetDate = new Date(triggeredValue);
            const daysDifference = differenceInDays(targetDate, currentDate);
            shouldExecute = daysDifference <= daysThreshold;
            break;
        }

        if (shouldExecute) {
          // Log execution
          await supabase
            .from('workflow_executions')
            .insert([{
              workflow_rule_id: rule.id,
              campaign_id: context.campaignId,
              creator_id: context.creatorId,
              trigger_data: { field: triggeredField, value: triggeredValue },
              action_data: { field: rule.action_field, value: rule.action_value },
              execution_result: 'success'
            }]);

          // Update execution count
          await supabase
            .from('workflow_rules')
            .update({ 
              execution_count: rule.execution_count + 1,
              last_executed_at: new Date().toISOString()
            })
            .eq('id', rule.id);

          toast({
            title: "Workflow Executed",
            description: `${rule.name} triggered successfully`,
          });
        }
      }
    } catch (error) {
      console.error('Error executing workflow rules:', error);
    }
  }, [workflowRules, toast]);

  // Create analytics note
  const createAnalyticsNote = useCallback(async (note: Omit<AnalyticsNote, 'id' | 'created_at' | 'updated_at' | 'is_archived'>) => {
    try {
      const { data, error } = await supabase
        .from('analytics_notes')
        .insert([{ ...note, is_archived: false }])
        .select()
        .single();

      if (error) throw error;

      await loadAnalyticsNotes(note.campaign_id, note.creator_id);
      toast({
        title: "Success",
        description: "Analytics note created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating analytics note:', error);
      toast({
        title: "Error",
        description: "Failed to create analytics note",
        variant: "destructive",
      });
      return null;
    }
  }, [loadAnalyticsNotes, toast]);

  // Calculate smart deadlines
  const calculateSmartDeadlines = useCallback(async (campaignId: string) => {
    try {
      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('duration_days, start_date')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Get creators for this campaign
      const { data: creators, error: creatorsError } = await supabase
        .from('campaign_posts')
        .select('id, creator_id, post_type')
        .eq('campaign_id', campaignId);

      if (creatorsError) throw creatorsError;

      if (!creators || creators.length === 0) {
        toast({
          title: "Warning",
          description: "No creators found for this campaign",
          variant: "destructive",
        });
        return;
      }

      const endDate = addDays(new Date(campaign.start_date), campaign.duration_days);
      const smartDeadlineEntries: Omit<SmartDeadline, 'id' | 'created_at' | 'updated_at'>[] = [];

      creators.forEach((creator, index) => {
        // Algorithm factors
        const factors = {
          postType: creator.post_type,
          creatorWorkload: creators.filter(c => c.creator_id === creator.creator_id).length,
          campaignDuration: campaign.duration_days,
          creatorIndex: index
        };

        // Calculate deadline based on post type and workload
        let bufferDays = 3; // Default buffer
        if (creator.post_type === 'story') bufferDays = 1;
        if (creator.post_type === 'reel') bufferDays = 5;
        
        // Stagger deadlines to avoid bottlenecks
        const staggerDays = Math.floor(index / 5) * 2;
        const calculatedDeadline = addDays(endDate, -(bufferDays + staggerDays));

        smartDeadlineEntries.push({
          campaign_id: campaignId,
          creator_id: creator.creator_id,
          calculated_deadline: format(calculatedDeadline, 'yyyy-MM-dd'),
          algorithm_version: 'v2.0',
          calculation_factors: factors,
          confidence_score: 0.85,
          is_active: true
        });
      });

      // Insert smart deadlines
      const { error: insertError } = await supabase
        .from('smart_deadlines')
        .insert(smartDeadlineEntries);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: `Smart deadlines calculated for ${creators.length} creators`,
      });

    } catch (error) {
      console.error('Error calculating smart deadlines:', error);
      toast({
        title: "Error",
        description: "Failed to calculate smart deadlines",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadWorkflowRules(),
          loadAnalyticsNotes()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [loadWorkflowRules, loadAnalyticsNotes]);

  return {
    // Data
    workflowRules,
    analyticsNotes,
    smartDeadlines,
    loading,

    // Workflow functions
    createWorkflowRule,
    updateWorkflowRule,
    executeWorkflowRules,
    loadWorkflowRules,

    // Analytics notes functions
    createAnalyticsNote,
    loadAnalyticsNotes,

    // Smart deadlines functions
    calculateSmartDeadlines
  };
};
"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Play, Pause, Settings, Clock, CheckCircle, XCircle, 
  AlertTriangle, Calendar, Users, Bell, Mail, Slack, 
  RefreshCw, Plus, Edit, Trash2, Activity, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { InteractiveCard } from '../ui/interactive-card';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';
import { AutomationRuleEditModal } from './AutomationRuleEditModal';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'schedule' | 'event' | 'condition';
    config: Record<string, any>;
  };
  actions: AutomationAction[];
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  successRate: number;
  executionCount: number;
  category: 'queue' | 'notification' | 'member' | 'analytics';
}

interface AutomationAction {
  type: 'email' | 'slack' | 'database' | 'function' | 'webhook';
  config: Record<string, any>;
  order: number;
  required: boolean;
}

interface AutomationExecution {
  id: string;
  ruleId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  result?: Record<string, any>;
  error?: string;
  actionsExecuted: number;
  totalActions: number;
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: any;
  actions: AutomationAction[];
}

export const WorkflowAutomation: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    setLoading(true);
    
    try {
      await Promise.all([
        loadAutomationRules(),
        loadRecentExecutions(),
        loadAutomationTemplates()
      ]);
    } catch (error) {
      console.error('Error loading automation data:', error);
      toast({
        title: "Error",
        description: "Failed to load automation data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAutomationRules = async () => {
    // Mock automation rules
    const mockRules: AutomationRule[] = [
      {
        id: 'rule_1',
        name: 'Daily Queue Generation',
        description: 'Automatically generate daily queues at 9 AM',
        trigger: {
          type: 'schedule',
          config: { cron: '0 9 * * *', timezone: 'UTC' }
        },
        actions: [
          {
            type: 'function',
            config: { name: 'generate-queue', params: { auto: true } },
            order: 1,
            required: true
          },
          {
            type: 'slack',
            config: { 
              channel: '#queue-management', 
              message: 'Daily queue generated successfully' 
            },
            order: 2,
            required: false
          }
        ],
        enabled: true,
        lastRun: new Date(Date.now() - 3600000).toISOString(),
        nextRun: new Date(Date.now() + 79200000).toISOString(), // Tomorrow 9 AM
        successRate: 94.2,
        executionCount: 127,
        category: 'queue'
      },
      {
        id: 'rule_2',
        name: 'Member Engagement Alerts',
        description: 'Send alerts when member engagement drops below threshold',
        trigger: {
          type: 'condition',
          config: { metric: 'engagement_score', threshold: 6.0, comparison: 'less_than' }
        },
        actions: [
          {
            type: 'email',
            config: { 
              template: 'member_engagement_alert',
              recipients: ['admin@example.com'] 
            },
            order: 1,
            required: true
          },
          {
            type: 'database',
            config: { 
              action: 'update_member_status',
              table: 'members',
              condition: 'low_engagement'
            },
            order: 2,
            required: true
          }
        ],
        enabled: true,
        lastRun: new Date(Date.now() - 7200000).toISOString(),
        successRate: 89.7,
        executionCount: 34,
        category: 'member'
      },
      {
        id: 'rule_3',
        name: 'Queue Performance Analytics',
        description: 'Generate weekly performance reports',
        trigger: {
          type: 'schedule',
          config: { cron: '0 10 * * 1', timezone: 'UTC' } // Monday 10 AM
        },
        actions: [
          {
            type: 'function',
            config: { name: 'generate-analytics-report' },
            order: 1,
            required: true
          },
          {
            type: 'email',
            config: { 
              template: 'weekly_analytics',
              recipients: ['team@example.com']
            },
            order: 2,
            required: true
          }
        ],
        enabled: true,
        lastRun: new Date(Date.now() - 518400000).toISOString(), // Last Monday
        nextRun: new Date(Date.now() + 86400000).toISOString(), // Next Monday
        successRate: 97.1,
        executionCount: 52,
        category: 'analytics'
      },
      {
        id: 'rule_4',
        name: 'Member Assignment Notifications',
        description: 'Notify members when assigned to new tracks',
        trigger: {
          type: 'event',
          config: { event: 'queue_published' }
        },
        actions: [
          {
            type: 'email',
            config: { 
              template: 'assignment_notification',
              dynamic_recipients: true
            },
            order: 1,
            required: true
          },
          {
            type: 'slack',
            config: { 
              channel: '#assignments',
              message: 'New assignments distributed to members'
            },
            order: 2,
            required: false
          }
        ],
        enabled: false,
        lastRun: new Date(Date.now() - 1800000).toISOString(),
        successRate: 91.8,
        executionCount: 89,
        category: 'notification'
      }
    ];
    
    setRules(mockRules);
    if (mockRules.length > 0) {
      setSelectedRule(mockRules[0]);
    }
  };

  const loadRecentExecutions = async () => {
    // Mock recent executions
    const mockExecutions: AutomationExecution[] = [
      {
        id: 'exec_1',
        ruleId: 'rule_1',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3540000).toISOString(),
        status: 'completed',
        result: { queues_generated: 1, assignments_created: 45 },
        actionsExecuted: 2,
        totalActions: 2
      },
      {
        id: 'exec_2',
        ruleId: 'rule_2',
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7140000).toISOString(),
        status: 'completed',
        result: { alerts_sent: 3, members_flagged: 2 },
        actionsExecuted: 2,
        totalActions: 2
      },
      {
        id: 'exec_3',
        ruleId: 'rule_4',
        startedAt: new Date(Date.now() - 1800000).toISOString(),
        status: 'failed',
        error: 'Email service temporarily unavailable',
        actionsExecuted: 0,
        totalActions: 2
      }
    ];
    
    setExecutions(mockExecutions);
  };

  const loadAutomationTemplates = async () => {
    // Mock automation templates
    const mockTemplates: AutomationTemplate[] = [
      {
        id: 'template_1',
        name: 'Queue Generation Automation',
        description: 'Automated daily queue generation with notifications',
        category: 'queue',
        trigger: { type: 'schedule', config: { cron: '0 9 * * *' } },
        actions: [
          { type: 'function', config: { name: 'generate-queue' }, order: 1, required: true },
          { type: 'slack', config: { channel: '#queue-management' }, order: 2, required: false }
        ]
      },
      {
        id: 'template_2',
        name: 'Member Performance Monitoring',
        description: 'Monitor and alert on member performance metrics',
        category: 'member',
        trigger: { type: 'condition', config: { metric: 'performance_score' } },
        actions: [
          { type: 'email', config: { template: 'performance_alert' }, order: 1, required: true },
          { type: 'database', config: { action: 'update_member_status' }, order: 2, required: true }
        ]
      },
      {
        id: 'template_3',
        name: 'Weekly Analytics Report',
        description: 'Generate and distribute weekly performance reports',
        category: 'analytics',
        trigger: { type: 'schedule', config: { cron: '0 10 * * 1' } },
        actions: [
          { type: 'function', config: { name: 'generate-analytics' }, order: 1, required: true },
          { type: 'email', config: { template: 'analytics_report' }, order: 2, required: true }
        ]
      }
    ];
    
    setTemplates(mockTemplates);
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    setRules(prev => 
      prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      )
    );
    
    toast({
      title: enabled ? "Rule Enabled" : "Rule Disabled",
      description: `Automation rule has been ${enabled ? 'enabled' : 'disabled'}`
    });
  };

  const executeRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const execution: AutomationExecution = {
      id: `exec_${Date.now()}`,
      ruleId,
      startedAt: new Date().toISOString(),
      status: 'running',
      actionsExecuted: 0,
      totalActions: rule.actions.length
    };

    setExecutions(prev => [execution, ...prev]);

    // Simulate execution
    setTimeout(() => {
      const completed: AutomationExecution = {
        ...execution,
        completedAt: new Date().toISOString(),
        status: 'completed',
        result: { success: true, message: 'Rule executed successfully' },
        actionsExecuted: rule.actions.length
      };

      setExecutions(prev => 
        prev.map(exec => exec.id === execution.id ? completed : exec)
      );

      toast({
        title: "Rule Executed",
        description: `${rule.name} executed successfully`
      });
    }, 3000);

    toast({
      title: "Executing Rule",
      description: `${rule.name} is now running...`
    });
  };

  const createRule = async () => {
    if (!newRuleName.trim() || !selectedTemplate) {
      toast({
        title: "Error",
        description: "Please enter a rule name and select a template",
        variant: "destructive"
      });
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const newRule: AutomationRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName,
      description: newRuleDescription || template.description,
      trigger: template.trigger,
      actions: template.actions,
      enabled: true,
      successRate: 0,
      executionCount: 0,
      category: template.category as any
    };

    setRules(prev => [newRule, ...prev]);
    setShowCreateDialog(false);
    setNewRuleName('');
    setNewRuleDescription('');
    setSelectedTemplate('');

    toast({
      title: "Rule Created",
      description: `${newRuleName} has been created and enabled`
    });
  };

  const deleteRule = async (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
    
    if (selectedRule?.id === ruleId) {
      setSelectedRule(rules.find(r => r.id !== ruleId) || null);
    }

    toast({
      title: "Rule Deleted",
      description: "Automation rule has been deleted"
    });
  };

  const getStatusIcon = (status: AutomationExecution['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Play className="h-4 w-4 text-blue-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getCategoryIcon = (category: AutomationRule['category']) => {
    switch (category) {
      case 'queue': return <Calendar className="h-4 w-4" />;
      case 'notification': return <Bell className="h-4 w-4" />;
      case 'member': return <Users className="h-4 w-4" />;
      case 'analytics': return <Activity className="h-4 w-4" />;
    }
  };

  const getActionTypeIcon = (type: AutomationAction['type']) => {
    switch (type) {
      case 'email': return <Mail className="h-3 w-3" />;
      case 'slack': return <Slack className="h-3 w-3" />;
      case 'function': return <Zap className="h-3 w-3" />;
      case 'database': return <Activity className="h-3 w-3" />;
      case 'webhook': return <RefreshCw className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading automation engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-muted-foreground">
            Automated processes, triggers, and intelligent workflow management
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>
                Set up a new automated workflow rule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="Enter rule name"
                />
              </div>
              
              <div>
                <Label htmlFor="rule-description">Description (Optional)</Label>
                <Textarea
                  id="rule-description"
                  value={newRuleDescription}
                  onChange={(e) => setNewRuleDescription(e.target.value)}
                  placeholder="Describe what this rule does"
                />
              </div>
              
              <div>
                <Label htmlFor="template">Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={createRule} className="w-full">
                <Bot className="w-4 h-4 mr-2" />
                Create Automation Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Active Rules', 
            value: rules.filter(r => r.enabled).length, 
            icon: Zap,
            color: 'text-green-500'
          },
          { 
            label: 'Total Executions', 
            value: rules.reduce((acc, rule) => acc + rule.executionCount, 0), 
            icon: Play,
            color: 'text-blue-500'
          },
          { 
            label: 'Success Rate', 
            value: `${(rules.reduce((acc, rule) => acc + rule.successRate, 0) / rules.length || 0).toFixed(1)}%`, 
            icon: CheckCircle,
            color: 'text-green-500'
          },
          { 
            label: 'Recent Failures', 
            value: executions.filter(e => e.status === 'failed').length, 
            icon: XCircle,
            color: 'text-red-500'
          }
        ].map((stat, index) => (
          <InteractiveCard key={stat.label} hoverScale={1.03}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </InteractiveCard>
        ))}
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="executions">Execution History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Automation Rules</CardTitle>
                <CardDescription>Manage your automated workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <motion.div
                      key={rule.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRule?.id === rule.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedRule(rule)}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(rule.category)}
                          <h4 className="font-medium text-sm">{rule.name}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline">{rule.category}</Badge>
                        <span className="text-muted-foreground">
                          {rule.successRate.toFixed(1)}% success
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                {selectedRule && (
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedRule.name}</CardTitle>
                      <CardDescription>
                        {selectedRule.executionCount} executions • {selectedRule.successRate.toFixed(1)}% success rate
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeRule(selectedRule.id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditDialog(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRule(selectedRule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {selectedRule ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Status:</span>
                        <div className="mt-1">
                          <Badge variant={selectedRule.enabled ? "default" : "secondary"}>
                            {selectedRule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Category:</span>
                        <p className="mt-1 capitalize">{selectedRule.category}</p>
                      </div>
                      {selectedRule.lastRun && (
                        <div>
                          <span className="font-medium">Last Run:</span>
                          <p className="mt-1 text-muted-foreground">
                            {format(new Date(selectedRule.lastRun), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      )}
                      {selectedRule.nextRun && (
                        <div>
                          <span className="font-medium">Next Run:</span>
                          <p className="mt-1 text-muted-foreground">
                            {format(new Date(selectedRule.nextRun), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Trigger Configuration</h4>
                      <div className="p-3 border rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium capitalize">{selectedRule.trigger.type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedRule.trigger.type === 'schedule' && 
                            `Runs on schedule: ${selectedRule.trigger.config.cron}`
                          }
                          {selectedRule.trigger.type === 'event' && 
                            `Triggered by: ${selectedRule.trigger.config.event}`
                          }
                          {selectedRule.trigger.type === 'condition' && 
                            `When ${selectedRule.trigger.config.metric} ${selectedRule.trigger.config.comparison} ${selectedRule.trigger.config.threshold}`
                          }
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Actions</h4>
                      <div className="space-y-2">
                        {selectedRule.actions.map((action, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex-shrink-0">
                              {getActionTypeIcon(action.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm capitalize">{action.type}</span>
                                {action.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {action.type === 'email' && `Send to: ${action.config.recipients?.join(', ') || 'Dynamic recipients'}`}
                                {action.type === 'slack' && `Channel: ${action.config.channel}`}
                                {action.type === 'function' && `Function: ${action.config.name}`}
                                {action.type === 'database' && `Action: ${action.config.action}`}
                                {action.type === 'webhook' && `URL: ${action.config.url}`}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Step {action.order}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a rule to view configuration</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="executions">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>Recent automation rule executions and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => {
                    const rule = rules.find(r => r.id === execution.ruleId);
                    const duration = execution.completedAt 
                      ? Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)
                      : null;

                    return (
                      <TableRow key={execution.id}>
                        <TableCell className="font-medium">
                          {rule?.name || 'Unknown Rule'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(execution.startedAt), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {duration ? `${duration}s` : 'Running...'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(execution.status)}
                            <span className="capitalize">{execution.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(execution.actionsExecuted / execution.totalActions) * 100} 
                              className="w-16 h-2" 
                            />
                            <span className="text-xs text-muted-foreground">
                              {execution.actionsExecuted}/{execution.totalActions}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {execution.error ? (
                            <span className="text-red-600 text-sm">{execution.error}</span>
                          ) : execution.result ? (
                            <span className="text-green-600 text-sm">Success</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Running...</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Actions:</span>
                      <span>{template.actions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trigger:</span>
                      <span className="capitalize">{template.trigger.type}</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setShowCreateDialog(true);
                    }}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>Configure global automation preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Global automation settings and configurations will be available here.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AutomationRuleEditModal
        rule={selectedRule}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={(updatedRule) => {
          setRules(prev => prev.map(rule => rule.id === updatedRule.id ? updatedRule : rule));
          if (selectedRule?.id === updatedRule.id) {
            setSelectedRule(updatedRule);
          }
          toast({
            title: "Rule Updated",
            description: `${updatedRule.name} has been updated successfully`
          });
        }}
      />
    </div>
  );
};
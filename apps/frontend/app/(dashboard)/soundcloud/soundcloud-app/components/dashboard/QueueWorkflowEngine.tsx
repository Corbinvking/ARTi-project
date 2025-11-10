"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Settings, Clock, CheckCircle, XCircle, 
  AlertTriangle, Users, Calendar, Zap, ArrowRight, 
  RotateCcw, FastForward, SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  progress?: number;
  dependencies?: string[];
  automated: boolean;
  critical: boolean;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedDuration: number;
  category: 'daily' | 'weekly' | 'custom';
}

interface ActiveWorkflow {
  id: string;
  templateId: string;
  name: string;
  startedAt: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  steps: WorkflowStep[];
  metadata?: Record<string, any>;
}

export const QueueWorkflowEngine: React.FC = () => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [activeWorkflows, setActiveWorkflows] = useState<ActiveWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ActiveWorkflow | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadWorkflowTemplates();
    loadActiveWorkflows();
  }, []);

  const loadWorkflowTemplates = async () => {
    // Mock workflow templates - in production these would come from database
    const mockTemplates: WorkflowTemplate[] = [
      {
        id: 'daily_queue',
        name: 'Daily Queue Generation',
        description: 'Complete workflow for generating and publishing daily support queues',
        category: 'daily',
        estimatedDuration: 45,
        steps: [
          {
            id: 'fetch_submissions',
            name: 'Fetch Approved Submissions',
            description: 'Retrieve all approved submissions for the target date',
            status: 'pending',
            automated: true,
            critical: true
          },
          {
            id: 'analyze_members',
            name: 'Analyze Member Availability',
            description: 'Check member credit balances and availability',
            status: 'pending',
            automated: true,
            critical: true,
            dependencies: ['fetch_submissions']
          },
          {
            id: 'smart_matching',
            name: 'Smart Member Matching',
            description: 'Use AI to match tracks with optimal supporters',
            status: 'pending',
            automated: true,
            critical: true,
            dependencies: ['analyze_members']
          },
          {
            id: 'conflict_resolution',
            name: 'Resolve Conflicts',
            description: 'Automatically resolve scheduling and genre conflicts',
            status: 'pending',
            automated: true,
            critical: false,
            dependencies: ['smart_matching']
          },
          {
            id: 'manual_review',
            name: 'Manual Review',
            description: 'Human review of generated assignments',
            status: 'pending',
            automated: false,
            critical: true,
            dependencies: ['conflict_resolution']
          },
          {
            id: 'queue_approval',
            name: 'Queue Approval',
            description: 'Final approval and queue publication',
            status: 'pending',
            automated: false,
            critical: true,
            dependencies: ['manual_review']
          },
          {
            id: 'notification_dispatch',
            name: 'Send Notifications',
            description: 'Notify members of their assignments',
            status: 'pending',
            automated: true,
            critical: true,
            dependencies: ['queue_approval']
          }
        ]
      },
      {
        id: 'weekly_optimization',
        name: 'Weekly Queue Optimization',
        description: 'Comprehensive weekly analysis and optimization of queue performance',
        category: 'weekly',
        estimatedDuration: 120,
        steps: [
          {
            id: 'performance_analysis',
            name: 'Performance Analysis',
            description: 'Analyze previous week\'s queue performance metrics',
            status: 'pending',
            automated: true,
            critical: true
          },
          {
            id: 'member_evaluation',
            name: 'Member Performance Evaluation',
            description: 'Evaluate individual member performance and engagement',
            status: 'pending',
            automated: true,
            critical: false,
            dependencies: ['performance_analysis']
          },
          {
            id: 'algorithm_tuning',
            name: 'Algorithm Parameter Tuning',
            description: 'Adjust matching algorithms based on performance data',
            status: 'pending',
            automated: false,
            critical: false,
            dependencies: ['member_evaluation']
          },
          {
            id: 'template_updates',
            name: 'Update Queue Templates',
            description: 'Modify templates based on optimization insights',
            status: 'pending',
            automated: false,
            critical: false,
            dependencies: ['algorithm_tuning']
          }
        ]
      }
    ];
    
    setTemplates(mockTemplates);
  };

  const loadActiveWorkflows = async () => {
    try {
      // Mock active workflows - in production this would come from database
      const mockWorkflows: ActiveWorkflow[] = [
        {
          id: 'workflow_1',
          templateId: 'daily_queue',
          name: 'Daily Queue - Jan 20, 2024',
          startedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          status: 'running',
          progress: 65,
          currentStep: 'manual_review',
          steps: [
            { id: 'fetch_submissions', name: 'Fetch Approved Submissions', description: '', status: 'completed', automated: true, critical: true, completedAt: new Date(Date.now() - 1500000).toISOString(), duration: 120 },
            { id: 'analyze_members', name: 'Analyze Member Availability', description: '', status: 'completed', automated: true, critical: true, completedAt: new Date(Date.now() - 1200000).toISOString(), duration: 180 },
            { id: 'smart_matching', name: 'Smart Member Matching', description: '', status: 'completed', automated: true, critical: true, completedAt: new Date(Date.now() - 900000).toISOString(), duration: 300 },
            { id: 'conflict_resolution', name: 'Resolve Conflicts', description: '', status: 'completed', automated: true, critical: false, completedAt: new Date(Date.now() - 600000).toISOString(), duration: 90 },
            { id: 'manual_review', name: 'Manual Review', description: '', status: 'running', automated: false, critical: true, startedAt: new Date(Date.now() - 300000).toISOString(), progress: 40 },
            { id: 'queue_approval', name: 'Queue Approval', description: '', status: 'pending', automated: false, critical: true },
            { id: 'notification_dispatch', name: 'Send Notifications', description: '', status: 'pending', automated: true, critical: true }
          ],
          metadata: {
            queueDate: '2024-01-20',
            totalSubmissions: 48,
            assignedSubmissions: 42,
            totalCredits: 1250
          }
        }
      ];
      
      setActiveWorkflows(mockWorkflows);
      if (mockWorkflows.length > 0) {
        setSelectedWorkflow(mockWorkflows[0]);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    if (!selectedTemplate || !workflowName) {
      toast({
        title: "Error",
        description: "Please select a template and enter a workflow name",
        variant: "destructive"
      });
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const newWorkflow: ActiveWorkflow = {
      id: `workflow_${Date.now()}`,
      templateId: template.id,
      name: workflowName,
      startedAt: new Date().toISOString(),
      status: 'running',
      progress: 0,
      steps: template.steps.map(step => ({ ...step })),
      metadata: {
        notes: workflowNotes
      }
    };

    setActiveWorkflows(prev => [newWorkflow, ...prev]);
    setSelectedWorkflow(newWorkflow);
    setShowCreateDialog(false);
    setWorkflowName('');
    setWorkflowNotes('');
    setSelectedTemplate('');

    toast({
      title: "Workflow Started",
      description: `${workflowName} has been created and started`
    });

    // Start executing automated steps
    executeAutomatedSteps(newWorkflow);
  };

  const executeAutomatedSteps = async (workflow: ActiveWorkflow) => {
    // This would contain the actual automation logic
    // For now, we'll simulate step execution
    console.log('Executing automated steps for workflow:', workflow.id);
  };

  const pauseWorkflow = async (workflowId: string) => {
    setActiveWorkflows(prev => 
      prev.map(workflow => 
        workflow.id === workflowId 
          ? { ...workflow, status: 'paused' as const }
          : workflow
      )
    );
    
    toast({
      title: "Workflow Paused",
      description: "Workflow execution has been paused"
    });
  };

  const resumeWorkflow = async (workflowId: string) => {
    setActiveWorkflows(prev => 
      prev.map(workflow => 
        workflow.id === workflowId 
          ? { ...workflow, status: 'running' as const }
          : workflow
      )
    );
    
    toast({
      title: "Workflow Resumed",
      description: "Workflow execution has been resumed"
    });
  };

  const skipStep = async (workflowId: string, stepId: string) => {
    setActiveWorkflows(prev => 
      prev.map(workflow => {
        if (workflow.id !== workflowId) return workflow;
        
        return {
          ...workflow,
          steps: workflow.steps.map(step => 
            step.id === stepId 
              ? { ...step, status: 'skipped' as const, completedAt: new Date().toISOString() }
              : step
          )
        };
      })
    );
    
    toast({
      title: "Step Skipped",
      description: "The workflow step has been skipped"
    });
  };

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Play className="h-4 w-4 text-blue-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped': return <SkipForward className="h-4 w-4 text-gray-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ActiveWorkflow['status']) => {
    switch (status) {
      case 'running': return <Badge variant="default" className="bg-blue-500">Running</Badge>;
      case 'paused': return <Badge variant="secondary">Paused</Badge>;
      case 'completed': return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading workflow engine...</p>
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
          <h1 className="text-3xl font-bold">Queue Workflow Engine</h1>
          <p className="text-muted-foreground">
            Automated workflow orchestration and queue management
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              Start Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Start a new automated workflow from a template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a workflow template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.estimatedDuration}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Workflow Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="e.g., Daily Queue - Jan 20, 2024"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  value={workflowNotes}
                  onChange={(e) => setWorkflowNotes(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                />
              </div>
              
              <Button onClick={createWorkflow} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Start Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Active Workflows</CardTitle>
                <CardDescription>Currently running workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeWorkflows.map((workflow) => (
                    <motion.div
                      key={workflow.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedWorkflow?.id === workflow.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedWorkflow(workflow)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{workflow.name}</h4>
                        {getStatusBadge(workflow.status)}
                      </div>
                      <Progress value={workflow.progress} className="h-2 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Started {format(new Date(workflow.startedAt), 'MMM d, HH:mm')}
                      </p>
                    </motion.div>
                  ))}
                  
                  {activeWorkflows.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No active workflows</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                {selectedWorkflow && (
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedWorkflow.name}</CardTitle>
                      <CardDescription>
                        Progress: {selectedWorkflow.progress}% complete
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedWorkflow.status === 'running' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pauseWorkflow(selectedWorkflow.id)}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      ) : selectedWorkflow.status === 'paused' ? (
                        <Button
                          size="sm"
                          onClick={() => resumeWorkflow(selectedWorkflow.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {selectedWorkflow ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Status:</span>
                        <div className="mt-1">{getStatusBadge(selectedWorkflow.status)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Current Step:</span>
                        <p className="mt-1">
                          {selectedWorkflow.currentStep 
                            ? selectedWorkflow.steps.find(s => s.id === selectedWorkflow.currentStep)?.name || 'Unknown'
                            : 'Completed'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Workflow Steps</h4>
                      {selectedWorkflow.steps.map((step, index) => (
                        <motion.div
                          key={step.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex-shrink-0">
                            {getStepIcon(step.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-sm">{step.name}</h5>
                              {step.critical && (
                                <Badge variant="destructive" className="text-xs">Critical</Badge>
                              )}
                              {!step.automated && (
                                <Badge variant="outline" className="text-xs">Manual</Badge>
                              )}
                            </div>
                            {step.description && (
                              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                            )}
                            {step.status === 'running' && step.progress !== undefined && (
                              <Progress value={step.progress} className="h-1 mt-2" />
                            )}
                          </div>
                          <div className="flex-shrink-0 text-xs text-muted-foreground">
                            {step.duration && (
                              <span>{step.duration}s</span>
                            )}
                          </div>
                          {step.status === 'running' && !step.automated && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => skipStep(selectedWorkflow.id, step.id)}
                            >
                              <SkipForward className="h-3 w-3" />
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a workflow to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                      <span>Steps:</span>
                      <span>{template.steps.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Duration:</span>
                      <span>{template.estimatedDuration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Workflow History</CardTitle>
              <CardDescription>Previously executed workflows and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Workflow history will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
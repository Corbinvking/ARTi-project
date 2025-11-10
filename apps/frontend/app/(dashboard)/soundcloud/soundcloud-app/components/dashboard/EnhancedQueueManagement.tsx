"use client"

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Calendar, Play, CheckCircle, AlertCircle, Users, Clock, Plus, Settings, Target, Zap, BarChart3, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { InteractiveCard } from '../ui/interactive-card';

interface Queue {
  id: string;
  date: string;
  status: string;
  total_slots: number;
  filled_slots: number;
  created_at: string;
  notes?: string;
  created_by_id?: string;
  approved_by_id?: string;
  approved_at?: string;
  published_at?: string;
}

interface QueueAssignment {
  id: string;
  position: number;
  credits_allocated: number;
  status: string;
  submissions: {
    id: string;
    track_url: string;
    artist_name: string;
    family: string;
    members: {
      name: string;
    };
  };
  members: {
    id: string;
    name: string;
  };
}

interface QueueTemplate {
  id: string;
  name: string;
  description: string;
  default_slots: number;
  genre_weights: Record<string, number>;
  tier_distribution: Record<string, number>;
}

interface QueueAnalytics {
  totalQueues: number;
  avgFillRate: number;
  avgCreditsPerSlot: number;
  topGenres: Array<{ genre: string; count: number }>;
  performance: Array<{ date: string; fillRate: number; engagement: number }>;
}

export const EnhancedQueueManagement: React.FC = () => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [assignments, setAssignments] = useState<QueueAssignment[]>([]);
  const [templates, setTemplates] = useState<QueueTemplate[]>([]);
  const [analytics, setAnalytics] = useState<QueueAnalytics | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [newQueueDate, setNewQueueDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchQueues();
    fetchTemplates();
    fetchAnalytics();
  }, []);

  const fetchQueues = async () => {
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setQueues(data || []);
    } catch (error) {
      console.error('Error fetching queues:', error);
      toast({
        title: "Error",
        description: "Failed to load queues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueAssignments = async (queueId: string) => {
    try {
      const { data, error } = await supabase
        .from('queue_assignments')
        .select(`
          id,
          position,
          credits_allocated,
          status,
          submissions!inner(
            id,
            track_url,
            artist_name,
            family,
            members!inner(name)
          ),
          members!supporter_id(
            id,
            name
          )
        `)
        .eq('queue_id', queueId)
        .order('position');

      if (error) throw error;
      setAssignments(data || []);
      detectConflicts(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load queue assignments",
        variant: "destructive",
      });
    }
  };

  const fetchTemplates = async () => {
    // Mock templates - in real app these would come from database
    const mockTemplates: QueueTemplate[] = [
      {
        id: 'balanced',
        name: 'Balanced Mix',
        description: 'Equal distribution across all genres and tiers',
        default_slots: 50,
        genre_weights: { Electronic: 0.3, Hip_Hop: 0.25, Pop: 0.2, Rock: 0.15, Other: 0.1 },
        tier_distribution: { T1: 0.4, T2: 0.3, T3: 0.2, T4: 0.1 }
      },
      {
        id: 'electronic_heavy',
        name: 'Electronic Focus',
        description: 'Emphasizes electronic music submissions',
        default_slots: 40,
        genre_weights: { Electronic: 0.6, Hip_Hop: 0.15, Pop: 0.1, Rock: 0.1, Other: 0.05 },
        tier_distribution: { T1: 0.3, T2: 0.4, T3: 0.2, T4: 0.1 }
      },
      {
        id: 'premium_focus',
        name: 'Premium Artists',
        description: 'Prioritizes higher tier artists',
        default_slots: 30,
        genre_weights: { Electronic: 0.25, Hip_Hop: 0.25, Pop: 0.25, Rock: 0.15, Other: 0.1 },
        tier_distribution: { T1: 0.1, T2: 0.3, T3: 0.4, T4: 0.2 }
      }
    ];
    setTemplates(mockTemplates);
  };

  const fetchAnalytics = async () => {
    try {
      // Mock analytics - in real app this would come from complex queries
      const mockAnalytics: QueueAnalytics = {
        totalQueues: queues.length,
        avgFillRate: 85.2,
        avgCreditsPerSlot: 45,
        topGenres: [
          { genre: 'Electronic', count: 245 },
          { genre: 'Hip Hop', count: 189 },
          { genre: 'Pop', count: 156 },
          { genre: 'Rock', count: 98 },
          { genre: 'Other', count: 67 }
        ],
        performance: [
          { date: '2024-01-15', fillRate: 78, engagement: 65 },
          { date: '2024-01-16', fillRate: 85, engagement: 72 },
          { date: '2024-01-17', fillRate: 92, engagement: 78 },
          { date: '2024-01-18', fillRate: 88, engagement: 81 },
          { date: '2024-01-19', fillRate: 94, engagement: 85 },
        ]
      };
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const detectConflicts = (assignments: QueueAssignment[]) => {
    const conflicts = [];
    
    // Check for duplicate supporters
    const supporterCounts = assignments.reduce((acc, assignment) => {
      const supporterId = assignment.members.id;
      acc[supporterId] = (acc[supporterId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(supporterCounts).forEach(([supporterId, count]) => {
      if (count > 1) {
        const conflictedAssignments = assignments.filter(a => a.members.id === supporterId);
        conflicts.push({
          type: 'duplicate_supporter',
          message: `${conflictedAssignments[0].members.name} is assigned to support multiple tracks`,
          assignments: conflictedAssignments
        });
      }
    });

    // Check for genre clustering
    const genrePositions = assignments.reduce((acc, assignment, index) => {
      const genre = assignment.submissions.family;
      if (!acc[genre]) acc[genre] = [];
      acc[genre].push(index);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(genrePositions).forEach(([genre, positions]) => {
      if (positions.length >= 3) {
        const consecutiveRuns = [];
        let currentRun = [positions[0]];
        
        for (let i = 1; i < positions.length; i++) {
          if (positions[i] === positions[i-1] + 1) {
            currentRun.push(positions[i]);
          } else {
            if (currentRun.length >= 3) {
              consecutiveRuns.push([...currentRun]);
            }
            currentRun = [positions[i]];
          }
        }
        
        if (currentRun.length >= 3) {
          consecutiveRuns.push(currentRun);
        }

        consecutiveRuns.forEach(run => {
          conflicts.push({
            type: 'genre_clustering',
            message: `${genre} tracks are clustered together (positions ${run[0] + 1}-${run[run.length - 1] + 1})`,
            positions: run
          });
        });
      }
    });

    setConflicts(conflicts);
  };

  const generateQueue = async () => {
    if (!newQueueDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const template = selectedTemplate ? templates.find(t => t.id === selectedTemplate) : null;
      
      const { data, error } = await supabase.functions.invoke('generate-queue', {
        body: { 
          date: newQueueDate,
          template: template ? {
            slots: template.default_slots,
            genre_weights: template.genre_weights,
            tier_distribution: template.tier_distribution
          } : undefined
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: data.message,
      });

      setShowGenerateDialog(false);
      setNewQueueDate('');
      setSelectedTemplate('');
      await fetchQueues();
    } catch (error) {
      console.error('Error generating queue:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate queue",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const optimizeQueue = async () => {
    if (!selectedQueue) return;

    setOptimizing(true);
    try {
      // Call optimization function
      const { data, error } = await supabase.functions.invoke('optimize-queue', {
        body: { queueId: selectedQueue.id }
      });

      if (error) throw error;

      toast({
        title: "Queue Optimized",
        description: "Queue assignments have been optimized for better performance",
      });

      // Refresh assignments
      await fetchQueueAssignments(selectedQueue.id);
    } catch (error) {
      console.error('Error optimizing queue:', error);
      toast({
        title: "Optimization Failed",
        description: "Could not optimize queue assignments",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !selectedQueue) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Optimistically update UI
    const newAssignments = Array.from(assignments);
    const [reorderedItem] = newAssignments.splice(sourceIndex, 1);
    newAssignments.splice(destinationIndex, 0, reorderedItem);

    // Update positions
    const updatedAssignments = newAssignments.map((assignment, index) => ({
      ...assignment,
      position: index + 1
    }));

    setAssignments(updatedAssignments);

    try {
      // Update positions in database - use individual updates instead of upsert
      for (const assignment of updatedAssignments) {
        const { error } = await supabase
          .from('queue_assignments')
          .update({ position: assignment.position })
          .eq('id', assignment.id);

        if (error) throw error;
      }

      toast({
        title: "Queue Updated",
        description: "Assignment order has been updated",
      });

      // Re-detect conflicts with new order
      detectConflicts(updatedAssignments);
    } catch (error) {
      console.error('Error updating queue order:', error);
      // Revert on error
      await fetchQueueAssignments(selectedQueue.id);
      toast({
        title: "Update Failed",
        description: "Could not update queue order",
        variant: "destructive",
      });
    }
  };

  const updateQueueStatus = async (queueId: string, status: 'approved' | 'published') => {
    try {
      const updates: any = { status };
      
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by_id = (await supabase.auth.getUser()).data.user?.id;
      } else if (status === 'published') {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('queues')
        .update(updates)
        .eq('id', queueId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Queue ${status} successfully`,
      });

      await fetchQueues();
      if (selectedQueue?.id === queueId) {
        setSelectedQueue({ ...selectedQueue, status, ...updates });
      }
    } catch (error) {
      console.error('Error updating queue status:', error);
      toast({
        title: "Error",
        description: "Failed to update queue status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'approved':
        return <Badge variant="secondary">Approved</Badge>;
      case 'published':
        return <Badge variant="default">Published</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewQueue = async (queue: Queue) => {
    setSelectedQueue(queue);
    await fetchQueueAssignments(queue.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading queues...</p>
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
          <h1 className="text-3xl font-bold">Enhanced Queue Management</h1>
          <p className="text-muted-foreground">
            Advanced queue generation, optimization, and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Queue Templates</DialogTitle>
                <DialogDescription>
                  Pre-configured templates for different queue strategies
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 border rounded-lg">
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                    <div className="text-xs text-muted-foreground">
                      Default slots: {template.default_slots}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Generate Queue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Queue</DialogTitle>
                <DialogDescription>
                  Create a new support queue with advanced options
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="queue-date">Support Date</Label>
                  <Input
                    id="queue-date"
                    type="date"
                    value={newQueueDate}
                    onChange={(e) => setNewQueueDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                
                <div>
                  <Label htmlFor="template">Template (Optional)</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateQueue}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Queue
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <Tabs defaultValue="queues" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queues">Queue Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="conflicts">Conflict Detection</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="queues" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InteractiveCard hoverScale={1.01}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Recent Queues
                </CardTitle>
                <CardDescription>
                  Manage your support queues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queues.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No queues found. Generate your first queue to get started.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    queues.slice(0, 10).map((queue) => (
                      <motion.div
                        key={queue.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleViewQueue(queue)}
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {format(new Date(queue.date), 'MMM d, yyyy')}
                            </span>
                            {getStatusBadge(queue.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {queue.filled_slots} / {queue.total_slots} assignments
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {queue.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQueueStatus(queue.id, 'approved');
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {queue.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQueueStatus(queue.id, 'published');
                              }}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              Publish
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </InteractiveCard>

            <InteractiveCard hoverScale={1.01}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <GripVertical className="w-5 h-5 mr-2" />
                      Queue Details
                    </CardTitle>
                    <CardDescription>
                      {selectedQueue 
                        ? `Queue for ${format(new Date(selectedQueue.date), 'MMM d, yyyy')}`
                        : 'Select a queue to view details'
                      }
                    </CardDescription>
                  </div>
                  {selectedQueue && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={optimizeQueue}
                      disabled={optimizing}
                    >
                      {optimizing ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Optimize
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedQueue ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Status:</span>
                        <div className="mt-1">{getStatusBadge(selectedQueue.status)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Assignments:</span>
                        <p className="mt-1">{selectedQueue.filled_slots} / {selectedQueue.total_slots}</p>
                      </div>
                    </div>

                    {conflicts.length > 0 && (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <AlertDescription>
                          {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="max-h-64 overflow-y-auto">
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="queue-assignments">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef}>
                              {assignments.map((assignment, index) => (
                                <Draggable 
                                  key={assignment.id} 
                                  draggableId={assignment.id} 
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`p-3 mb-2 border rounded-lg flex items-center gap-3 ${
                                        snapshot.isDragging ? 'bg-primary/10 shadow-lg' : 'bg-background'
                                      }`}
                                    >
                                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                                      <div className="w-8 text-sm font-medium text-center">
                                        {assignment.position}
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{assignment.submissions.artist_name}</p>
                                        <p className="text-xs text-muted-foreground">{assignment.submissions.family}</p>
                                      </div>
                                      <div className="text-sm">{assignment.members.name}</div>
                                      <div className="text-sm font-medium">{assignment.credits_allocated}</div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a queue to view its assignments</p>
                  </div>
                )}
              </CardContent>
            </InteractiveCard>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  title: "Total Queues",
                  value: analytics.totalQueues,
                  icon: Calendar
                },
                {
                  title: "Avg Fill Rate",
                  value: `${analytics.avgFillRate}%`,
                  icon: Target
                },
                {
                  title: "Avg Credits/Slot",
                  value: analytics.avgCreditsPerSlot,
                  icon: Zap
                },
                {
                  title: "Performance Score",
                  value: "8.2/10",
                  icon: BarChart3
                }
              ].map((stat, index) => (
                <InteractiveCard key={stat.title} hoverScale={1.03}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(typeof stat.value === 'string' ? 0 : stat.value).toLocaleString()}
                      {typeof stat.value === 'string' && stat.value.includes('%') && '%'}
                    </div>
                  </CardContent>
                </InteractiveCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Conflict Detection
              </CardTitle>
              <CardDescription>
                Identify and resolve queue assignment conflicts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="font-medium">No conflicts detected!</p>
                  <p className="text-sm">All queue assignments look good.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conflict, index) => (
                    <Alert key={index} className="border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <AlertDescription>
                        <span className="font-medium">{conflict.type.replace('_', ' ').toUpperCase()}:</span> {conflict.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Queue Optimization
              </CardTitle>
              <CardDescription>
                Automatically optimize queue assignments for better performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Genre Distribution</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Ensure balanced genre representation throughout the queue
                  </p>
                  <Button variant="outline" className="w-full">
                    Optimize Genre Balance
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Credit Efficiency</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Maximize credit utilization and supporter engagement
                  </p>
                  <Button variant="outline" className="w-full">
                    Optimize Credits
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Tier Distribution</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Balance artists across different size tiers
                  </p>
                  <Button variant="outline" className="w-full">
                    Optimize Tiers
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Full Optimization</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Apply all optimization strategies at once
                  </p>
                  <Button className="w-full" onClick={optimizeQueue} disabled={!selectedQueue || optimizing}>
                    {optimizing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Optimizing...
                      </>
                    ) : (
                      'Run Full Optimization'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
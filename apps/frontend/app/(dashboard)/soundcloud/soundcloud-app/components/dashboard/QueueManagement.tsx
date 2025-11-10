"use client"

import React, { useState, useEffect } from 'react';
import { Calendar, Play, CheckCircle, AlertCircle, Users, Clock, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';

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

export const QueueManagement: React.FC = () => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [assignments, setAssignments] = useState<QueueAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newQueueDate, setNewQueueDate] = useState('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchQueues();
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
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load queue assignments",
        variant: "destructive",
      });
    }
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
      const { data, error } = await supabase.functions.invoke('generate-queue', {
        body: { date: newQueueDate }
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

  const regenerateQueue = async (date: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-queue', {
        body: { date }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: data.message,
      });

      await fetchQueues();
      if (selectedQueue?.date === date) {
        await fetchQueueAssignments(selectedQueue.id);
      }
    } catch (error) {
      console.error('Error regenerating queue:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to regenerate queue",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground">
            Generate and manage daily support queues
          </p>
        </div>
        
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
                Create a new support queue for a specific date
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Support Date</label>
                <Input
                  type="date"
                  value={newQueueDate}
                  onChange={(e) => setNewQueueDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
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
                  <div
                    key={queue.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleViewQueue(queue)}
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
                      {queue.status === 'published' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            regenerateQueue(queue.date);
                          }}
                          disabled={generating}
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
                          Regenerate
                        </Button>
                      )}
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
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Queue Details
            </CardTitle>
            <CardDescription>
              {selectedQueue 
                ? `Queue for ${format(new Date(selectedQueue.date), 'MMM d, yyyy')}`
                : 'Select a queue to view details'
              }
            </CardDescription>
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

                {selectedQueue.notes && (
                  <div>
                    <span className="font-medium text-sm">Notes:</span>
                    <p className="text-sm text-muted-foreground mt-1">{selectedQueue.notes}</p>
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Track</TableHead>
                        <TableHead>Supporter</TableHead>
                        <TableHead>Credits</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>{assignment.position}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{assignment.submissions.artist_name}</p>
                              <p className="text-xs text-muted-foreground">{assignment.submissions.family}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{assignment.members.name}</TableCell>
                          <TableCell className="text-sm">{assignment.credits_allocated}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a queue to view its assignments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
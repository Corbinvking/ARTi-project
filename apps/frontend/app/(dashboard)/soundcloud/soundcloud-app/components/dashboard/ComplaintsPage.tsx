"use client"

import React, { useState, useEffect } from 'react';
import { AlertTriangle, User, ExternalLink, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';

interface Complaint {
  id: string;
  email: string;
  song_url?: string;
  status: string;
  notes?: string;
  ack_sent_at?: string;
  created_at: string;
  updated_at: string;
  owner_id?: string;
}

interface ComplaintStats {
  total: number;
  todo: number;
  in_progress: number;
  resolved: number;
}

export const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats>({ total: 0, todo: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const fetchComplaints = async () => {
    try {
      let query = supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      setComplaints(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const todo = data?.filter(c => c.status === 'todo').length || 0;
      const in_progress = data?.filter(c => c.status === 'in_progress').length || 0;
      const resolved = data?.filter(c => c.status === 'done').length || 0;

      setStats({ total, todo, in_progress, resolved });
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast({
        title: "Error",
        description: "Failed to load complaints",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateComplaintStatus = async (complaintId: string, status: string) => {
    if (!selectedComplaint) return;

    setUpdating(true);
    try {
      const updates: any = { 
        status,
        notes: responseNotes || selectedComplaint.notes
      };

      // Mark acknowledgment sent when moving to in_progress
      if (status === 'in_progress' && !selectedComplaint.ack_sent_at) {
        updates.ack_sent_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Complaint status updated to ${status}`,
      });

      setSelectedComplaint(null);
      setResponseNotes('');
      await fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      toast({
        title: "Error",
        description: "Failed to update complaint",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'todo':
        return <Badge variant="destructive">New</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'done':
        return <Badge variant="default">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityColor = (createdAt: string) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated > 7) return 'text-red-600';
    if (daysSinceCreated > 3) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  const filteredComplaints = complaints.filter(complaint =>
    complaint.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading complaints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Complaints Management</h1>
        <p className="text-muted-foreground">
          Track, assign, and resolve member complaints
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Complaints</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">New</p>
                <p className="text-2xl font-bold">{stats.todo}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{stats.in_progress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Complaints</CardTitle>
          <CardDescription>
            Manage and resolve member complaints
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredComplaints.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No complaints found matching your criteria.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {complaint.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{complaint.email}</p>
                          {complaint.ack_sent_at && (
                            <p className="text-xs text-muted-foreground">
                              Ack sent {format(new Date(complaint.ack_sent_at), 'MMM d')}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {complaint.song_url ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-sm"
                          onClick={() => window.open(complaint.song_url, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Track
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">No track provided</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                    <TableCell className={`text-sm ${getPriorityColor(complaint.created_at)}`}>
                      {format(new Date(complaint.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setResponseNotes(complaint.notes || '');
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Manage Complaint</DialogTitle>
                            <DialogDescription>
                              Review and update the status of this complaint
                            </DialogDescription>
                          </DialogHeader>
                          {selectedComplaint && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Reporter Email</label>
                                  <p className="text-sm">{selectedComplaint.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Current Status</label>
                                  <div className="mt-1">{getStatusBadge(selectedComplaint.status)}</div>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium">Reported Track</label>
                                {selectedComplaint.song_url ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-1"
                                    onClick={() => window.open(selectedComplaint.song_url, '_blank')}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Track
                                  </Button>
                                ) : (
                                  <p className="text-sm text-muted-foreground mt-1">No track URL provided</p>
                                )}
                              </div>

                              <div>
                                <label className="text-sm font-medium">Response Notes</label>
                                <Textarea
                                  value={responseNotes}
                                  onChange={(e) => setResponseNotes(e.target.value)}
                                  placeholder="Add notes about investigation and resolution..."
                                  className="mt-1"
                                  rows={4}
                                />
                              </div>

                              <div className="flex space-x-2 pt-4">
                                {selectedComplaint.status === 'todo' && (
                                  <Button
                                    onClick={() => updateComplaintStatus(selectedComplaint.id, 'in_progress')}
                                    disabled={updating}
                                    className="flex-1"
                                  >
                                    {updating ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    ) : (
                                      <Clock className="w-4 h-4 mr-2" />
                                    )}
                                    Start Investigation
                                  </Button>
                                )}
                                {selectedComplaint.status === 'in_progress' && (
                                  <Button
                                    onClick={() => updateComplaintStatus(selectedComplaint.id, 'done')}
                                    disabled={updating}
                                    className="flex-1"
                                  >
                                    {updating ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Mark Resolved
                                  </Button>
                                )}
                                {selectedComplaint.status === 'done' && (
                                  <Button
                                    variant="outline"
                                    onClick={() => updateComplaintStatus(selectedComplaint.id, 'in_progress')}
                                    disabled={updating}
                                    className="flex-1"
                                  >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Reopen
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
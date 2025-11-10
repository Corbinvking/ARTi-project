"use client"

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ExternalLink, CheckCircle, AlertCircle, Upload, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';
import { ReportIssueModal } from './ReportIssueModal';

interface Assignment {
  id: string;
  position: number;
  credits_allocated: number;
  status: string;
  completed_at?: string;
  proof_url?: string;
  proof_submitted_at?: string;
  submissions: {
    id: string;
    track_url: string;
    artist_name: string;
    family: string;
    members: {
      name: string;
    };
  };
  queues: {
    date: string;
    status: string;
  };
}

export const MemberQueue: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [reportIssueAssignment, setReportIssueAssignment] = useState<Assignment | null>(null);
  const { member } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (member) {
      fetchAssignments();
    }
  }, [member]);

  const fetchAssignments = async () => {
    if (!member) return;

    try {
      const { data, error } = await supabase
        .from('queue_assignments')
        .select(`
          id,
          position,
          credits_allocated,
          status,
          completed_at,
          proof_url,
          proof_submitted_at,
          submissions!inner(
            id,
            track_url,
            artist_name,
            family,
            members!inner(name)
          ),
          queues!inner(
            date,
            status
          )
        `)
        .eq('supporter_id', member.id)
        .eq('queues.status', 'published')
        .order('queues.date', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load your queue assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitProof = async () => {
    if (!selectedAssignment || !proofUrl.trim()) {
      toast({
        title: "Error",
        description: "Please provide a valid proof URL",
        variant: "destructive",
      });
      return;
    }

    setSubmittingProof(true);
    try {
      const { error } = await supabase
        .from('queue_assignments')
        .update({
          proof_url: proofUrl.trim(),
          proof_submitted_at: new Date().toISOString(),
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', selectedAssignment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Proof submitted successfully!",
      });

      setSelectedAssignment(null);
      setProofUrl('');
      await fetchAssignments();
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast({
        title: "Error",
        description: "Failed to submit proof",
        variant: "destructive",
      });
    } finally {
      setSubmittingProof(false);
    }
  };

  const markAsSkipped = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('queue_assignments')
        .update({
          status: 'skipped',
          completed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Assignment Skipped",
        description: "Assignment marked as skipped",
      });

      await fetchAssignments();
    } catch (error) {
      console.error('Error skipping assignment:', error);
      toast({
        title: "Error",
        description: "Failed to skip assignment",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="outline">Pending</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const todayAssignments = assignments.filter(
    a => format(new Date(a.queues.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const upcomingAssignments = assignments.filter(
    a => new Date(a.queues.date) > new Date() && format(new Date(a.queues.date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')
  );

  const pastAssignments = assignments.filter(
    a => new Date(a.queues.date) < new Date() && format(new Date(a.queues.date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Support Queue</h1>
          <p className="text-muted-foreground">
            View and complete your support assignments
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open('https://app.influenceplanner.com', '_blank')}
          className="flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          View Reposts on Influence Planner
        </Button>
      </div>

      {/* Today's Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Today's Assignments
          </CardTitle>
          <CardDescription>
            Tracks you need to support today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAssignments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No assignments for today. Check back later!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {todayAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{assignment.submissions.artist_name}</span>
                      {getStatusBadge(assignment.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{assignment.submissions.family}</p>
                    <p className="text-sm text-muted-foreground">
                      Credits: {assignment.credits_allocated} • By: {assignment.submissions.members.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(assignment.submissions.track_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Listen
                    </Button>
                    {assignment.status === 'assigned' && (
                      <>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                setProofUrl('');
                              }}
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Submit Proof
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Submit Support Proof</DialogTitle>
                              <DialogDescription>
                                Provide a link showing that you supported this track
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Proof URL</label>
                                <Input
                                  type="url"
                                  placeholder="https://soundcloud.com/your-repost-link"
                                  value={proofUrl}
                                  onChange={(e) => setProofUrl(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Link to your repost, comment, or share on SoundCloud
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  onClick={submitProof}
                                  disabled={submittingProof}
                                  className="flex-1"
                                >
                                  {submittingProof ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Submit Proof
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => markAsSkipped(assignment.id)}
                                >
                                  Skip
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Assignments */}
      {upcomingAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Upcoming Assignments
            </CardTitle>
            <CardDescription>
              Future support assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingAssignments.slice(0, 10).map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {format(new Date(assignment.queues.date), 'MMM d')}
                    </TableCell>
                    <TableCell>{assignment.submissions.artist_name}</TableCell>
                    <TableCell>{assignment.submissions.members.name}</TableCell>
                    <TableCell>{assignment.submissions.family}</TableCell>
                    <TableCell>{assignment.credits_allocated}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(assignment.submissions.track_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReportIssueAssignment(assignment)}
                        >
                          <Flag className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent History */}
      {pastAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent History</CardTitle>
            <CardDescription>
              Your past support activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastAssignments.slice(0, 10).map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {format(new Date(assignment.queues.date), 'MMM d')}
                    </TableCell>
                    <TableCell>{assignment.submissions.artist_name}</TableCell>
                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                    <TableCell>{assignment.credits_allocated}</TableCell>
                    <TableCell>
                      {assignment.proof_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(assignment.proof_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Report Issue Modal */}
      {reportIssueAssignment && (
        <ReportIssueModal
          isOpen={!!reportIssueAssignment}
          onClose={() => setReportIssueAssignment(null)}
          assignment={reportIssueAssignment}
        />
      )}
    </div>
  );
};
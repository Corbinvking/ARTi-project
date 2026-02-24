"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import {
  FileText,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Calendar,
  ArrowUpDown,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import '../../utils/generateQueueAssignments'; // Generate missing queue assignments

type SubmissionStatus = 'pending' | 'ready' | 'active' | 'complete' | 'on_hold' | 'qa_flag';

interface Submission {
  id: string;
  track_url: string;
  artist_name: string;
  status: string;
  submitted_at: string;
  support_date: string | null;
  notes: string;
  qa_reason: string;
  family: string;
  subgenres: string[];
  member_id: string;
  support_url: string;
  need_live_link: boolean;
  expected_reach_planned: number;
  expected_reach_max: number;
  expected_reach_min: number;
  members: {
    id: string;
    name: string;
    primary_email: string;
    size_tier: string;
    status: string;
  };
}

export const SubmissionsPage = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [sortBy, setSortBy] = useState('submitted_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
    ready: { label: 'Ready', color: 'bg-blue-500', icon: CheckCircle },
    active: { label: 'Active', color: 'bg-green-500', icon: CheckCircle },
    complete: { label: 'Complete', color: 'bg-blue-500', icon: CheckCircle },
    on_hold: { label: 'On Hold', color: 'bg-red-500', icon: XCircle },
    qa_flag: { label: 'QA Flag', color: 'bg-orange-500', icon: AlertTriangle },
  };

  const fetchSubmissions = async () => {
    try {
      let query = supabase
        .from('submissions')
        .select(`
          *,
          members:member_id (
            id,
            name,
            primary_email,
            size_tier,
            status,
            soundcloud_followers
          )
        `)
        .order(sortBy, { ascending: sortDirection === 'asc' });

      if (statusFilter === 'active') {
        query = query.eq('status', 'active');
      } else if (statusFilter === 'complete') {
        query = query.eq('status', 'complete');
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as SubmissionStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSubmissions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, sortBy, sortDirection]);

  const updateSubmissionStatus = async (submissionId: string, newStatus: SubmissionStatus, rejectionReason?: string) => {
    try {
      const updatePayload: any = { status: newStatus };
      if (newStatus === 'on_hold' && rejectionReason) {
        updatePayload.rejection_reason = rejectionReason;
      }
      if (newStatus !== 'on_hold') {
        updatePayload.rejection_reason = null;
      }

      const { error } = await supabase
        .from('submissions')
        .update(updatePayload)
        .eq('id', submissionId);

      if (error) throw error;

      // Send email notification for status changes
      if (newStatus === 'ready' || newStatus === 'on_hold') {
        const submission = submissions.find(s => s.id === submissionId);
        if (submission?.members) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
              body: {
                to: submission.members.primary_email,
                template: newStatus === 'ready' ? 'support-confirmation' : 'submission-rejected',
                data: {
                  firstName: submission.members.name.split(' ')[0],
                  songName: submission.artist_name || 'Your Track',
                  confirmDate: newStatus === 'ready' ? 'TBD' : undefined
                },
                userId: submission.member_id,
                notificationData: {
                  title: newStatus === 'ready' ? 'Submission Ready' : 'Submission On Hold',
                  message: newStatus === 'ready' 
                    ? 'Your track has been approved for support' 
                    : 'Your track submission was not approved this time.',
                  type: newStatus === 'ready' ? 'success' : 'warning'
                },
                relatedObjectType: 'submission',
                relatedObjectId: submissionId
              }
            });
            
            if (emailError) {
              console.error('Email sending failed:', emailError);
            }
          } catch (emailError) {
            console.error('Email function call failed:', emailError);
          }
        }
      }

      toast({
        title: "Status Updated",
        description: `Submission status changed to ${statusConfig[newStatus]?.label || newStatus}`,
      });

      fetchSubmissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const filteredSubmissions = submissions.filter(submission =>
    submission.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.members?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.track_url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const handleViewDetails = (submission: Submission) => {
    setSelectedSubmission(submission);
    setModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-500',
      icon: FileText
    };
    
    return (
      <Badge className={`${config.color} text-white hover:${config.color}/80`}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading submissions...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Submissions</h1>
          <p className="text-muted-foreground">Manage and review track submissions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by artist, member, or track URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="qa_flag">QA Flag</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_at">Latest First</SelectItem>
                <SelectItem value="artist_name">Artist Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
          <CardDescription>
            Review and manage track submissions from members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No submissions found matching your criteria</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('artist_name')}
                    >
                      <div className="flex items-center gap-1">
                        Artist
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('member_id')}
                    >
                      <div className="flex items-center gap-1">
                        Member
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('submitted_at')}
                    >
                      <div className="flex items-center gap-1">
                        Submitted
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{submission.artist_name}</span>
                          <a
                            href={submission.track_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Track
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{submission.members?.name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">
                            {submission.members?.primary_email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(submission.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {submission.family || 'Not set'}
                          {submission.subgenres?.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {submission.subgenres.join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.support_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(submission.support_date), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(submission)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          {submission.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateSubmissionStatus(submission.id, 'ready')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const reason = window.prompt(
                                    'Rejection reason (shown to member):\n\n' +
                                    '- Genre mismatch\n- Not original track\n- Audio quality\n' +
                                    '- Release timing issue\n- Back catalog submission\n- Other'
                                  );
                                  if (reason !== null) {
                                    updateSubmissionStatus(submission.id, 'on_hold', reason || undefined);
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {submission.status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateSubmissionStatus(submission.id, 'pending')}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SubmissionDetailModal
        submission={selectedSubmission}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdate={() => {
          fetchSubmissions();
          setModalOpen(false);
        }}
      />
    </div>
  );
};
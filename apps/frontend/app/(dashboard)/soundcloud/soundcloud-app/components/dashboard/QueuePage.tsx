"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Inbox, CheckCircle, XCircle, Clock, Filter, Search, ExternalLink, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSubmissions } from '../../hooks/useSubmissions';
import { useSubmissionsList } from '../../hooks/useSubmissionsList';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { ArtistAssignmentModal } from './ArtistAssignmentModal';
import { formatDistanceToNow } from 'date-fns';
import { estimateReach } from '../ui/soundcloud-reach-estimator';

export const QueuePage = () => {
  const { stats } = useSubmissions();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [submissionForAssignment, setSubmissionForAssignment] = useState(null);
  
  // Fetch submissions based on active tab
  const { submissions, loading, refetch, updateSubmissionStatus } = useSubmissionsList(
    activeTab === 'all' ? undefined : activeTab
  );

  const handleApprove = (submission: any) => {
    setSubmissionForAssignment(submission);
    setAssignmentModalOpen(true);
  };

  const handleReject = async (submissionId: string) => {
    await updateSubmissionStatus(submissionId, 'on_hold');
  };

  const handleViewDetails = (submission: any) => {
    setSelectedSubmission(submission);
    setDetailModalOpen(true);
  };

  const handleArtistAssignmentConfirm = async (selectedArtists: string[]) => {
    if (submissionForAssignment) {
      await updateSubmissionStatus(submissionForAssignment.id, 'ready', selectedArtists);
      setSubmissionForAssignment(null);
    }
  };

  const renderSubmissionsTable = (submissionsList: any[]) => {
    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading submissions...</div>
        </div>
      );
    }

    if (submissionsList.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-muted-foreground">No submissions found</div>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Track</TableHead>
            <TableHead>Artist</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scheduled Date</TableHead>
            <TableHead>Member Followers</TableHead>
            <TableHead>Suggested Reach</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissionsList.map((submission) => (
            <TableRow 
              key={submission.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleViewDetails(submission)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-medium">{submission.track_name || 'Untitled'}</div>
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
                </div>
              </TableCell>
              <TableCell className="font-medium">{submission.artist_name}</TableCell>
              <TableCell>
                <div>
                  <div className="text-sm">{submission.members?.name}</div>
                  <div className="text-xs text-muted-foreground">{submission.members?.size_tier}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {submission.family && (
                    <Badge variant="secondary" className="text-xs">{submission.family}</Badge>
                  )}
                  {submission.subgenres?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {submission.subgenres.slice(0, 2).map((genre: string) => (
                        <Badge key={genre} variant="outline" className="text-xs">{genre}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={
                  submission.status === 'approved' ? 'default' :
                  submission.status === 'rejected' ? 'destructive' :
                  submission.status === 'pending' ? 'secondary' : 'outline'
                 }>
                   {submission.status}
                 </Badge>
               </TableCell>
               <TableCell>
                 <div className="text-sm">
                   {submission.scheduled_date ? (
                     <div className="flex items-center gap-1">
                       <span>{new Date(submission.scheduled_date).toLocaleDateString()}</span>
                       <Badge variant="default" className="text-xs">Scheduled</Badge>
                     </div>
                   ) : (
                     <span className="text-muted-foreground">Not scheduled</span>
                   )}
                 </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {submission.members?.soundcloud_followers?.toLocaleString() || 'N/A'}
                  </div>
                </TableCell>
               <TableCell>
                 <div className="text-sm">
                   {(() => {
                     // Calculate suggested reach based on member's follower count
                     const memberFollowers = submission.members?.soundcloud_followers || 25000;
                     const estimate = estimateReach(memberFollowers);
                     return estimate ? estimate.reach_median.toLocaleString() : 'N/A';
                   })()}
                 </div>
               </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{submission.members?.repost_credit_wallet?.balance || 0} available</div>
                  <Badge variant={(submission.members?.repost_credit_wallet?.balance || 0) > 0 ? 'default' : 'destructive'} className="text-xs">
                    {(submission.members?.repost_credit_wallet?.balance || 0) > 0 ? 'Sufficient' : 'Insufficient'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
              </TableCell>
               <TableCell>
                 <div className="flex items-center gap-1">
                   {activeTab === 'pending' && (
                     <>
                       <Button 
                         size="sm" 
                         className="h-8 px-2 bg-green-600 hover:bg-green-700"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleApprove(submission);
                         }}
                       >
                         <CheckCircle className="h-3 w-3 mr-1" />
                         Approve
                       </Button>
                       <Button 
                         size="sm" 
                         variant="destructive" 
                         className="h-8 px-2"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleReject(submission.id);
                         }}
                       >
                         <XCircle className="h-3 w-3 mr-1" />
                         Reject
                       </Button>
                     </>
                   )}
                 </div>
               </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Queue (Free)</h1>
          <p className="text-muted-foreground">
            Submissions inbox with approve/reject workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search submissions..." className="pl-9 w-64" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ready}</div>
            <p className="text-xs text-muted-foreground">
              Ready to schedule
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting scheduling
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.on_hold}</div>
            <p className="text-xs text-muted-foreground">
              Total on hold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="ready" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Ready ({stats.ready})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active ({stats.active})
          </TabsTrigger>
          <TabsTrigger value="on_hold" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            On Hold ({stats.on_hold})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Submissions</CardTitle>
              <CardDescription>
                Review and approve/reject submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSubmissionsTable(submissions)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ready">
          <Card>
            <CardHeader>
              <CardTitle>Ready Submissions</CardTitle>
              <CardDescription>
                Submissions ready for scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSubmissionsTable(submissions)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Submissions</CardTitle>
              <CardDescription>
                Submissions in progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSubmissionsTable(submissions)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="on_hold">
          <Card>
            <CardHeader>
              <CardTitle>On Hold Submissions</CardTitle>
              <CardDescription>
                Submissions on hold
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSubmissionsTable(submissions)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onUpdate={refetch}
      />

      <ArtistAssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        onConfirm={handleArtistAssignmentConfirm}
        submission={submissionForAssignment}
      />
    </div>
  );
};
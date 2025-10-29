"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle, Clock } from 'lucide-react';
import { useCampaignSubmissions, useRejectCampaignSubmission } from '../hooks/useCampaignSubmissions';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from "next/navigation";

interface CampaignSubmissionsManagerProps {
  highlightSubmissionId?: string | null;
}

export function CampaignSubmissionsManager({ highlightSubmissionId }: CampaignSubmissionsManagerProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const router = useRouter();

  const { data: submissions = [], isLoading } = useCampaignSubmissions();
  const rejectMutation = useRejectCampaignSubmission();

  // Scroll to highlighted submission when it becomes available
  useEffect(() => {
    if (highlightSubmissionId && !isLoading) {
      setTimeout(() => {
        const highlightedCard = document.querySelector(`[data-submission-id="${highlightSubmissionId}"]`);
        highlightedCard?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [highlightSubmissionId, isLoading, submissions]);

  const handleReject = async (submissionId: string) => {
    if (!rejectionReason.trim()) return;
    
    await rejectMutation.mutateAsync({
      submissionId,
      reason: rejectionReason
    });
    
    setRejectionReason('');
    setSelectedSubmission(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'default';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading submissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Campaign Submissions</h2>
          <p className="text-muted-foreground">
            Review and approve campaign submissions from salespeople
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            {submissions.filter(s => s.status === 'pending_approval').length} Pending Review
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3">
          {submissions.map((submission) => {
            const isHighlighted = highlightSubmissionId === submission.id;
            return (
              <Card 
                key={submission.id} 
                data-submission-id={submission.id}
                className={`hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent ${
                  isHighlighted 
                    ? 'ring-1 ring-primary/50 bg-primary/5 border-l-primary' 
                    : 'hover:border-l-primary/30'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base leading-tight">{submission.campaign_name}</CardTitle>
                      <Badge variant={getStatusColor(submission.status) as any} className="text-xs">
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Client: {submission.client_name} • Salesperson: {submission.salesperson}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Compact Campaign Details */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs leading-tight">
                    <div>
                      <span className="font-medium text-muted-foreground">Budget</span>
                      <div className="text-sm font-medium">${submission.price_paid.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Stream Goal</span>
                      <div className="text-sm font-medium">{submission.stream_goal.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Start Date</span>
                      <div className="text-sm font-medium">{new Date(submission.start_date).toLocaleDateString()}</div>
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <span className="font-medium text-muted-foreground">Client Emails</span>
                      <div className="text-sm text-muted-foreground truncate">{submission.client_emails.join(', ')}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Track</span>
                      <div className="text-sm">
                        <a 
                          href={submission.track_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate block"
                        >
                          View Track
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* SFA URL - if provided */}
                  {(submission as any).sfa_url && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">Spotify for Artists: </span>
                      <a 
                        href={(submission as any).sfa_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View SFA Dashboard
                      </a>
                    </div>
                  )}

                  {/* Vendor Assignments - if any */}
                  {(submission as any).vendor_assignments && (submission as any).vendor_assignments.length > 0 && (
                    <div className="text-xs bg-primary/5 p-2 rounded border border-primary/20">
                      <span className="font-medium">Vendor Assignments ({(submission as any).vendor_assignments.length}):</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(submission as any).vendor_assignments.map((va: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {va.vendor_name}: {va.allocated_streams.toLocaleString()} streams / ${va.allocated_budget.toLocaleString()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes - Compact */}
                  {submission.notes && (
                    <div className="text-xs bg-muted/50 p-2 rounded">
                      <span className="font-medium">Notes:</span> {submission.notes}
                    </div>
                  )}

                  {/* Rejection Reason - Compact */}
                  {submission.status === 'rejected' && submission.rejection_reason && (
                    <div className="text-xs p-2 bg-destructive/10 rounded">
                      <span className="font-medium text-destructive">Rejected:</span> {submission.rejection_reason}
                    </div>
                  )}

                  {/* Inline Action Buttons */}
                  {submission.status === 'pending_approval' && (
                    <div className="flex gap-2 pt-1">
                       <Button
                         onClick={() => router.push(`/campaign-builder/review/${submission.id}`)}
                         size="sm"
                         className="bg-primary hover:bg-primary/90 text-xs h-7"
                       >
                         Review & Approve
                       </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setSelectedSubmission(submission.id)}
                          >
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Campaign Submission</DialogTitle>
                            <DialogDescription>
                              Please provide a reason for rejecting "{submission.campaign_name}"
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Label>Rejection Reason</Label>
                            <Textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Please explain why this campaign is being rejected..."
                              rows={3}
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setRejectionReason('');
                                setSelectedSubmission(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleReject(submission.id)}
                              disabled={!rejectionReason.trim() || rejectMutation.isPending}
                            >
                              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Campaign'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                   )}
                 </CardContent>
               </Card>
            );
          })}

          {submissions.filter(s => s.status === 'pending_approval').length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending submissions</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Campaign submissions will appear here when salespeople submit new campaigns for review.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}









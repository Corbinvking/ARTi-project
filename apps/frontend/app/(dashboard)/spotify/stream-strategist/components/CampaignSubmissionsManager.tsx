"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle, Clock, Eye, Hourglass, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCampaignSubmissions, useRejectCampaignSubmission, useApproveCampaignSubmission, useCampaignsAwaitingVendor } from '../hooks/useCampaignSubmissions';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CampaignSubmissionsManagerProps {
  highlightSubmissionId?: string | null;
}

export function CampaignSubmissionsManager({ highlightSubmissionId }: CampaignSubmissionsManagerProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const router = useRouter();

  const { data: submissions = [], isLoading } = useCampaignSubmissions();
  const { data: campaignsAwaitingVendor = [], isLoading: awaitingLoading } = useCampaignsAwaitingVendor();
  const rejectMutation = useRejectCampaignSubmission();
  const approveMutation = useApproveCampaignSubmission();
  
  console.log('CampaignSubmissionsManager - Submissions:', submissions.length, 'isLoading:', isLoading);
  if (submissions.length > 0) {
    console.log('CampaignSubmissionsManager - First submission:', submissions[0].campaign_name);
  }
  
  const selectedSubmission = submissions.find(s => s.id === selectedSubmissionId) || null;

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

  const handleApprove = async (submissionId: string) => {
    try {
      await approveMutation.mutateAsync(submissionId);
      setShowDetailModal(false);
      setSelectedSubmissionId(null);
    } catch (error) {
      console.error('Failed to approve submission:', error);
    }
  };

  const handleReject = async (submissionId: string, reason: string) => {
    try {
      await rejectMutation.mutateAsync({
        submissionId,
        reason
      });
      setShowDetailModal(false);
      setSelectedSubmissionId(null);
    } catch (error) {
      console.error('Failed to reject submission:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'ready': return 'success';
      case 'active': return 'success';
      case 'complete': return 'secondary';
      case 'on_hold': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'ready': return 'Ready';
      case 'active': return 'Active';
      case 'complete': return 'Complete';
      case 'on_hold': return 'On Hold';
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
            {submissions.filter(s => s.status === 'pending').length} Pending
          </Badge>
          {campaignsAwaitingVendor.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Hourglass className="h-3 w-3 mr-1" />
              {campaignsAwaitingVendor.length} Awaiting Vendor
            </Badge>
          )}
        </div>
      </div>

      {/* Campaigns Awaiting Vendor Response Section */}
      {campaignsAwaitingVendor.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Awaiting Vendor Response</h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {campaignsAwaitingVendor.length} campaigns
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            These campaigns have been created and are waiting for vendors to accept. Vendors must start/accept before campaigns become fully active.
          </p>
          <div className="grid gap-3">
            {campaignsAwaitingVendor.map((campaign) => (
              <Card 
                key={campaign.id} 
                className="border-l-4 border-l-blue-400 bg-blue-50/30 dark:bg-blue-950/10"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base leading-tight">{campaign.name}</CardTitle>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                        <Hourglass className="h-3 w-3 mr-1" />
                        Waiting for Vendor
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Client: {campaign.client_name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Campaign Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs leading-tight">
                    <div>
                      <span className="font-medium text-muted-foreground">Budget</span>
                      <div className="text-sm font-medium">${campaign.budget?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Stream Goal</span>
                      <div className="text-sm font-medium">{campaign.stream_goal?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Start Date</span>
                      <div className="text-sm font-medium">{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : '-'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Track</span>
                      <div className="text-sm">
                        {campaign.track_url ? (
                          <a 
                            href={campaign.track_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View Track
                          </a>
                        ) : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Vendor Status Summary */}
                  <div className="flex items-center gap-4 text-xs bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-500" />
                      <span className="font-medium">{campaign.pending_count} Pending</span>
                    </div>
                    {campaign.approved_count > 0 && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="font-medium">{campaign.approved_count} Ready</span>
                      </div>
                    )}
                    {campaign.rejected_count > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-3 w-3" />
                        <span className="font-medium">{campaign.rejected_count} On Hold</span>
                      </div>
                    )}
                  </div>

                  {/* Pending Vendors List */}
                  <div className="flex flex-wrap gap-2">
                    {campaign.pending_vendors.map((vendor, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1 text-amber-500" />
                        {vendor.vendor_name}
                        <span className="text-muted-foreground ml-1">
                          ({formatDistanceToNow(new Date(vendor.requested_at), { addSuffix: true })})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
                  {submission.status === 'on_hold' && submission.rejection_reason && (
                    <div className="text-xs p-2 bg-destructive/10 rounded">
                      <span className="font-medium text-destructive">Rejected:</span> {submission.rejection_reason}
                    </div>
                  )}

                  {/* Inline Action Buttons */}
                  {submission.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                       <Button
                         onClick={() => {
                           setSelectedSubmissionId(submission.id);
                           setShowDetailModal(true);
                         }}
                         size="sm"
                         className="bg-primary hover:bg-primary/90 text-xs h-7"
                       >
                         <Eye className="h-3 w-3 mr-1" />
                         Review & Approve
                       </Button>
                    </div>
                   )}
                 </CardContent>
               </Card>
            );
          })}

          {submissions.filter(s => s.status === 'pending').length === 0 && (
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

      {/* Submission Detail Modal */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSubmissionId(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={approveMutation.isPending}
        isRejecting={rejectMutation.isPending}
      />
    </div>
  );
}









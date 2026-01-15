"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  User, 
  Mail, 
  CheckCircle,
  XCircle,
  Clock,
  Music,
  Globe,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../hooks/use-toast';

interface VendorAssignment {
  vendor_id: string;
  vendor_name: string;
  allocated_streams: number;
  allocated_budget: number;
  playlist_ids?: string[];
}

interface Submission {
  id: string;
  campaign_name: string;
  client_name: string;
  client_id?: string;
  client_emails: string[];
  salesperson: string;
  track_url: string;
  sfa_url?: string;
  stream_goal: number;
  price_paid: number;
  start_date: string;
  duration_days: number;
  music_genres?: string[];
  territory_preferences?: string[];
  notes?: string;
  status: string;
  vendor_assignments?: VendorAssignment[];
  rejection_reason?: string;
  created_at: string;
}

interface SubmissionDetailModalProps {
  submission: Submission | null;
  open: boolean;
  onClose: () => void;
  onApprove: (submissionId: string) => void;
  onReject: (submissionId: string, reason: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function SubmissionDetailModal({
  submission,
  open,
  onClose,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: SubmissionDetailModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();

  if (!submission) return null;

  const handleApprove = () => {
    onApprove(submission.id);
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this submission",
        variant: "destructive",
      });
      return;
    }
    onReject(submission.id, rejectionReason);
    setRejectionReason('');
    setShowRejectDialog(false);
  };

  const totalAllocatedStreams = submission.vendor_assignments?.reduce(
    (sum, va) => sum + va.allocated_streams, 0
  ) || 0;
  
  const totalAllocatedBudget = submission.vendor_assignments?.reduce(
    (sum, va) => sum + va.allocated_budget, 0
  ) || 0;

  // Calculate client's cost per 1K streams (what they pay us)
  const clientCostPer1K = submission.stream_goal > 0 
    ? (submission.price_paid / submission.stream_goal * 1000)
    : 0;

  // Calculate average vendor rate from actual allocations
  const vendorAssignments = submission.vendor_assignments || [];
  const avgVendorRatePer1K = vendorAssignments.length > 0 && totalAllocatedStreams > 0
    ? vendorAssignments.reduce((sum, va) => {
        // Cost per 1K for this vendor = (allocated_budget / allocated_streams) * 1000
        const vendorRate = va.allocated_streams > 0 
          ? (va.allocated_budget / va.allocated_streams * 1000) 
          : 0;
        // Weight by streams allocated
        return sum + (vendorRate * va.allocated_streams);
      }, 0) / totalAllocatedStreams
    : null;
  
  // Estimated margin (client rate - vendor rate)
  const estimatedMarginPer1K = avgVendorRatePer1K !== null && clientCostPer1K > 0
    ? clientCostPer1K - avgVendorRatePer1K
    : null;

  return (
    <>
      <Dialog open={open && !showRejectDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Music className="h-6 w-6 text-primary" />
              {submission.campaign_name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant={submission.status === 'pending_approval' ? 'default' : 'secondary'}>
                {submission.status === 'pending_approval' ? 'Pending Approval' : submission.status}
              </Badge>
              <span className="text-muted-foreground">
                Submitted {format(new Date(submission.created_at), 'PPp')}
              </span>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Campaign Details</TabsTrigger>
              <TabsTrigger value="vendors">
                Vendor Assignments
                {submission.vendor_assignments && submission.vendor_assignments.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {submission.vendor_assignments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="additional">Additional Info</TabsTrigger>
            </TabsList>

            {/* Tab 1: Campaign Details */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Client Name</Label>
                      <p className="font-medium">{submission.client_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Salesperson</Label>
                      <p className="font-medium">{submission.salesperson}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Client Emails
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {submission.client_emails.map((email, idx) => (
                        <Badge key={idx} variant="outline">{email}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Track Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Spotify Track URL</Label>
                    <a
                      href={submission.track_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Spotify
                    </a>
                  </div>
                  {submission.sfa_url && (
                    <div>
                      <Label className="text-muted-foreground">Spotify for Artists URL</Label>
                      <a
                        href={submission.sfa_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View SFA Dashboard
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Campaign Goals & Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Stream Goal</Label>
                      <p className="text-xl font-bold">{submission.stream_goal.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Budget</Label>
                      <p className="text-xl font-bold">${submission.price_paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Client Rate/1K</Label>
                      <p className="text-xl font-bold">${clientCostPer1K.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Avg Vendor Rate/1K</Label>
                      <p className="text-xl font-bold">
                        {avgVendorRatePer1K !== null 
                          ? `$${avgVendorRatePer1K.toFixed(2)}`
                          : <span className="text-muted-foreground text-base">Not assigned</span>
                        }
                      </p>
                    </div>
                  </div>
                  {estimatedMarginPer1K !== null && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Est. Margin per 1K Streams</Label>
                        <p className={`text-lg font-bold ${estimatedMarginPer1K >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${estimatedMarginPer1K.toFixed(2)} ({((estimatedMarginPer1K / clientCostPer1K) * 100).toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Start Date</Label>
                      <p className="font-medium">{format(new Date(submission.start_date), 'PPP')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Duration</Label>
                      <p className="font-medium">{submission.duration_days} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Vendor Assignments */}
            <TabsContent value="vendors" className="space-y-4 mt-4">
              {submission.vendor_assignments && submission.vendor_assignments.length > 0 ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Allocation Summary</CardTitle>
                      <CardDescription>
                        Total allocations across all vendors
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Total Allocated Streams</Label>
                          <p className="text-lg font-bold">{totalAllocatedStreams.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {((totalAllocatedStreams / submission.stream_goal) * 100).toFixed(0)}% of goal
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Total Allocated Budget</Label>
                          <p className="text-lg font-bold">${totalAllocatedBudget.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {((totalAllocatedBudget / submission.price_paid) * 100).toFixed(0)}% of budget
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Remaining Streams</Label>
                          <p className="text-lg font-bold text-muted-foreground">
                            {(submission.stream_goal - totalAllocatedStreams).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Remaining Budget</Label>
                          <p className="text-lg font-bold text-muted-foreground">
                            ${(submission.price_paid - totalAllocatedBudget).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {submission.vendor_assignments.map((assignment, idx) => {
                      const vendorCostPerStream = assignment.allocated_streams > 0
                        ? (assignment.allocated_budget / assignment.allocated_streams * 1000).toFixed(2)
                        : '0.00';
                      
                      return (
                        <Card key={idx}>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                {assignment.vendor_name}
                              </span>
                              <Badge variant="outline">Vendor #{idx + 1}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-muted-foreground">Allocated Streams</Label>
                                <p className="text-lg font-bold">{assignment.allocated_streams.toLocaleString()}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Allocated Budget</Label>
                                <p className="text-lg font-bold">${assignment.allocated_budget.toLocaleString()}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Cost per 1K Streams</Label>
                                <p className="text-lg font-bold">${vendorCostPerStream}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No vendor assignments for this submission</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Vendors can be assigned during the approval process
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab 3: Additional Info */}
            <TabsContent value="additional" className="space-y-4 mt-4">
              {submission.music_genres && submission.music_genres.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Music Genres
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {submission.music_genres.map((genre, idx) => (
                        <Badge key={idx} variant="secondary">{genre}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {submission.territory_preferences && submission.territory_preferences.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Territory Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {submission.territory_preferences.map((territory, idx) => (
                        <Badge key={idx} variant="outline">{territory}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {submission.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{submission.notes}</p>
                  </CardContent>
                </Card>
              )}

              {submission.rejection_reason && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-base text-destructive flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Rejection Reason
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{submission.rejection_reason}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {submission.status === 'pending_approval' && (
            <DialogFooter className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isApproving || isRejecting}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                disabled={isApproving || isRejecting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Create Campaign
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Reject Campaign Submission
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{submission.campaign_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please explain why this campaign is being rejected..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectionReason('');
                setShowRejectDialog(false);
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={!rejectionReason.trim() || isRejecting}
            >
              {isRejecting ? 'Rejecting...' : 'Reject Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Music, DollarSign, Target } from 'lucide-react';
import { useVendorCampaignRequests, usePendingSubmissionsForVendor, useVendorRequestHistory } from '../hooks/useVendorCampaignRequests';
import { VendorCampaignRequestModal } from './VendorCampaignRequestModal';
import { formatDistanceToNow } from 'date-fns';
import { Hourglass, ExternalLink } from 'lucide-react';

export function VendorCampaignRequestsManager() {
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const { data: requests = [], isLoading } = useVendorCampaignRequests();
  const { data: pendingSubmissions = [], isLoading: pendingLoading } = usePendingSubmissionsForVendor();
  const { data: requestHistory = [] } = useVendorRequestHistory();

  const handleReviewRequest = (request: any) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const handleCloseModal = () => {
    setShowRequestModal(false);
    setSelectedRequest(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading && pendingLoading) {
    return <div className="flex justify-center p-8">Loading campaign requests...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const awaitingAdminCount = pendingSubmissions.length;
  const potentialRevenue = pendingRequests.reduce((sum, req) => {
    const streams = req.playlists?.reduce((pSum, p) => pSum + p.avg_daily_streams, 0) || 0;
    return sum + (streams * 0.001 * (req.campaign?.duration_days || 30)); // Rough calculation
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Campaign Requests</h2>
          <p className="text-muted-foreground">
            Review and respond to campaign participation requests
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Admin</CardTitle>
            <Hourglass className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{awaitingAdminCount}</div>
            <p className="text-xs text-muted-foreground">
              Pending admin approval
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Accept</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your response
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(potentialRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From pending requests
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Streams</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingRequests.reduce((sum, req) => {
                const streams = req.playlists?.reduce((pSum, p) => pSum + p.avg_daily_streams, 0) || 0;
                return sum + (streams * (req.campaign?.duration_days || 30));
              }, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total potential streams
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Awaiting Admin Approval Section */}
      {pendingSubmissions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Awaiting Admin Approval</h3>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {pendingSubmissions.length} pending
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            These campaigns include your playlists and are waiting for admin approval. Once approved, you'll be able to accept or decline.
          </p>
          <div className="grid gap-3">
            {pendingSubmissions.map((submission) => (
              <Card key={submission.id} className="border-l-4 border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{submission.campaign_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Client: {submission.client_name} • Submitted {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      <Hourglass className="h-3 w-3 mr-1" />
                      Awaiting Admin
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Campaign Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Your Allocation:</span>
                      <div>{submission.vendor_allocation.allocated_streams.toLocaleString()} streams</div>
                    </div>
                    <div>
                      <span className="font-medium">Your Budget:</span>
                      <div>{formatCurrency(submission.vendor_allocation.allocated_budget)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Start Date:</span>
                      <div>{new Date(submission.start_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <div>{submission.duration_days} days</div>
                    </div>
                  </div>

                  {/* Track URL */}
                  {submission.track_url && (
                    <div className="text-sm">
                      <span className="font-medium">Track:</span>
                      <div>
                        <a 
                          href={submission.track_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View Track <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Requested Playlists */}
                  {submission.playlists && submission.playlists.length > 0 ? (
                    <div className="text-sm">
                      <span className="font-medium">Your Playlists ({submission.playlists.length}):</span>
                      <div className="mt-2 space-y-1">
                        {submission.playlists.map((playlist) => (
                          <div key={playlist.id} className="flex justify-between items-center py-1 px-2 bg-white/50 dark:bg-white/5 rounded text-xs">
                            <span className="flex items-center gap-2">
                              <Music className="h-3 w-3" />
                              {playlist.name}
                            </span>
                            <span className="text-muted-foreground">
                              {playlist.avg_daily_streams.toLocaleString()} daily streams
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm p-2 bg-muted/30 rounded text-muted-foreground">
                      <span className="font-medium">Playlists:</span> No specific playlists selected yet - you'll choose when accepting
                    </div>
                  )}

                  {/* Music Genres */}
                  {submission.music_genres && submission.music_genres.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Music Genres:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {submission.music_genres.map((genre, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info Banner */}
                  <div className="flex items-center gap-2 p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-md text-sm text-amber-800 dark:text-amber-200">
                    <Clock className="h-4 w-4" />
                    <span>This campaign is pending admin approval. You'll be notified when it's ready for your response.</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Requests Ready for Your Response */}
      <div className="space-y-4">
        {(pendingSubmissions.length > 0 || requests.length > 0) && (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Ready for Your Response</h3>
            {pendingRequests.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {pendingRequests.length} to review
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Requests List */}
      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{request.campaign?.name || 'Campaign Request'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Brand: {request.campaign?.brand_name} • Requested {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(request.status) as any} className="flex items-center gap-1">
                    {getStatusIcon(request.status)}
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campaign Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Budget:</span>
                  <div>{formatCurrency(request.campaign?.budget || 0)}</div>
                </div>
                <div>
                  <span className="font-medium">Start Date:</span>
                  <div>{request.campaign?.start_date ? new Date(request.campaign.start_date).toLocaleDateString() : 'TBD'}</div>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <div>{request.campaign?.duration_days || 0} days</div>
                </div>
                <div>
                  <span className="font-medium">Stream Goal:</span>
                  <div>{request.campaign?.stream_goal?.toLocaleString() || 'Not specified'}</div>
                </div>
              </div>

              {/* Track Details */}
              {request.campaign?.track_url && (
                <div className="text-sm">
                  <span className="font-medium">Track:</span>
                  <div className="text-muted-foreground">
                    <a 
                      href={request.campaign.track_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {request.campaign.track_name || request.campaign.track_url}
                    </a>
                  </div>
                </div>
              )}

              {/* Requested Playlists */}
              {request.playlists && request.playlists.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Requested Playlists ({request.playlists.length}):</span>
                  <div className="mt-2 space-y-1">
                    {request.playlists.map((playlist) => (
                      <div key={playlist.id} className="flex justify-between items-center py-1 px-2 bg-accent/5 rounded text-xs">
                        <span className="flex items-center gap-2">
                          <Music className="h-3 w-3" />
                          {playlist.name}
                        </span>
                        <span className="text-muted-foreground">
                          {playlist.avg_daily_streams.toLocaleString()} daily streams
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Music Genres */}
              {request.campaign?.music_genres && request.campaign.music_genres.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Music Genres:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {request.campaign.music_genres.map((genre, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Notes */}
              {request.response_notes && (
                <div className="text-sm p-3 bg-accent/10 rounded-md">
                  <span className="font-medium">Your Response Notes:</span>
                  <div className="text-muted-foreground">{request.response_notes}</div>
                </div>
              )}

              {/* Action Buttons */}
              {request.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleReviewRequest(request)}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Music className="h-4 w-4 mr-2" />
                    Review & Modify Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {requests.length === 0 && pendingSubmissions.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Campaign Requests</h3>
              <p className="text-muted-foreground">
                You don't have any campaign participation requests at the moment.
              </p>
            </CardContent>
          </Card>
        )}

        {requests.length === 0 && pendingSubmissions.length > 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1">No Requests Ready Yet</h3>
              <p className="text-muted-foreground text-sm">
                You have {pendingSubmissions.length} campaign{pendingSubmissions.length > 1 ? 's' : ''} awaiting admin approval above.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recently Responded Requests History */}
      {requestHistory.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Recent Responses</h3>
            <Badge variant="outline">
              {requestHistory.length} in history
            </Badge>
          </div>
          <div className="grid gap-3">
            {requestHistory.slice(0, 5).map((response: any) => (
              <Card key={response.id} className={`border-l-4 ${
                response.status === 'approved' 
                  ? 'border-l-green-400 bg-green-50/30 dark:bg-green-950/10' 
                  : 'border-l-red-400 bg-red-50/30 dark:bg-red-950/10'
              }`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{response.campaign?.name || 'Campaign'}</p>
                      <p className="text-sm text-muted-foreground">
                        {response.responded_at 
                          ? `Responded ${formatDistanceToNow(new Date(response.responded_at), { addSuffix: true })}`
                          : 'Recently responded'}
                      </p>
                    </div>
                    <Badge variant={response.status === 'approved' ? 'default' : 'destructive'}>
                      {response.status === 'approved' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Accepted</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> Rejected</>
                      )}
                    </Badge>
                  </div>
                  {response.response_notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{response.response_notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Request Review Modal */}
      <VendorCampaignRequestModal
        request={selectedRequest}
        isOpen={showRequestModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}









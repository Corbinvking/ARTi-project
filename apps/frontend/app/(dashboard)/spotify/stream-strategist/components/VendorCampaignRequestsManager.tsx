"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Music, DollarSign, Target } from 'lucide-react';
import { useVendorCampaignRequests } from '../hooks/useVendorCampaignRequests';
import { VendorCampaignRequestModal } from './VendorCampaignRequestModal';
import { formatDistanceToNow } from 'date-fns';

export function VendorCampaignRequestsManager() {
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const { data: requests = [], isLoading } = useVendorCampaignRequests();

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

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading campaign requests...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
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

        {requests.length === 0 && (
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
      </div>

      {/* Enhanced Request Review Modal */}
      <VendorCampaignRequestModal
        request={selectedRequest}
        isOpen={showRequestModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}









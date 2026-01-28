"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Music, DollarSign, Calendar, Target, ExternalLink, X, CheckSquare, Square } from 'lucide-react';
import { useRespondToVendorRequest } from '../hooks/useVendorCampaignRequests';
import { useMyPlaylists } from '../hooks/useVendorPlaylists';
import { MultiSelect } from '@/components/ui/multi-select';
import { formatDistanceToNow } from 'date-fns';

interface VendorCampaignRequestModalProps {
  request: any;
  isOpen: boolean;
  onClose: () => void;
}

export function VendorCampaignRequestModal({ request, isOpen, onClose }: VendorCampaignRequestModalProps) {
  const [responseType, setResponseType] = useState<'approved' | 'rejected'>('approved');
  const [responseNotes, setResponseNotes] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isEditingPlaylists, setIsEditingPlaylists] = useState(false);
  
  const respondToRequest = useRespondToVendorRequest();
  const { data: myPlaylists } = useMyPlaylists();

  // Initialize selected playlists when request changes
  useEffect(() => {
    if (request?.playlists) {
      setSelectedPlaylistIds(request.playlists.map((p: any) => p.id));
    }
  }, [request]);

  const handleRespond = (status: 'approved' | 'rejected') => {
    setResponseType(status);
    setIsResponding(true);
  };

  const submitResponse = async () => {
    if (!request?.id) return;
    
    try {
      await respondToRequest.mutateAsync({
        requestId: request.id,
        status: responseType,
        response_notes: responseNotes,
        playlist_ids: selectedPlaylistIds
      });
      
      setIsResponding(false);
      setResponseNotes('');
      onClose();
    } catch (error) {
      console.error('Error submitting response:', error);
    }
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

  const roundToNearest1k = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value / 1000) * 1000;
  };

  if (!request) return null;

  const isSelectingPlaylists = isResponding || isEditingPlaylists;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{request.campaign?.name || 'Campaign Request'}</DialogTitle>
              <DialogDescription>
                Brand: {request.campaign?.brand_name} • Requested {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
              </DialogDescription>
            </div>
            <Badge variant={getStatusColor(request.status) as any} className="flex items-center gap-1">
              {getStatusIcon(request.status)}
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vendor-Specific Campaign Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="font-medium">Your Streams</span>
              </div>
              <div className="text-lg font-semibold text-primary">
                {request.allocated_streams && request.allocated_streams > 0
                  ? roundToNearest1k(request.allocated_streams).toLocaleString()
                  : request.campaign?.stream_goal
                    ? roundToNearest1k(request.campaign.stream_goal).toLocaleString()
                    : 'TBD'}
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">Rate/1k</span>
              </div>
              <div className="text-lg font-semibold text-primary">
                {request.cost_per_1k ? formatCurrency(request.cost_per_1k) : 'Default'}
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Start Date</span>
              </div>
              <div className="text-lg font-semibold">
                {request.campaign?.start_date ? new Date(request.campaign.start_date).toLocaleDateString() : 'TBD'}
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Duration</span>
              </div>
              <div className="text-lg font-semibold">{request.campaign?.duration_days || 0} days</div>
            </div>
          </div>

          {/* Track Details */}
          {request.campaign?.track_url && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Music className="h-4 w-4" />
                <span className="font-medium">Track Information</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <a 
                  href={request.campaign.track_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {request.campaign.track_name || request.campaign.track_url}
                </a>
              </div>
            </div>
          )}

          {/* Playlist Selection */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span className="font-medium">Playlist Selection</span>
                {isSelectingPlaylists && (
                  <Badge variant="outline" className="text-xs">
                    {selectedPlaylistIds.length} selected
                  </Badge>
                )}
              </div>
              {isSelectingPlaylists && myPlaylists && myPlaylists.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlaylistIds(myPlaylists.map(p => p.id))}
                    className="text-xs h-7"
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlaylistIds([])}
                    className="text-xs h-7"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              )}
              {!isResponding && myPlaylists && myPlaylists.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setIsEditingPlaylists(true);
                      if (selectedPlaylistIds.length === 0 && request?.playlists?.length) {
                        setSelectedPlaylistIds(request.playlists.map((p: any) => p.id));
                      }
                    }}
                  >
                    Edit
                  </Button>
                  {isEditingPlaylists && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setIsEditingPlaylists(false);
                        setSelectedPlaylistIds(request?.playlists?.map((p: any) => p.id) || []);
                      }}
                    >
                      Done
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {isSelectingPlaylists ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Select which playlists to include. You can approve with no playlists and add them later.
                </div>
                <MultiSelect
                  options={myPlaylists?.map(p => p.name) || []}
                  selected={selectedPlaylistIds.map(id => {
                    const playlist = myPlaylists?.find(p => p.id === id);
                    return playlist?.name || id;
                  }).filter(Boolean)}
                  onChange={(selectedNames) => {
                    const ids = selectedNames.map(name => {
                      const playlist = myPlaylists?.find(p => p.name === name);
                      return playlist?.id;
                    }).filter(Boolean) as string[];
                    setSelectedPlaylistIds(ids);
                  }}
                  placeholder="Search and select playlists..."
                />
                <div className="space-y-2">
                  {selectedPlaylistIds.length === 0 ? (
                    <div className="py-3 px-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                      <strong>No playlists selected.</strong> You can approve now and assign playlists later from your active campaigns.
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-medium">Selected Playlists ({selectedPlaylistIds.length}):</div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {selectedPlaylistIds.map(id => {
                          const playlist = myPlaylists?.find(p => p.id === id);
                          return playlist ? (
                            <div key={id} className="flex justify-between items-center py-2 px-3 bg-muted/20 rounded-md text-sm group">
                              <span className="font-medium">{playlist.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">
                                  {playlist.avg_daily_streams.toLocaleString()} daily
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedPlaylistIds(prev => prev.filter(pid => pid !== id))}
                                  className="h-6 w-6 p-0 opacity-50 hover:opacity-100 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {request.playlists?.map((playlist: any) => (
                  <div key={playlist.id} className="flex justify-between items-center py-2 px-3 bg-muted/20 rounded-md">
                    <span className="font-medium">{playlist.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {playlist.avg_daily_streams.toLocaleString()} daily streams
                    </span>
                  </div>
                ))}
                {(!request.playlists || request.playlists.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    No specific playlists requested
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Music Genres */}
          {request.campaign?.music_genres && request.campaign.music_genres.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="font-medium mb-2">Music Genres</div>
              <div className="flex flex-wrap gap-1">
                {request.campaign.music_genres.map((genre: string, idx: number) => (
                  <Badge key={idx} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Response Notes */}
          {request.response_notes && (
            <div className="p-4 bg-muted/10 border rounded-lg">
              <div className="font-medium mb-2">Your Response Notes</div>
              <div className="text-muted-foreground">{request.response_notes}</div>
            </div>
          )}

          {/* Response Section */}
          {isResponding && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="font-medium">
                {responseType === 'approved' ? 'Approve Request' : 'Reject Request'}
              </div>
              <div className="space-y-2">
                <Label>
                  {responseType === 'approved' ? 'Response Notes (Optional)' : 'Rejection Reason'}
                </Label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder={
                    responseType === 'approved' 
                      ? 'Add any notes about playlist selection, timing, or other details...'
                      : 'Please explain why you are rejecting this request...'
                  }
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!isResponding && request.status === 'pending' ? (
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => handleRespond('approved')}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Review
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRespond('rejected')}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          ) : isResponding ? (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setIsResponding(false);
                  setResponseNotes('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant={responseType === 'approved' ? 'default' : 'destructive'}
                onClick={submitResponse}
                disabled={respondToRequest.isPending || (responseType === 'rejected' && !responseNotes.trim())}
                className="flex-1"
              >
                {respondToRequest.isPending ? 'Submitting...' : (responseType === 'approved' ? 'Approve Request' : 'Reject Request')}
              </Button>
            </div>
          ) : (
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}









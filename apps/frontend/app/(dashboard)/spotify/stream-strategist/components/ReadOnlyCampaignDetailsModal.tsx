"use client"

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ExternalLink, CheckCircle, XCircle, Clock, DollarSign, MessageSquare, Save, Radio, Music } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useCampaignVendorResponses } from '../hooks/useCampaignVendorResponses';
import { useToast } from '../hooks/use-toast';
import { useIsVendorManager } from '../hooks/useIsVendorManager';
import { useAuth } from '../hooks/useAuth';
import { useSalespeople } from '../hooks/useSalespeople';

interface PlaylistWithStatus {
  id: string;
  name: string;
  url?: string;
  vendor_name?: string;
  status?: string;
  placed_date?: string;
  follower_count?: number;
  avg_daily_streams?: number;
}

interface ReadOnlyCampaignDetailsModalProps {
  campaign: any;
  open: boolean;
  onClose: () => void;
}

export function ReadOnlyCampaignDetailsModal({ campaign, open, onClose }: ReadOnlyCampaignDetailsModalProps) {
  const [campaignData, setCampaignData] = useState<any>(null);
  const [playlists, setPlaylists] = useState<PlaylistWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Fetch vendor responses for this campaign
  const { data: vendorResponses = [], isLoading: vendorResponsesLoading } = useCampaignVendorResponses(campaign?.id);
  const { toast } = useToast();
  const { data: isVendorManager = false } = useIsVendorManager();
  const { hasRole } = useAuth();
  const { data: salespeople = [] } = useSalespeople();

  useEffect(() => {
    if (campaign?.id && open) {
      fetchCampaignDetails();
    }
  }, [campaign?.id, open]);

  const fetchCampaignDetails = async () => {
    if (!campaign?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaign.id)
        .single();

      if (error) throw error;

      setCampaignData(data as any);
      setNotes(data?.notes || '');
      
      // Parse selected_playlists and algorithm recommendations
      let playlistsToDisplay = [];
      
      if (data?.selected_playlists && Array.isArray(data.selected_playlists) && data.selected_playlists.length > 0) {
        // Check if selected_playlists contains string IDs or full objects
        const isStringArray = typeof data.selected_playlists[0] === 'string';
        
        if (isStringArray) {
          // Fetch full playlist details from database
          try {
            const playlistIds = data.selected_playlists.filter((id): id is string => typeof id === 'string');
            const { data: playlistDetails } = await supabase
              .from('playlists')
              .select(`*, vendor:vendors(name)`)
              .in('id', playlistIds);
              
            if (playlistDetails) {
              playlistsToDisplay = playlistIds.map((id: string) => {
                const playlist = playlistDetails.find(p => p.id === id);
                return {
                  id,
                  name: playlist?.name || 'Unknown Playlist',
                  url: playlist?.url || '',
                  vendor_name: playlist?.vendor?.name || 'Unknown Vendor',
                  follower_count: playlist?.follower_count || 0,
                  avg_daily_streams: playlist?.avg_daily_streams || 0,
                  status: 'Selected',
                  placed_date: null
                };
              }).filter(Boolean);
            }
          } catch (error) {
            console.error('Failed to fetch playlist details:', error);
          }
        } else {
          // Already full objects, just normalize
          playlistsToDisplay = data.selected_playlists.map((playlist: any) => ({
            ...playlist,
            status: playlist.status || 'Pending',
            placed_date: playlist.placed_date || null
          }));
        }
      } else if (data?.algorithm_recommendations) {
        // Fall back to algorithm recommendations if no selected_playlists
        console.log('Using algorithm recommendations for playlist display');
        const recommendations = data.algorithm_recommendations as any;
        const allocations = recommendations?.allocations;
        
        if (allocations && Array.isArray(allocations)) {
          // Fetch playlist details for algorithm recommendations
          try {
            const playlistIds = allocations.map((a: any) => a.playlistId).filter(Boolean);
            if (playlistIds.length > 0) {
              const { data: playlistDetails } = await supabase
                .from('playlists')
                .select(`*, vendor:vendors(name)`)
                .in('id', playlistIds);
              
              if (playlistDetails) {
                playlistsToDisplay = allocations.map((allocation: any) => {
                  const playlist = playlistDetails.find(p => p.id === allocation.playlistId);
                  return {
                    id: allocation.playlistId,
                    name: playlist?.name || 'Unknown Playlist',
                    url: playlist?.url || '',
                    vendor_name: playlist?.vendor?.name || 'Unknown Vendor',
                    follower_count: playlist?.follower_count || 0,
                    avg_daily_streams: playlist?.avg_daily_streams || 0,
                    status: 'Algorithm Generated',
                    streams_allocated: allocation.streams,
                    cost_per_stream: allocation.costPerStream
                  };
                }).filter(Boolean);
              }
            }
          } catch (error) {
            console.error('Failed to fetch playlist details:', error);
          }
        }
      }
      
      setPlaylists(playlistsToDisplay);
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Placed': return 'default';
      case 'Accepted': return 'secondary';
      case 'Pitched': return 'outline';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getVendorResponseVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getVendorResponseIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'rejected': return <XCircle className="h-3 w-3 mr-1" />;
      case 'pending': return <Clock className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Calculate commission (20% of budget)
  const commissionAmount = (campaignData?.budget || 0) * 0.2;

  const getSalespersonName = (email: string) => {
    const salesperson = salespeople.find(s => s.email === email);
    return salesperson?.name || email || 'Not assigned';
  };

  const saveNotes = async () => {
    if (!campaignData?.id) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ notes })
        .eq('id', campaignData.id);

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Your notes have been saved and will be visible to operators.",
      });
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast({
        title: "Failed to save notes",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            Loading campaign details...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {campaignData?.name || campaign?.name}
            <Badge variant={getStatusVariant(campaignData?.status || 'draft')}>
              {campaignData?.status || 'draft'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Read-only campaign details and playlists
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-card rounded-lg">
            <div>
              <Label className="text-muted-foreground">Client</Label>
              <p className="font-medium">{campaignData?.client_name || campaignData?.client}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Budget</Label>
              <p className="font-medium">${campaignData?.budget?.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Stream Goal</Label>
              <p className="font-medium">{campaignData?.stream_goal?.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Remaining Streams</Label>
              <p className="font-medium">{(campaignData?.remaining_streams || campaignData?.stream_goal)?.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Genre</Label>
              <p className="font-medium">{campaignData?.sub_genre || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Duration</Label>
              <p className="font-medium">{campaignData?.duration_days} days</p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">Salesperson</Label>
              <p className="font-medium">{getSalespersonName(campaignData?.salesperson)}</p>
            </div>
          </div>
          
        {/* External Streaming Sources */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-4 w-4" />
            <span className="font-medium">External Streaming Sources</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(campaignData?.radio_streams || 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Radio Streams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(campaignData?.discover_weekly_streams || 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Discover Weekly</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {((campaignData?.radio_streams || 0) + (campaignData?.discover_weekly_streams || 0)).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total External</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3 text-center">
            Last updated: {campaignData?.updated_at ? formatDate(campaignData.updated_at) : 'Not available'}
          </div>
        </div>
          
          {/* Commission Info */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <Label className="text-green-800 dark:text-green-200 font-medium">Your Commission</Label>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${commissionAmount.toLocaleString()}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              20% of ${campaignData?.budget?.toLocaleString()} campaign budget
            </div>
          </div>
          
          {/* Track URL */}
          {campaignData?.track_url && (
            <div className="p-4 bg-card rounded-lg">
              <Label className="text-muted-foreground">Track URL</Label>
              <div className="flex items-center gap-2 mt-1">
                <a 
                  href={campaignData.track_url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {campaignData.track_url}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
          
          {/* Notes Section for Salesperson */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <Label className="text-primary font-medium">
                Campaign Notes for Operators
              </Label>
            </div>
            <div className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for operators (e.g., 'Please increase daily streams for this track' or 'Client needs faster delivery')"
                className="min-h-[100px] bg-background border-primary/20"
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  These notes will be visible to campaign operators to help manage your campaign better.
                </p>
                <Button 
                  onClick={saveNotes} 
                  disabled={savingNotes}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Vendor Responses */}
          {vendorResponses.length > 0 && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Vendor Responses ({vendorResponses.length})</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead> 
                    <TableHead>Requested Playlists</TableHead>
                    <TableHead>Response Notes</TableHead>
                    <TableHead>Response Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorResponses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell>
                        <Badge variant="secondary">
                          {(response.vendor as any)?.name || 'Unknown Vendor'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getVendorResponseVariant(response.status)}>
                          {getVendorResponseIcon(response.status)}
                          {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {response.playlists && response.playlists.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {response.playlists.map((playlist) => (
                              <Badge key={playlist.id} variant="outline" className="text-xs">
                                {playlist.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No playlists</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {response.response_notes ? (
                          <span className="text-sm">{response.response_notes}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {response.responded_at ? (
                          <span className="text-sm">{formatDate(response.responded_at)}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Campaign Playlists - Read Only */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Campaign Playlists ({playlists.length})</Label>
            
            {playlists.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Playlist Name</TableHead>
                    {isVendorManager && <TableHead>Vendor</TableHead>}
                    <TableHead>Followers</TableHead>
                    <TableHead>Avg Daily Streams</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Placed Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playlists.map((playlist, idx) => (
                    <TableRow key={`${playlist.id}-${idx}`}>
                      <TableCell>
                        {playlist.url ? (
                          <a 
                            href={playlist.url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {playlist.name || 'Unnamed Playlist'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span>{playlist.name || 'Unnamed Playlist'}</span>
                        )}
                      </TableCell>
                      {isVendorManager && (
                        <TableCell>
                          <Badge variant="secondary">
                            {playlist.vendor_name || 'Unknown'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        {playlist.follower_count?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell>
                        {playlist.avg_daily_streams?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(playlist.status || 'Pending')}>
                          {playlist.status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {playlist.placed_date ? (
                          <span className="text-sm">{formatDate(playlist.placed_date)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card">
                No playlists assigned to this campaign yet
              </div>
            )}
          </div>
          
          {/* Campaign Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-card rounded-lg text-sm text-muted-foreground">
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p>{campaignData?.created_at ? formatDate(campaignData.created_at) : 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Last Updated</Label>
              <p>{campaignData?.updated_at ? formatDate(campaignData.updated_at) : 'Unknown'}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}









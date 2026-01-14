"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Music, TrendingUp, Target, ExternalLink, RotateCcw, Plus, X, Radio } from 'lucide-react';
import { useUpdatePlaylistAllocation, useVendorCampaigns } from '../hooks/useVendorCampaigns';
import { useMyPlaylists } from '../hooks/useVendorPlaylists';
import { useCampaignPerformanceData, useCampaignOverallPerformance } from '../hooks/useCampaignPerformanceData';
import { VendorPerformanceChart } from './VendorPerformanceChart';
import { VendorOwnPlaylistView } from './VendorOwnPlaylistView';
import AddPlaylistModal from './AddPlaylistModal';
import { useVendorPaymentData } from '../hooks/useVendorPayments';

interface VendorCampaignPerformanceModalProps {
  campaign: any;
  isOpen: boolean;
  onClose: () => void;
}

export function VendorCampaignPerformanceModal({ campaign, isOpen, onClose }: VendorCampaignPerformanceModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  
  const updatePlaylistAllocation = useUpdatePlaylistAllocation();
  const { data: payments = [] } = useVendorPaymentData();
  const { data: myPlaylists } = useMyPlaylists();
  const { data: vendorCampaigns } = useVendorCampaigns();
  
  // Get fresh campaign data from the hook, fallback to prop
  const freshCampaign = vendorCampaigns?.find(c => c.id === campaign?.id) || campaign;
  
  const { data: performanceData, isLoading: performanceLoading } = useCampaignPerformanceData(freshCampaign?.id);
  const { data: overallPerformance } = useCampaignOverallPerformance(freshCampaign?.id);

  if (!freshCampaign) return null;

  const vendorStreamGoal = freshCampaign.vendor_stream_goal || 0;
  // Use total_streams_delivered from hook (already calculated from campaign_playlists)
  // Or sum up current_streams from vendor_playlists (now populated with actual scraped data)
  const currentStreams = (freshCampaign as any).total_streams_delivered || 
    freshCampaign.vendor_playlists?.reduce((sum: number, p: any) => 
      p.is_allocated ? (p.current_streams || 0) : 0, 0) || 0;

  // Calculate streams by time period from vendor_playlists
  const streams24h = freshCampaign.vendor_playlists?.reduce((sum: number, p: any) => 
    p.is_allocated ? (p.streams_24h || 0) : 0, 0) || 0;
  const streams7d = freshCampaign.vendor_playlists?.reduce((sum: number, p: any) => 
    p.is_allocated ? (p.streams_7d || 0) : 0, 0) || 0;
  const streams12m = freshCampaign.vendor_playlists?.reduce((sum: number, p: any) => 
    p.is_allocated ? (p.streams_12m || 0) : 0, 0) || 0;

  // Get payment data for this campaign - either from the payments hook or from the campaign data itself
  // Priority for rate: 1. payments hook, 2. campaign cost_per_1k_streams, 3. vendor_allocation, 4. default $8
  const existingPayment = payments.find(p => p.campaign_id === freshCampaign.id);
  const effectiveRate = existingPayment?.current_rate_per_1k || 
    freshCampaign.cost_per_1k_streams || 
    freshCampaign.vendor_allocation?.cost_per_1k_streams || 
    8; // Default rate if nothing is set
  
  const campaignPayment = existingPayment || {
    campaign_id: freshCampaign.id,
    current_rate_per_1k: effectiveRate,
    amount_owed: freshCampaign.amount_owed || (currentStreams / 1000) * effectiveRate,
    actual_streams: currentStreams,
    allocated_streams: vendorStreamGoal,
    payment_status: freshCampaign.payment_status || 'unpaid',
    payment_date: null
  };

  const progressPercentage = vendorStreamGoal > 0 ? (currentStreams / vendorStreamGoal) * 100 : 0;

  const getPerformanceStatus = () => {
    if (progressPercentage >= 110) return { status: 'Exceeding', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (progressPercentage >= 80) return { status: 'On Track', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (progressPercentage >= 50) return { status: 'Behind', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { status: 'Needs Attention', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const performance = getPerformanceStatus();

  const handlePlaylistToggle = (playlistId: string, isCurrentlyActive: boolean) => {
    updatePlaylistAllocation.mutate({
      campaignId: freshCampaign.id,
      playlistId: playlistId,
      action: isCurrentlyActive ? 'remove' : 'add'
    });
  };

  // Filter playlists based on search query
  const filteredAvailablePlaylists = myPlaylists?.filter(playlist => 
    !freshCampaign.vendor_playlists?.some((vp: any) => vp.id === playlist.id && vp.is_allocated) &&
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle adding playlist by search or URL
  const handleAddPlaylist = (playlistId: string) => {
    handlePlaylistToggle(playlistId, false);
    setSearchQuery('');
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {freshCampaign.name}
            <Badge variant="outline" className="text-xs">
              {overallPerformance?.progress_percentage.toFixed(1)}% complete
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {freshCampaign.brand_name && `${freshCampaign.brand_name} • `}
            Campaign Performance & Playlist Management
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Your Stream Goal</span>
              </div>
              <div className="text-2xl font-bold">{vendorStreamGoal.toLocaleString()}</div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Current Streams</span>
              </div>
              <div className="text-2xl font-bold">{currentStreams.toLocaleString()}</div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <div className={`w-3 h-3 rounded-full ${performance.bgColor}`}></div>
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className={`text-lg font-semibold ${performance.color}`}>
                {performance.status}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Goal</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(progressPercentage, 100)} className="h-3" />
          </div>

          {/* Payment Information - Always show */}
          {(
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Music className="h-4 w-4" />
                <span className="font-medium">Payment Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Rate per 1k streams</div>
                  <div className="text-lg font-semibold">${campaignPayment.current_rate_per_1k.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Set by Artist Influence</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Total earned</div>
                  <div className="text-lg font-semibold text-green-600">${campaignPayment.amount_owed.toFixed(2)}</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Streams delivered</div>
                  <div className="text-lg font-semibold">{campaignPayment.actual_streams.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    of {campaignPayment.allocated_streams.toLocaleString()} allocated
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Payment status</div>
                  <Badge 
                    variant={campaignPayment.payment_status === 'paid' ? 'default' : campaignPayment.payment_status === 'partial' ? 'secondary' : 'outline'}
                    className={
                      campaignPayment.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                      campaignPayment.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : ''
                    }
                  >
                    {campaignPayment.payment_status === 'paid' ? 'Paid ✓' : 
                     campaignPayment.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                  </Badge>
                  {campaignPayment.payment_date && (
                    <div className="text-xs text-muted-foreground">
                      Paid: {new Date(campaignPayment.payment_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Streaming Data by Time Period */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4" />
              <span className="font-medium">Your Streaming Data</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {streams24h.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Last 24 Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {streams7d.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Last 7 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {streams12m.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Last 12 Months</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3 text-center">
              Last updated: {freshCampaign.updated_at ? new Date(freshCampaign.updated_at).toLocaleDateString() : 'Not available'}
            </div>
          </div>

          {/* Track Information */}
          {freshCampaign.track_url && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Music className="h-4 w-4" />
                <span className="font-medium">Campaign Track</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(freshCampaign.track_url, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                {freshCampaign.track_name || 'Listen to Track'}
              </Button>
            </div>
          )}

          {/* Campaign Playlists - Grouped by Vendor */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span className="font-medium">Your Campaign Playlists</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => setShowAddPlaylistModal(true)}
              >
                <Plus className="h-3 w-3" />
                Add New Playlist
              </Button>
            </div>
            
            {/* Search Bar for Adding Playlists */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search playlists by name or paste Spotify URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              
              {/* Search Results */}
              {searchQuery && filteredAvailablePlaylists.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-lg">
                  {filteredAvailablePlaylists.map((playlist) => (
                    <div 
                      key={playlist.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted/10 border-b last:border-0 cursor-pointer"
                      onClick={() => handleAddPlaylist(playlist.id)}
                    >
                      <div>
                        <div className="font-medium text-sm">{playlist.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {playlist.avg_daily_streams.toLocaleString()} daily streams
                        </div>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery && filteredAvailablePlaylists.length === 0 && (
                <div className="text-center py-2 text-sm text-muted-foreground border rounded-lg">
                  No playlists found matching "{searchQuery}"
                </div>
              )}
            </div>

            {/* Your Allocated Playlists */}
            {freshCampaign.vendor_playlists && freshCampaign.vendor_playlists.length > 0 ? (
              <VendorOwnPlaylistView
                playlists={freshCampaign.vendor_playlists.map((playlist: any) => ({
                  id: playlist.id,
                  name: playlist.name,
                  url: '#', // URL would come from playlists table
                  avg_daily_streams: playlist.avg_daily_streams,
                  follower_count: playlist.follower_count,
                  allocated_streams: vendorStreamGoal, // Use campaign goal
                  actual_streams: playlist.current_streams || 0, // Actual scraped streams
                  twelve_month_streams: playlist.streams_12m || 0, // 12-month scraped data
                  streams_24h: playlist.streams_24h || 0,
                  streams_7d: playlist.streams_7d || 0,
                  daily_data: [], // Would come from performance entries
                  is_allocated: playlist.is_allocated,
                  vendor_paid: playlist.vendor_paid || false
                }))}
                onRemovePlaylist={(playlistId) => handlePlaylistToggle(playlistId, true)}
                isRemoving={updatePlaylistAllocation.isPending}
                showHistoricalData={false}
              />
            ) : (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No playlists allocated to this campaign</p>
                <p className="text-xs">Search above to add your playlists to this campaign</p>
              </div>
            )}
          </div>

          {/* Campaign Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 border rounded-lg">
              <span className="font-medium text-muted-foreground">Start Date:</span>
              <div className="mt-1">
                {freshCampaign.start_date ? new Date(freshCampaign.start_date).toLocaleDateString() : 'Not specified'}
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <span className="font-medium text-muted-foreground">Duration:</span>
              <div className="mt-1">{freshCampaign.duration_days || 0} days</div>
            </div>
          </div>

          {/* Genres */}
          {freshCampaign.music_genres && freshCampaign.music_genres.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="font-medium mb-2">Music Genres</div>
              <div className="flex flex-wrap gap-1">
                {freshCampaign.music_genres.map((genre: string, idx: number) => (
                  <Badge key={idx} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Add New Playlist Modal */}
        <AddPlaylistModal
          open={showAddPlaylistModal}
          onOpenChange={setShowAddPlaylistModal}
        />
      </DialogContent>
    </Dialog>
  );
}









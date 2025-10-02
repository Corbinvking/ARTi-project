"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Music, TrendingUp, Target, ExternalLink, RotateCcw, Plus, X, Radio, Edit } from 'lucide-react';
import { useUpdatePlaylistAllocation, useVendorCampaigns } from '../hooks/useVendorCampaigns';
import { useMyPlaylists } from '../hooks/useVendorPlaylists';
import { useCampaignPerformanceData, useCampaignOverallPerformance } from '../hooks/useCampaignPerformanceData';
import { VendorPerformanceChart } from './VendorPerformanceChart';
import { VendorOwnPlaylistView } from './VendorOwnPlaylistView';
import AddPlaylistModal from './AddPlaylistModal';
import { useVendorPaymentData, useUpdateVendorCampaignRate } from '../hooks/useVendorPayments';

interface VendorCampaignPerformanceModalProps {
  campaign: any;
  isOpen: boolean;
  onClose: () => void;
}

export function VendorCampaignPerformanceModal({ campaign, isOpen, onClose }: VendorCampaignPerformanceModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [pendingRate, setPendingRate] = useState<number>(0);
  
  const updatePlaylistAllocation = useUpdatePlaylistAllocation();
  const { data: payments = [] } = useVendorPaymentData();
  const updateRate = useUpdateVendorCampaignRate();
  const { data: myPlaylists } = useMyPlaylists();
  const { data: vendorCampaigns } = useVendorCampaigns();
  
  // Get fresh campaign data from the hook, fallback to prop
  const freshCampaign = vendorCampaigns?.find(c => c.id === campaign?.id) || campaign;
  
  const { data: performanceData, isLoading: performanceLoading } = useCampaignPerformanceData(freshCampaign?.id);
  const { data: overallPerformance } = useCampaignOverallPerformance(freshCampaign?.id);

  if (!freshCampaign) return null;

  const vendorStreamGoal = freshCampaign.vendor_stream_goal || 0;
  const currentStreams = freshCampaign.vendor_playlists?.reduce((sum: number, p: any) => 
    p.is_allocated ? (p.current_streams || 0) : 0, 0) || 0;

  // Get payment data for this campaign - either from the payments hook or from the campaign data itself
  const campaignPayment = payments.find(p => p.campaign_id === freshCampaign.id) || {
    campaign_id: freshCampaign.id,
    current_rate_per_1k: freshCampaign.vendor_allocation?.cost_per_1k_streams || 0,
    amount_owed: freshCampaign.amount_owed || 0,
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

  const handleEditRate = () => {
    if (campaignPayment) {
      setPendingRate(campaignPayment.current_rate_per_1k);
      setEditingRate(true);
    }
  };

  const handleSaveRate = () => {
    if (freshCampaign?.id && pendingRate > 0) {
      updateRate.mutate({ 
        campaignId: freshCampaign.id, 
        newRatePer1k: pendingRate 
      });
      setEditingRate(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRate(false);
    setPendingRate(0);
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
                  {editingRate ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pendingRate}
                        onChange={(e) => setPendingRate(parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Button size="sm" onClick={handleSaveRate} disabled={updateRate.isPending}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">${campaignPayment.current_rate_per_1k.toFixed(2)}</span>
                      <Button size="sm" variant="ghost" onClick={handleEditRate}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
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
                    variant={campaignPayment.payment_status === 'paid' ? 'default' : 'outline'}
                    className={campaignPayment.payment_status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {campaignPayment.payment_status === 'paid' ? 'Paid ✓' : 'Unpaid'}
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

          {/* External Streaming Sources */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4" />
              <span className="font-medium">External Streaming Sources</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(freshCampaign.radio_streams || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Radio Streams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(freshCampaign.discover_weekly_streams || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Discover Weekly</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {((freshCampaign.radio_streams || 0) + (freshCampaign.discover_weekly_streams || 0)).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total External</div>
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
                playlists={freshCampaign.vendor_playlists.map(playlist => ({
                  id: playlist.id,
                  name: playlist.name,
                  url: '#', // URL would come from playlists table
                  avg_daily_streams: playlist.avg_daily_streams,
                  follower_count: playlist.follower_count,
                  allocated_streams: 0, // Would come from performance data
                  actual_streams: 0, // Would come from performance data
                  twelve_month_streams: 0, // Would come from historical data
                  daily_data: [], // Would come from performance entries
                  is_allocated: playlist.is_allocated
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









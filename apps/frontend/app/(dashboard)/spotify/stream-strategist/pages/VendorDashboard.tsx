"use client"

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { supabase } from "../integrations/supabase/client";
import { toast } from "../components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Plus, List, CheckCircle, XCircle, Music, TrendingUp, Users, ExternalLink, RotateCcw, Edit2, Loader2, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useMyVendor } from "../hooks/useVendors";
import { useMyPlaylists, useCreatePlaylist } from "../hooks/useVendorPlaylists";
import { useVendorCampaignRequests } from "../hooks/useVendorCampaignRequests";
import { useVendorCampaigns } from "../hooks/useVendorCampaigns";
import { VendorPlaylistEditModal } from "../components/VendorPlaylistEditModal";
import { VendorCampaignRequestModal } from "../components/VendorCampaignRequestModal";
import { VendorCampaignPerformanceModal } from "../components/VendorCampaignPerformanceModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";


export default function VendorDashboard() {
  const { user } = useAuth();
  const { data: vendor, isLoading: vendorLoading, error: vendorError } = useMyVendor();
  const { data: playlists, isLoading: playlistsLoading, error: playlistsError } = useMyPlaylists();
  const { data: requests = [] } = useVendorCampaignRequests();
  const { data: campaigns = [] } = useVendorCampaigns();
  const createPlaylist = useCreatePlaylist();

  // Modal states
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    url: '',
    genres: [] as string[],
    avg_daily_streams: 0,
    follower_count: 0
  });
  const [genreInput, setGenreInput] = useState('');
  const [isSpotifyFetchingCreate, setIsSpotifyFetchingCreate] = useState(false);
  const [spotifyCreateError, setSpotifyCreateError] = useState<string | null>(null);
  const [lastFetchedUrl, setLastFetchedUrl] = useState<string>('');
  
  // Sorting state for campaigns
  const [sortBy, setSortBy] = useState<'name' | 'start_date'>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const totalStreams = playlists?.reduce((sum, playlist) => sum + playlist.avg_daily_streams, 0) || 0;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  // Sort campaigns
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const aValue = sortBy === 'name' ? a.name : a.start_date;
    const bValue = sortBy === 'name' ? b.name : b.start_date;
    
    const comparison = aValue.localeCompare(bValue);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (newSortBy: 'name' | 'start_date') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      name: '',
      url: '',
      genres: [],
      avg_daily_streams: 0,
      follower_count: 0
    });
    setGenreInput('');
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.name || !createFormData.url) return;

    createPlaylist.mutate(createFormData, {
      onSuccess: () => {
        setShowCreatePlaylistModal(false);
        resetCreateForm();
      }
    });
  };

  const addGenre = () => {
    if (genreInput.trim() && !createFormData.genres.includes(genreInput.trim())) {
      setCreateFormData(prev => ({
        ...prev,
        genres: [...prev.genres, genreInput.trim()]
      }));
      setGenreInput('');
    }
  };

  const removeGenre = (genre: string) => {
    setCreateFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(g => g !== genre)
    }));
  };

  const extractPlaylistId = (url: string): string | null => {
    if (!url) return null;
    
    const patterns = [
      /https?:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /spotify:playlist:([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const fetchSpotifyPlaylistDataCreate = async (playlistId: string) => {
    if (isSpotifyFetchingCreate) return;
    
    setIsSpotifyFetchingCreate(true);
    setSpotifyCreateError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('spotify-playlist-fetch', {
        body: { playlistId }
      });
      
      if (error) throw error;
      
      if (data && data.name) {
        setCreateFormData(prev => ({
          ...prev,
          name: data.name,
          follower_count: Number(data.followers) || 0,
          genres: data.genres || []
        }));
        
        // Only show toast if this is a new fetch (prevent repeated toasts)
        if (createFormData.url !== lastFetchedUrl) {
          setLastFetchedUrl(createFormData.url);
          toast({
            title: "Playlist data fetched",
            description: `Successfully loaded "${data.name}" from Spotify`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching Spotify playlist:', error);
      const errorMessage = error.message || 'Failed to fetch playlist data';
      setSpotifyCreateError(errorMessage);
      toast({
        title: "Error fetching playlist",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSpotifyFetchingCreate(false);
    }
  };

  // Debounced effect for URL changes
  useEffect(() => {
    const playlistId = extractPlaylistId(createFormData.url);
    if (playlistId && createFormData.url && !isSpotifyFetchingCreate) {
      const timeoutId = setTimeout(() => {
        fetchSpotifyPlaylistDataCreate(playlistId);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    } else if (!playlistId && createFormData.url) {
      setSpotifyCreateError(null);
    }
  }, [createFormData.url, isSpotifyFetchingCreate]);

  if (vendorLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (vendorError || !vendor) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-destructive mb-4">No Vendor Association Found</h2>
            <p className="text-muted-foreground mb-4">
              Your account is not associated with any vendor. Please contact an administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              Error: {vendorError?.message || 'No vendor data found'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 -mt-6" data-tour="vendor-portal">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendor Portal</h1>
            <p className="text-muted-foreground">
              {vendor ? `${vendor.name} - Manage your playlists and campaigns` : 'Manage your playlists and campaign participation'}
            </p>
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Playlists</CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playlistsLoading ? '...' : playlists?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active playlists
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Streams</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playlistsLoading ? '...' : totalStreams.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total across all playlists
              </p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRequest(requests[0])}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* My Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Active Campaigns</CardTitle>
                <CardDescription>
                  Manage your playlist participation in active campaigns
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSort('name')}
                  className="text-xs"
                >
                  Name
                  {sortBy === 'name' ? (
                    sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSort('start_date')}
                  className="text-xs"
                >
                  Date
                  {sortBy === 'start_date' ? (
                    sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {campaigns.length > 0 ? (
              <div className="space-y-4">
                {sortedCampaigns.map((campaign) => {
                  const vendorStreamGoal = campaign.vendor_stream_goal || 0;
                  const currentStreams = campaign.vendor_playlists?.reduce((sum: number, p: any) => 
                    p.is_allocated ? (p.current_streams || 0) : 0, 0) || 0;
                  const progressPercentage = vendorStreamGoal > 0 ? (currentStreams / vendorStreamGoal) * 100 : 0;
                  
                  const getPerformanceColor = () => {
                    if (progressPercentage >= 110) return 'text-green-600';
                    if (progressPercentage >= 80) return 'text-blue-600';
                    if (progressPercentage >= 50) return 'text-yellow-600';
                    return 'text-red-600';
                  };

                  return (
                    <Card key={campaign.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCampaign(campaign)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="space-y-1">
                           <div className="flex items-center gap-2">
                             <h3 className="font-semibold">{campaign.name}</h3>
                             <Badge variant={campaign.payment_status === 'paid' ? 'default' : campaign.payment_status === 'pending' ? 'secondary' : 'outline'}>
                               {campaign.payment_status === 'paid' ? 'Paid ✓' : campaign.payment_status === 'pending' ? 'Pending' : 'Unpaid'}
                             </Badge>
                           </div>
                           {campaign.amount_owed && (
                             <div className="text-sm text-muted-foreground">
                               Amount owed: <span className="font-medium text-green-600">${campaign.amount_owed.toFixed(2)}</span>
                             </div>
                           )}
                            {campaign.brand_name && (
                              <p className="text-sm text-muted-foreground">{campaign.brand_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Started: {new Date(campaign.start_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-medium">{vendorStreamGoal.toLocaleString()} streams</div>
                            <div className="text-muted-foreground">Your goal</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Progress:</span>
                            <span className={`font-medium ${getPerformanceColor()}`}>
                              {currentStreams.toLocaleString()} ({progressPercentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {campaign.vendor_playlists?.filter((p: any) => p.is_allocated).length || 0} active playlists
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active campaigns</h3>
                <p className="text-muted-foreground">
                  You're not currently participating in any campaigns. Check back later for opportunities.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Playlist Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle>Recent Playlists</CardTitle>
              <CardDescription>
                Your active playlists available for campaigns
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreatePlaylistModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Playlist
            </Button>
          </CardHeader>
          <CardContent>
            {playlistsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading playlists...
              </div>
            ) : playlists && playlists.length > 0 ? (
              <div className="space-y-3">
                <ScrollArea className="h-60">
                  <div className="space-y-3 pr-3">
                    {playlists.map((playlist) => (
                      <div key={playlist.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Music className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{playlist.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {playlist.avg_daily_streams.toLocaleString()} daily streams
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {playlist.follower_count?.toLocaleString() || '0'} followers
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPlaylist(playlist)}>
                          <Edit2 className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button variant="outline" className="w-full" onClick={() => setShowCreatePlaylistModal(true)}>
                  Add More Playlists
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first playlist to start participating in campaigns
                </p>
                <Button onClick={() => setShowCreatePlaylistModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Playlist
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Participation Requests</CardTitle>
            <CardDescription>
              Review and approve/deny campaign participation requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length > 0 ? (
              <div className="space-y-3">
                {requests.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{request.campaign?.name || 'Campaign Request'}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.playlists?.length || 0} playlists • {request.status}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(request)}>
                      {request.status === 'pending' ? 'Review' : 'View'}
                    </Button>
                  </div>
                ))}
                {requests.length > 0 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Click on a request above to review it
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                <p className="text-muted-foreground">
                  Campaign participation requests will appear here when available
                </p>
              </div>
            )}
          </CardContent>
          </Card>

        </div>

        {/* Modals */}
        <VendorPlaylistEditModal
          playlist={selectedPlaylist}
          isOpen={!!selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
        />

        <VendorCampaignRequestModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />

        <VendorCampaignPerformanceModal
          campaign={selectedCampaign}
          isOpen={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />

        {/* Create Playlist Modal */}
        <Dialog open={showCreatePlaylistModal} onOpenChange={setShowCreatePlaylistModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Playlist</DialogTitle>
              <DialogDescription>
                Add a new playlist to make it available for campaign participation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlaylist}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input
                    id="name"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="col-span-3"
                    placeholder="Playlist name"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="url" className="text-right">Spotify URL</Label>
                  <div className="col-span-3 relative">
                    <Input
                      id="url"
                      value={createFormData.url}
                      onChange={(e) => {
                        setCreateFormData(prev => ({ ...prev, url: e.target.value }));
                        setSpotifyCreateError(null);
                      }}
                      onBlur={(e) => {
                        const id = extractPlaylistId(e.target.value);
                        if (id) fetchSpotifyPlaylistDataCreate(id);
                      }}
                      className={`${isSpotifyFetchingCreate ? 'pr-10' : ''}`}
                      placeholder="https://open.spotify.com/playlist/..."
                      required
                    />
                    {isSpotifyFetchingCreate && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {spotifyCreateError && (
                      <p className="text-sm text-destructive mt-1">{spotifyCreateError}</p>
                    )}
                    {isSpotifyFetchingCreate && (
                      <p className="text-sm text-muted-foreground mt-1">Fetching playlist data...</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="streams" className="text-right">Daily Streams</Label>
                  <Input
                    id="streams"
                    type="number"
                    value={createFormData.avg_daily_streams}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, avg_daily_streams: parseInt(e.target.value) || 0 }))}
                    className="col-span-3"
                    placeholder="Average daily streams"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="followers" className="text-right">Followers</Label>
                  <Input
                    id="followers"
                    type="number"
                    value={createFormData.follower_count}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, follower_count: parseInt(e.target.value) || 0 }))}
                    className="col-span-3"
                    placeholder="Number of followers"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right">Genres</Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={genreInput}
                        onChange={(e) => setGenreInput(e.target.value)}
                        placeholder="Add genre"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                      />
                      <Button type="button" onClick={addGenre} size="sm">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {createFormData.genres.map((genre) => (
                        <Badge key={genre} variant="secondary" className="cursor-pointer" onClick={() => removeGenre(genre)}>
                          {genre} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setShowCreatePlaylistModal(false);
                  resetCreateForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPlaylist.isPending}>
                  {createPlaylist.isPending ? 'Adding...' : 'Add Playlist'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }









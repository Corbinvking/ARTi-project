"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useUpdatePlaylist, useDeletePlaylist } from '../hooks/useVendorPlaylists';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface VendorPlaylistEditModalProps {
  playlist: any;
  isOpen: boolean;
  onClose: () => void;
}

// Mini sparkline component for follower growth
function FollowerSparkline({ data, isLoading }: { data: { date: string; count: number }[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="h-8 w-24 bg-muted animate-pulse rounded" />
    );
  }
  
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>No history</span>
      </div>
    );
  }
  
  // Calculate trend
  const firstCount = data[0]?.count || 0;
  const lastCount = data[data.length - 1]?.count || 0;
  const change = lastCount - firstCount;
  const percentChange = firstCount > 0 ? ((change / firstCount) * 100).toFixed(1) : '0';
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke={isPositive ? '#22c55e' : isNeutral ? '#9ca3af' : '#ef4444'} 
              strokeWidth={1.5}
              dot={false}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const value = payload[0].value as number;
                  const date = payload[0].payload.date;
                  return (
                    <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border">
                      <p className="font-medium">{value.toLocaleString()}</p>
                      <p className="text-muted-foreground">{date}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className={`flex items-center gap-0.5 text-xs ${isPositive ? 'text-green-600' : isNeutral ? 'text-muted-foreground' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : isNeutral ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>{isPositive ? '+' : ''}{percentChange}%</span>
      </div>
    </div>
  );
}

export function VendorPlaylistEditModal({ playlist, isOpen, onClose }: VendorPlaylistEditModalProps) {
  const updateMutation = useUpdatePlaylist();
  const deleteMutation = useDeletePlaylist();
  
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    genres: [] as string[],
    avg_daily_streams: 0,
    follower_count: 0
  });
  const [genreInput, setGenreInput] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch follower history for sparkline
  const { data: followerHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['playlist-follower-history', playlist?.id],
    queryFn: async () => {
      if (!playlist?.id) return [];
      
      const { data, error } = await supabase
        .from('playlist_follower_history')
        .select('follower_count, recorded_at')
        .eq('playlist_id', playlist.id)
        .order('recorded_at', { ascending: true })
        .limit(30); // Last 30 data points
      
      if (error) {
        console.error('Failed to fetch follower history:', error);
        return [];
      }
      
      return (data || []).map(d => ({
        date: new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: d.follower_count
      }));
    },
    enabled: isOpen && !!playlist?.id
  });

  // Refresh follower count from Spotify Web API
  const refreshFromSpotify = async () => {
    if (!playlist?.url) {
      toast.error('No Spotify URL available');
      return;
    }
    
    setIsRefreshing(true);
    try {
      // Extract playlist ID from URL
      const match = playlist.url.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) {
        toast.error('Invalid Spotify playlist URL');
        return;
      }
      
      const playlistId = match[1];
      
      // Call our API to fetch from Spotify
      const response = await fetch(`/api/spotify-web-api/playlist/${playlistId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch from Spotify');
      }
      
      const spotifyData = await response.json();
      const newFollowerCount = spotifyData.followers?.total || spotifyData.follower_count || 0;
      
      // Update form data
      setFormData(prev => ({ ...prev, follower_count: newFollowerCount }));
      
      toast.success(`Updated to ${newFollowerCount.toLocaleString()} followers`);
    } catch (error) {
      console.error('Spotify refresh error:', error);
      toast.error('Failed to refresh from Spotify');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (playlist) {
      setFormData({
        name: playlist.name || '',
        url: playlist.url || '',
        genres: playlist.genres || [],
        avg_daily_streams: playlist.avg_daily_streams || 0,
        follower_count: playlist.follower_count || 0
      });
    }
  }, [playlist]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlist?.id) return;

    if (!formData.name || !formData.url) {
      toast.error('Name and URL are required');
      return;
    }

    updateMutation.mutate({
      id: playlist.id,
      ...formData
    }, {
      onSuccess: () => {
        onClose();
        toast.success('Playlist updated successfully');
      }
    });
  };

  const handleDelete = async () => {
    if (!playlist?.id) return;
    
    deleteMutation.mutate(playlist.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onClose();
        toast.success('Playlist deleted successfully');
      }
    });
  };

  const addGenre = () => {
    if (genreInput.trim() && !formData.genres.includes(genreInput.trim())) {
      setFormData(prev => ({
        ...prev,
        genres: [...prev.genres, genreInput.trim()]
      }));
      setGenreInput('');
    }
  };

  const removeGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(g => g !== genre)
    }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Update your playlist information and manage genres.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-url" className="text-right">Spotify URL</Label>
                <Input
                  id="edit-url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  className="col-span-3"
                  placeholder="https://open.spotify.com/playlist/..."
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-streams" className="text-right">Daily Streams</Label>
                <div className="col-span-3 space-y-1">
                  <Input
                    id="edit-streams"
                    type="number"
                    value={formData.avg_daily_streams}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated from Spotify data</p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-followers" className="text-right pt-2">Followers</Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-followers"
                      type="number"
                      value={formData.follower_count}
                      disabled
                      className="bg-muted flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshFromSpotify}
                      disabled={isRefreshing || !playlist?.url}
                      className="shrink-0"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Syncing...' : 'Sync'}
                    </Button>
                  </div>
                  
                  {/* Follower Growth Sparkline */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Tracked from Spotify API</p>
                    <FollowerSparkline data={followerHistory} isLoading={historyLoading} />
                  </div>
                </div>
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
                    {formData.genres.map((genre) => (
                      <Badge key={genre} variant="secondary" className="cursor-pointer" onClick={() => removeGenre(genre)}>
                        {genre} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Playlist
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update Playlist'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playlist?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}









"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Users, ExternalLink, Plus } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface Playlist {
  id: string;
  name: string;
  url: string;
  avg_daily_streams: number;
  follower_count: number | null;
  genres: string[];
  vendor_name?: string;
  vendor_id: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface PlaylistSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (playlists: Playlist[]) => void;
  campaignGenre?: string;
  excludePlaylistIds?: string[];
}

export function PlaylistSelector({ 
  open, 
  onClose, 
  onSelect, 
  campaignGenre, 
  excludePlaylistIds = [] 
}: PlaylistSelectorProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [minStreams, setMinStreams] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // New playlist creation state
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistVendor, setNewPlaylistVendor] = useState('');
  const [newPlaylistDailyStreams, setNewPlaylistDailyStreams] = useState('');
  const [newPlaylistGenres, setNewPlaylistGenres] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Function to create a new playlist
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !newPlaylistVendor) {
      toast({
        title: "Error",
        description: "Please provide at least a playlist name and vendor",
        variant: "destructive",
      });
      return;
    }

    setCreatingPlaylist(true);
    try {
      // Extract Spotify ID from URL if provided
      let spotifyId = null;
      if (newPlaylistUrl) {
        const match = newPlaylistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
        if (match) {
          spotifyId = match[1];
        }
      }

      // Parse genres from comma-separated string
      const genresArray = newPlaylistGenres
        .split(',')
        .map(g => g.trim().toLowerCase())
        .filter(g => g.length > 0);

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: newPlaylistName.trim(),
          url: newPlaylistUrl.trim() || null,
          spotify_id: spotifyId,
          vendor_id: newPlaylistVendor,
          avg_daily_streams: parseInt(newPlaylistDailyStreams) || 0,
          genres: genresArray.length > 0 ? genresArray : null,
          follower_count: 0,
        })
        .select(`
          id,
          name,
          url,
          avg_daily_streams,
          follower_count,
          genres,
          vendor_id,
          vendors(name)
        `)
        .single();

      if (error) throw error;

      // Add the new playlist to the local state
      const newPlaylist = {
        ...data,
        vendor_name: (data.vendors as any)?.name || 'Unknown Vendor',
        genres: data.genres || [],
      };
      
      setPlaylists(prev => [newPlaylist, ...prev]);
      
      // Auto-select the newly created playlist
      setSelectedPlaylists(prev => new Set([...prev, data.id]));
      
      toast({
        title: "Success",
        description: `Playlist "${newPlaylistName}" created and added`,
      });

      // Reset form and close
      setShowAddPlaylist(false);
      setNewPlaylistName('');
      setNewPlaylistUrl('');
      setNewPlaylistVendor('');
      setNewPlaylistDailyStreams('');
      setNewPlaylistGenres('');
    } catch (error: any) {
      console.error('Failed to create playlist:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create playlist",
        variant: "destructive",
      });
    } finally {
      setCreatingPlaylist(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPlaylistsAndVendors();
    }
  }, [open]);

  const fetchPlaylistsAndVendors = async () => {
    setLoading(true);
    try {
      // Fetch playlists with vendor information (only from active vendors)
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          url,
          avg_daily_streams,
          follower_count,
          genres,
          vendor_id,
          vendors(name, is_active)
        `)
        .eq('vendors.is_active', true)
        .order('avg_daily_streams', { ascending: false });

      if (playlistError) throw playlistError;

      // Fetch active vendors only
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (vendorError) throw vendorError;

      const processedPlaylists = (playlistData || []).map(p => ({
        ...p,
        vendor_name: (p.vendors as any)?.name || 'Unknown Vendor'
      }));

      setPlaylists(processedPlaylists);
      setVendors(vendorData || []);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      toast({
        title: "Error",
        description: "Failed to load playlists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePlaylistSelection = (playlistId: string) => {
    const newSelection = new Set(selectedPlaylists);
    if (newSelection.has(playlistId)) {
      newSelection.delete(playlistId);
    } else {
      newSelection.add(playlistId);
    }
    setSelectedPlaylists(newSelection);
  };

  const handleConfirm = () => {
    const selectedPlaylistObjects = playlists.filter(p => selectedPlaylists.has(p.id));
    onSelect(selectedPlaylistObjects);
    onClose();
    setSelectedPlaylists(new Set());
  };

  const handleClose = () => {
    setSelectedPlaylists(new Set());
    onClose();
  };

  // Get unique genres from all playlists
  const allGenres = [...new Set(playlists.flatMap(p => p.genres))].sort();

  // Filter playlists based on search and filters
  const filteredPlaylists = playlists.filter(playlist => {
    // Exclude already selected playlists
    if (excludePlaylistIds.includes(playlist.id)) return false;

    // Search filter
    if (searchTerm && !playlist.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Vendor filter
    if (selectedVendor !== 'all' && playlist.vendor_id !== selectedVendor) {
      return false;
    }

    // Genre filter
    if (selectedGenre !== 'all' && !playlist.genres.includes(selectedGenre)) {
      return false;
    }

    // Min streams filter
    if (minStreams && playlist.avg_daily_streams < parseInt(minStreams)) {
      return false;
    }

    return true;
  });

  // Sort by genre match if campaign genre is provided
  const sortedPlaylists = campaignGenre 
    ? filteredPlaylists.sort((a, b) => {
        const aMatches = a.genres.includes(campaignGenre);
        const bMatches = b.genres.includes(campaignGenre);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return b.avg_daily_streams - a.avg_daily_streams;
      })
    : filteredPlaylists;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Playlists to Campaign</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search playlists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger>
              <SelectValue placeholder="All vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map(vendor => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger>
              <SelectValue placeholder="All genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {allGenres.map(genre => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Min daily streams"
            value={minStreams}
            onChange={(e) => setMinStreams(e.target.value)}
          />
        </div>

        {/* Results count, selected count, and Add New button */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{sortedPlaylists.length} playlists found</span>
          <div className="flex items-center gap-4">
            <span>{selectedPlaylists.size} selected</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAddPlaylist(!showAddPlaylist)}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add New Playlist
            </Button>
          </div>
        </div>

        {/* Add New Playlist Form */}
        {showAddPlaylist && (
          <Card className="border-primary/50">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-playlist-name">Playlist Name *</Label>
                  <Input
                    id="new-playlist-name"
                    placeholder="My New Playlist"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-playlist-vendor">Vendor *</Label>
                  <Select value={newPlaylistVendor} onValueChange={setNewPlaylistVendor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-playlist-url">Spotify URL (optional)</Label>
                  <Input
                    id="new-playlist-url"
                    placeholder="https://open.spotify.com/playlist/..."
                    value={newPlaylistUrl}
                    onChange={(e) => setNewPlaylistUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-playlist-streams">Avg Daily Streams (optional)</Label>
                  <Input
                    id="new-playlist-streams"
                    type="number"
                    placeholder="1000"
                    value={newPlaylistDailyStreams}
                    onChange={(e) => setNewPlaylistDailyStreams(e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="new-playlist-genres">Genres (comma-separated, optional)</Label>
                  <Input
                    id="new-playlist-genres"
                    placeholder="pop, hip-hop, electronic"
                    value={newPlaylistGenres}
                    onChange={(e) => setNewPlaylistGenres(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowAddPlaylist(false);
                    setNewPlaylistName('');
                    setNewPlaylistUrl('');
                    setNewPlaylistVendor('');
                    setNewPlaylistDailyStreams('');
                    setNewPlaylistGenres('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCreatePlaylist}
                  disabled={creatingPlaylist || !newPlaylistName.trim() || !newPlaylistVendor}
                >
                  {creatingPlaylist ? 'Creating...' : 'Create & Add'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Playlist list */}
        <div className="h-[400px] overflow-hidden border rounded-lg">
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                Loading playlists...
              </div>
            ) : sortedPlaylists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No playlists match your criteria
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sortedPlaylists.map(playlist => {
                  const isSelected = selectedPlaylists.has(playlist.id);
                  const genreMatch = campaignGenre && playlist.genres.includes(campaignGenre);
                  
                  return (
                    <div 
                      key={playlist.id}
                      className={`cursor-pointer transition-all hover:bg-accent/50 border rounded px-3 py-2 flex items-center gap-3 ${
                        isSelected ? 'border-primary bg-accent/20' : 'border-border'
                      } ${genreMatch ? 'border-accent' : ''}`}
                      onClick={() => togglePlaylistSelection(playlist.id)}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 bg-primary-foreground rounded-sm"></div>
                        )}
                      </div>

                      {/* Playlist Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{playlist.name}</h4>
                          {genreMatch && (
                            <Badge variant="default" className="text-xs flex-shrink-0">
                              Match
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">{playlist.avg_daily_streams.toLocaleString()} daily</span>
                          {playlist.follower_count && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {playlist.follower_count.toLocaleString()}
                            </span>
                          )}
                          <Badge variant="secondary" className="text-xs">{playlist.vendor_name}</Badge>
                        </div>
                      </div>

                      {/* Genres and Link */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex gap-1">
                          {playlist.genres.slice(0, 2).map(genre => (
                            <Badge key={genre} variant="outline" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                          {playlist.genres.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{playlist.genres.length - 2}
                            </span>
                          )}
                        </div>
                        <a
                          href={playlist.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedPlaylists.size === 0}
          >
            Add {selectedPlaylists.size} Playlist{selectedPlaylists.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}









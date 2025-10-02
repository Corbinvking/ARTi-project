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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, ExternalLink } from 'lucide-react';
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

        {/* Results count and selected count */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{sortedPlaylists.length} playlists found</span>
          <span>{selectedPlaylists.size} selected</span>
        </div>

        {/* Playlist list */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              Loading playlists...
            </div>
          ) : sortedPlaylists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No playlists match your criteria
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {sortedPlaylists.map(playlist => {
                const isSelected = selectedPlaylists.has(playlist.id);
                const genreMatch = campaignGenre && playlist.genres.includes(campaignGenre);
                
                return (
                  <Card 
                    key={playlist.id}
                    className={`cursor-pointer transition-all hover:bg-accent/50 ${
                      isSelected ? 'border-primary bg-accent/20' : ''
                    } ${genreMatch ? 'border-accent' : ''}`}
                    onClick={() => togglePlaylistSelection(playlist.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{playlist.name}</h4>
                            {genreMatch && (
                              <Badge variant="default" className="text-xs">
                                Genre Match
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <span>{playlist.avg_daily_streams.toLocaleString()} daily streams</span>
                            {playlist.follower_count && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {playlist.follower_count.toLocaleString()} followers
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{playlist.vendor_name}</Badge>
                            {playlist.genres.slice(0, 3).map(genre => (
                              <Badge key={genre} variant="outline" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                            {playlist.genres.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{playlist.genres.length - 3} more
                              </span>
                            )}
                          </div>

                          <a
                            href={playlist.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Playlist
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-primary border-primary' : 'border-border'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-primary-foreground rounded-sm"></div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

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









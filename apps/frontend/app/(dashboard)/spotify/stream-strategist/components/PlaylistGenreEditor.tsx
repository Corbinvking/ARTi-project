"use client"

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, RefreshCw, X, Check, Music } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { UNIFIED_GENRES } from '../lib/constants';

interface PlaylistGenreEditorProps {
  playlist: {
    id: string;
    name: string;
    url?: string;
    spotify_id?: string;
    genres?: string[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistGenreEditor({ playlist, isOpen, onClose }: PlaylistGenreEditorProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingFromSpotify, setIsFetchingFromSpotify] = useState(false);
  const [spotifyGenres, setSpotifyGenres] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize genres from playlist
  useEffect(() => {
    if (playlist?.genres) {
      setSelectedGenres(playlist.genres);
    } else {
      setSelectedGenres([]);
    }
    setSpotifyGenres([]);
  }, [playlist]);

  // Extract Spotify playlist ID from URL
  const getSpotifyId = (): string | null => {
    if (playlist?.spotify_id) return playlist.spotify_id;
    if (!playlist?.url) return null;
    
    const match = playlist.url.match(/playlist\/([a-zA-Z0-9]{22})/);
    return match ? match[1] : null;
  };

  const spotifyId = getSpotifyId();

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      }
      if (prev.length >= 5) {
        toast({
          title: "Max genres reached",
          description: "You can select up to 5 genres per playlist.",
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, genre];
    });
  };

  const fetchGenresFromSpotify = async () => {
    if (!spotifyId) {
      toast({
        title: "No Spotify ID",
        description: "Unable to find a valid Spotify playlist ID from the URL.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingFromSpotify(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';
      const response = await fetch(`${apiBaseUrl}/api/spotify-web-api/playlist/${spotifyId}/genres`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.genres?.length > 0) {
        setSpotifyGenres(result.data.genres);
        
        // Map raw genres to unified genres
        const mappedGenres = mapToUnifiedGenres(result.data.genres);
        
        if (mappedGenres.length > 0) {
          setSelectedGenres(prev => {
            const combined = [...new Set([...prev, ...mappedGenres])];
            return combined.slice(0, 5); // Max 5 genres
          });
          toast({
            title: "Genres detected",
            description: `Found: ${mappedGenres.join(', ')}`,
          });
        } else {
          toast({
            title: "No matching genres",
            description: `Spotify genres (${result.data.genres.slice(0, 3).join(', ')}) don't match our categories. Please select manually.`,
          });
        }
      } else {
        toast({
          title: "No genres found",
          description: "Spotify didn't return any genre data for this playlist.",
        });
      }
    } catch (error: any) {
      console.error('Error fetching genres from Spotify:', error);
      toast({
        title: "Fetch failed",
        description: error.message || "Failed to fetch genres from Spotify.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingFromSpotify(false);
    }
  };

  // Map raw Spotify genres to our unified categories
  const mapToUnifiedGenres = (rawGenres: string[]): string[] => {
    const mapped: Set<string> = new Set();
    
    const genreMapping: Record<string, string[]> = {
      'phonk': ['phonk', 'drift phonk', 'brazilian phonk', 'dark phonk'],
      'tech house': ['tech house', 'melodic house', 'deep tech'],
      'techno': ['techno', 'dark techno', 'industrial techno', 'minimal techno'],
      'house': ['house', 'deep house', 'future house', 'uk house', 'slap house'],
      'pop': ['pop', 'dance pop', 'synth-pop', 'electropop', 'k-pop', 'indie pop'],
      'hip-hop': ['hip hop', 'hip-hop', 'rap', 'trap', 'boom bap'],
      'r&b': ['r&b', 'rnb', 'neo soul', 'soul', 'urban contemporary'],
      'rock': ['rock', 'indie rock', 'alternative rock', 'classic rock'],
      'indie': ['indie', 'indie rock', 'indie pop', 'indie folk'],
      'chill': ['chill', 'chillout', 'lo-fi', 'lofi', 'chillhop', 'downtempo'],
      'dance': ['dance', 'edm', 'electronic', 'electro'],
      'latin': ['latin', 'reggaeton', 'latin pop', 'urbano latino'],
      'country': ['country', 'americana', 'country pop'],
      'jazz': ['jazz', 'smooth jazz', 'jazz fusion'],
      'classical': ['classical', 'orchestral', 'modern classical'],
      'metal': ['metal', 'heavy metal', 'metalcore', 'death metal'],
      'folk': ['folk', 'indie folk', 'singer-songwriter', 'acoustic'],
    };
    
    for (const rawGenre of rawGenres) {
      const lower = rawGenre.toLowerCase();
      
      for (const [unified, related] of Object.entries(genreMapping)) {
        if (related.some(r => lower.includes(r) || r.includes(lower))) {
          mapped.add(unified);
        }
      }
      
      // Direct match to unified genres
      if (UNIFIED_GENRES.includes(lower)) {
        mapped.add(lower);
      }
    }
    
    return Array.from(mapped).slice(0, 5);
  };

  const handleSave = async () => {
    if (!playlist?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('playlists')
        .update({ genres: selectedGenres })
        .eq('id', playlist.id);
      
      if (error) throw error;
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['all-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      
      toast({
        title: "Genres saved",
        description: `Updated genres for "${playlist.name}".`,
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error saving genres:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save genres.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Edit Playlist Genres
          </DialogTitle>
          <DialogDescription>
            {playlist?.name ? `Set genres for "${playlist.name}"` : 'Select up to 5 genres for this playlist.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Spotify Auto-fetch */}
          {spotifyId && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm">Auto-detect from Spotify</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchGenresFromSpotify}
                disabled={isFetchingFromSpotify}
              >
                {isFetchingFromSpotify ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Fetch Genres
              </Button>
            </div>
          )}

          {/* Spotify raw genres display */}
          {spotifyGenres.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <Label className="text-xs text-muted-foreground">Detected from Spotify:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {spotifyGenres.map(genre => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Selected genres */}
          <div>
            <Label className="text-sm font-medium">Selected Genres ({selectedGenres.length}/5)</Label>
            <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-2 border rounded-lg bg-background">
              {selectedGenres.length > 0 ? (
                selectedGenres.map(genre => (
                  <Badge
                    key={genre}
                    variant="default"
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No genres selected</span>
              )}
            </div>
          </div>

          {/* Genre selector */}
          <div>
            <Label className="text-sm font-medium">Available Genres</Label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
              {UNIFIED_GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <Badge
                    key={genre}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-primary' 
                        : 'hover:bg-primary/10'
                    }`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {isSelected && <Check className="h-3 w-3 mr-1" />}
                    {genre}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Genres
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


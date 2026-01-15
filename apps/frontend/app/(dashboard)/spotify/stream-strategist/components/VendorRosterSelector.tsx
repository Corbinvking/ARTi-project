"use client"

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Package, 
  Music, 
  TrendingUp, 
  DollarSign, 
  Users,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { Vendor, Playlist } from '../types';
import { UNIFIED_GENRES } from '../lib/constants';

// Genre mapping from unified categories to Spotify-specific genres for matching
const GENRE_MAPPING: Record<string, string[]> = {
  'phonk': ['phonk', 'drift phonk', 'brazilian phonk', 'dark phonk'],
  'tech house': ['tech house', 'melodic house', 'deep tech'],
  'techno': ['techno', 'dark techno', 'industrial techno', 'minimal techno', 'peak time techno', 'hard techno'],
  'minimal': ['minimal', 'minimal house', 'minimal techno', 'microhouse'],
  'house': ['house', 'deep house', 'future house', 'funky house', 'vocal house', 'uk house', 'chicago house', 'slap house', 'stutter house'],
  'progressive house': ['progressive house', 'progressive electro house', 'progressive trance'],
  'bass house': ['bass house', 'uk bass', 'bass music', 'wobble bass'],
  'big room': ['big room', 'big room edm', 'mainstage'],
  'afro house': ['afro house', 'afro tech', 'afro deep'],
  'afrobeats': ['afrobeats', 'afropop', 'afroswing', 'amapiano', 'nigerian pop'],
  'hardstyle': ['hardstyle', 'rawstyle', 'euphoric hardstyle', 'hardcore', 'happy hardcore'],
  'dubstep': ['dubstep', 'brostep', 'riddim dubstep', 'melodic dubstep', 'chillstep', 'deathstep', 'tearout'],
  'trap': ['trap', 'trap edm', 'festival trap', 'hybrid trap', 'trap latino', 'southern trap'],
  'melodic bass': ['melodic bass', 'melodic dubstep', 'future bass', 'color bass', 'wave'],
  'trance': ['trance', 'uplifting trance', 'vocal trance', 'psytrance', 'progressive trance', 'acid trance'],
  'dance': ['dance', 'dance pop', 'edm', 'electro house', 'electronic', 'electronica'],
  'pop': ['pop', 'dance pop', 'synth-pop', 'electropop', 'alt pop', 'indie pop', 'dream pop', 'k-pop', 'j-pop', 'pop rap', 'power pop', 'bedroom pop'],
  'indie': ['indie', 'indie rock', 'indie pop', 'indie folk', 'indie electronic', 'indietronica'],
  'alternative': ['alternative', 'alt rock', 'alternative rock', 'grunge', 'post-grunge'],
  'rock': ['rock', 'classic rock', 'hard rock', 'soft rock', 'progressive rock', 'psychedelic rock', 'garage rock', 'post-rock', 'arena rock'],
  'hip-hop': ['hip hop', 'hip-hop', 'rap', 'conscious hip hop', 'gangsta rap', 'underground hip hop', 'trap', 'boom bap', 'southern hip hop', 'west coast rap', 'east coast hip hop'],
  'r&b': ['r&b', 'rnb', 'neo soul', 'soul', 'new jack swing', 'contemporary r&b', 'alternative r&b', 'urban contemporary'],
  'country': ['country', 'modern country', 'country pop', 'country rock', 'americana', 'outlaw country', 'country rap'],
  'jazz': ['jazz', 'smooth jazz', 'jazz fusion', 'contemporary jazz', 'vocal jazz', 'nu jazz', 'acid jazz'],
  'folk': ['folk', 'indie folk', 'folk rock', 'contemporary folk', 'singer-songwriter', 'acoustic'],
  'metal': ['metal', 'heavy metal', 'death metal', 'black metal', 'thrash metal', 'progressive metal', 'metalcore', 'deathcore', 'nu metal', 'power metal'],
  'classical': ['classical', 'modern classical', 'contemporary classical', 'neo-classical', 'orchestral', 'chamber music'],
  'reggae': ['reggae', 'reggaeton', 'dancehall', 'dub', 'roots reggae'],
  'latin': ['latin', 'latin pop', 'reggaeton', 'bachata', 'salsa', 'cumbia', 'latin hip hop', 'urbano latino'],
  'brazilian': ['brazilian', 'brazilian bass', 'sertanejo', 'mpb', 'funk carioca', 'bossa nova'],
  'blues': ['blues', 'blues rock', 'electric blues', 'modern blues', 'delta blues'],
  'punk': ['punk', 'punk rock', 'pop punk', 'post-punk', 'skate punk', 'hardcore punk'],
  'chill': ['chill', 'chillout', 'chillwave', 'lo-fi', 'lofi beats', 'chillhop', 'downtempo', 'chill r&b'],
  'ambient': ['ambient', 'dark ambient', 'ambient electronic', 'drone', 'space ambient'],
  'experimental': ['experimental', 'experimental electronic', 'avant-garde', 'noise', 'glitch', 'art pop']
};

// Calculate genre match score between campaign genres and playlist genres
function calculateGenreMatchScore(campaignGenres: string[], playlistGenres: string[]): number {
  if (!campaignGenres.length || !playlistGenres.length) return 0;
  
  let score = 0;
  const normalizedPlaylistGenres = playlistGenres.map(g => g.toLowerCase().trim());
  
  for (const campaignGenre of campaignGenres) {
    const normalizedCampaignGenre = campaignGenre.toLowerCase().trim();
    
    // Direct match
    if (normalizedPlaylistGenres.includes(normalizedCampaignGenre)) {
      score += 3; // Strong match
      continue;
    }
    
    // Check if playlist has any related genres
    const relatedGenres = GENRE_MAPPING[normalizedCampaignGenre] || [normalizedCampaignGenre];
    for (const related of relatedGenres) {
      if (normalizedPlaylistGenres.some(pg => pg.includes(related) || related.includes(pg))) {
        score += 2; // Related match
        break;
      }
    }
    
    // Partial match (genre word appears in playlist genre)
    if (normalizedPlaylistGenres.some(pg => pg.includes(normalizedCampaignGenre) || normalizedCampaignGenre.includes(pg))) {
      score += 1; // Partial match
    }
  }
  
  return score;
}

interface VendorRosterSelectorProps {
  onNext: (selections: { playlistIds: string[] }) => void;
  onBack: () => void;
  campaignGenres?: string[];
  streamGoal?: number;
  campaignDuration?: number;
}

export function VendorRosterSelector({ 
  onNext, 
  onBack, 
  campaignGenres = [],
  streamGoal = 0,
  campaignDuration = 90
}: VendorRosterSelectorProps) {
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMatching, setShowOnlyMatching] = useState(campaignGenres.length > 0);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Fetch all vendors (same query as vendor panel)
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_users(user_id, vendor_id)
        `)
        .order('name');
      
      if (error) throw error;
      return data as Vendor[];
    },
  });

  // Fetch all playlists with vendor data (same query as vendor panel)
  const { data: allPlaylists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ['all-playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          vendor:vendors(id, name, cost_per_1k_streams, is_active)
        `)
        .order('name');
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Add genre match scores to playlists
  const playlistsWithScores = useMemo(() => {
    return allPlaylists.map(playlist => ({
      ...playlist,
      genreMatchScore: calculateGenreMatchScore(campaignGenres, playlist.genres || [])
    }));
  }, [allPlaylists, campaignGenres]);

  // Filter playlists by search term and optionally by genre match
  const filteredPlaylists = useMemo(() => {
    let result = playlistsWithScores;
    
    // Filter by genre match if enabled and we have campaign genres
    if (showOnlyMatching && campaignGenres.length > 0) {
      result = result.filter(playlist => playlist.genreMatchScore > 0);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(playlist => 
        playlist.name?.toLowerCase().includes(term) ||
        playlist.vendor?.name?.toLowerCase().includes(term) ||
        playlist.genres?.some((g: string) => g.toLowerCase().includes(term))
      );
    }
    
    // Sort by genre match score (highest first), then by avg_daily_streams
    return result.sort((a, b) => {
      if (b.genreMatchScore !== a.genreMatchScore) {
        return b.genreMatchScore - a.genreMatchScore;
      }
      return (b.avg_daily_streams || 0) - (a.avg_daily_streams || 0);
    });
  }, [playlistsWithScores, searchTerm, showOnlyMatching, campaignGenres]);

  // Count matching playlists
  const matchingPlaylistsCount = useMemo(() => {
    if (campaignGenres.length === 0) return 0;
    return playlistsWithScores.filter(p => p.genreMatchScore > 0).length;
  }, [playlistsWithScores, campaignGenres]);

  // Auto-select playlists with good genre matches on first load
  // CAP selections based on stream goal - only select enough playlists to meet the goal
  useEffect(() => {
    if (!hasAutoSelected && campaignGenres.length > 0 && playlistsWithScores.length > 0) {
      // Sort by genre match score first, then by daily streams
      const sortedCandidates = [...playlistsWithScores]
        .filter(p => p.genreMatchScore >= 2)
        .sort((a, b) => {
          if (b.genreMatchScore !== a.genreMatchScore) {
            return b.genreMatchScore - a.genreMatchScore;
          }
          return (b.avg_daily_streams || 0) - (a.avg_daily_streams || 0);
        });

      // If we have a stream goal, cap selections to meet it
      const autoSelectIds: string[] = [];
      let cumulativeProjectedStreams = 0;

      for (const playlist of sortedCandidates) {
        const projectedStreams = (playlist.avg_daily_streams || 0) * campaignDuration;
        
        // If no stream goal or we haven't reached it yet, add this playlist
        if (streamGoal === 0 || cumulativeProjectedStreams < streamGoal) {
          autoSelectIds.push(playlist.id);
          cumulativeProjectedStreams += projectedStreams;
          
          // Stop if we've reached or exceeded the goal
          if (streamGoal > 0 && cumulativeProjectedStreams >= streamGoal) {
            break;
          }
        }
        
        // Also limit to reasonable number (max 20)
        if (autoSelectIds.length >= 20) break;
      }
      
      if (autoSelectIds.length > 0) {
        setSelectedPlaylists(new Set(autoSelectIds));
        // Expand vendors that have auto-selected playlists
        const vendorIds = new Set(
          playlistsWithScores
            .filter(p => autoSelectIds.includes(p.id))
            .map(p => p.vendor_id)
        );
        setExpandedVendors(vendorIds);
      }
      setHasAutoSelected(true);
    }
  }, [hasAutoSelected, campaignGenres, playlistsWithScores, streamGoal, campaignDuration]);

  // Group playlists by vendor
  const playlistsByVendor = useMemo(() => {
    const grouped: Record<string, typeof filteredPlaylists> = {};
    
    filteredPlaylists.forEach(playlist => {
      const vendorId = playlist.vendor_id;
      if (!grouped[vendorId]) {
        grouped[vendorId] = [];
      }
      grouped[vendorId].push(playlist);
    });
    
    return grouped;
  }, [filteredPlaylists]);

  const handleTogglePlaylist = (playlistId: string) => {
    setSelectedPlaylists(prev => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  };

  const handleToggleVendor = (vendorId: string) => {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
      }
      return next;
    });
  };

  const handleSelectAllVendorPlaylists = (vendorId: string) => {
    const vendorPlaylists = playlistsByVendor[vendorId] || [];
    setSelectedPlaylists(prev => {
      const next = new Set(prev);
      vendorPlaylists.forEach(p => next.add(p.id));
      return next;
    });
  };

  const handleDeselectAllVendorPlaylists = (vendorId: string) => {
    const vendorPlaylists = playlistsByVendor[vendorId] || [];
    setSelectedPlaylists(prev => {
      const next = new Set(prev);
      vendorPlaylists.forEach(p => next.delete(p.id));
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPlaylists(new Set(allPlaylists.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedPlaylists(new Set());
  };

  // Only count playlists that are actually visible in the current filtered view
  const selectedPlaylistsList = Array.from(selectedPlaylists).map(id => 
    filteredPlaylists.find(p => p.id === id)
  ).filter(Boolean);

  // Also track if there are hidden selections (selected but filtered out)
  const hiddenSelectedCount = selectedPlaylists.size - selectedPlaylistsList.length;

  const totalDailyStreams = selectedPlaylistsList.reduce((sum, p) => sum + (p?.avg_daily_streams || 0), 0);
  const totalProjectedStreams = totalDailyStreams * campaignDuration;
  
  // Check if we're exceeding the stream goal
  const isExceedingGoal = streamGoal > 0 && totalProjectedStreams > streamGoal;
  const streamGoalPercentage = streamGoal > 0 ? Math.round((totalProjectedStreams / streamGoal) * 100) : 0;
  
  // Calculate total cost for campaign duration
  const totalCostPerDay = selectedPlaylistsList.reduce((sum, p) => {
    const vendor = p?.vendor;
    // Default to $8 per 1k if vendor rate not set
    const costPer1k = vendor?.cost_per_1k_streams || 8;
    const dailyCost = (p?.avg_daily_streams || 0) / 1000 * costPer1k;
    return sum + dailyCost;
  }, 0);
  
  const totalCost = totalCostPerDay * campaignDuration;
  
  const handleNext = () => {
    // Convert selected playlists to the format expected by CampaignReview
    const selectedPlaylistObjects = selectedPlaylistsList.map(playlist => {
      const costPer1k = playlist.vendor?.cost_per_1k_streams || 8; // Default $8/1k
      return {
        id: playlist.id,
        name: playlist.name,
        url: playlist.url,
        vendor_name: playlist.vendor?.name,
        vendor_id: playlist.vendor?.id,
        vendor: { 
          ...playlist.vendor, 
          cost_per_1k_streams: costPer1k 
        },
        genres: playlist.genres || [],
        status: 'Pending',
        avg_daily_streams: playlist.avg_daily_streams || 0,
        streams_allocated: (playlist.avg_daily_streams || 0) * campaignDuration,
        cost_per_stream: costPer1k / 1000,
        cost_per_1k: costPer1k
      };
    });
    
    // Collect unique vendors from selected playlists
    const selectedVendorsList = [...new Map(
      selectedPlaylistsList
        .filter(p => p?.vendor)
        .map(p => [p.vendor.id, { 
          id: p.vendor.id, 
          name: p.vendor.name,
          cost_per_1k_streams: p.vendor.cost_per_1k_streams 
        }])
    ).values()];
    
    onNext({
      playlistIds: Array.from(selectedPlaylists),
      selectedPlaylists: selectedPlaylistObjects,
      selectedVendors: selectedVendorsList, // Include selected vendors
      allocations: selectedPlaylistObjects,
      totalProjectedStreams: totalProjectedStreams, // Use calculated value with campaign duration
      totalCost: totalCost
    });
  };

  const isLoading = vendorsLoading || playlistsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Vendor & Playlist Roster
          </CardTitle>
          <CardDescription>
            Select vendors and playlists from your roster to include in this campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campaign Genres Display */}
          {campaignGenres.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Campaign Genres:</span>
              {campaignGenres.map(genre => (
                <Badge key={genre} variant="default" className="bg-primary/80">
                  {genre}
                </Badge>
              ))}
              {matchingPlaylistsCount > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({matchingPlaylistsCount} matching playlists)
                </span>
              )}
            </div>
          )}

          {/* Search and Filter */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors or playlists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Genre Filter Toggle */}
            {campaignGenres.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="genre-filter" className="text-sm cursor-pointer">
                  Show only matches
                </Label>
                <Switch
                  id="genre-filter"
                  checked={showOnlyMatching}
                  onCheckedChange={setShowOnlyMatching}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All {showOnlyMatching && matchingPlaylistsCount > 0 ? `(${matchingPlaylistsCount})` : ''}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>
            <Badge variant="secondary">
              {selectedPlaylists.size} playlist{selectedPlaylists.size !== 1 ? 's' : ''} selected
            </Badge>
          </div>

          {/* Summary */}
          {/* Show summary only when playlists are visibly selected */}
          {selectedPlaylistsList.length > 0 && (
            <Card className={`${isExceedingGoal ? 'bg-amber-50 border-amber-300' : 'bg-primary/5 border-primary/20'}`}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className={isExceedingGoal ? 'text-amber-700' : 'text-muted-foreground'}>Projected Streams</div>
                    <div className={`text-xl font-bold ${isExceedingGoal ? 'text-amber-900' : ''}`}>
                      {totalProjectedStreams.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className={isExceedingGoal ? 'text-amber-700' : 'text-muted-foreground'}>Stream Goal</div>
                    <div className={`text-xl font-bold ${isExceedingGoal ? 'text-amber-900' : ''}`}>
                      {streamGoal > 0 ? streamGoal.toLocaleString() : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div className={isExceedingGoal ? 'text-amber-700' : 'text-muted-foreground'}>Estimated Cost</div>
                    <div className={`text-xl font-bold ${isExceedingGoal ? 'text-amber-900' : ''}`}>
                      ${totalCost.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className={isExceedingGoal ? 'text-amber-700' : 'text-muted-foreground'}>Unique Vendors</div>
                    <div className={`text-xl font-bold ${isExceedingGoal ? 'text-amber-900' : ''}`}>
                      {new Set(selectedPlaylistsList.map(p => p?.vendor_id).filter(Boolean)).size}
                    </div>
                  </div>
                </div>
                {/* Warning when exceeding goal */}
                {isExceedingGoal && (
                  <div className="mt-3 p-2 bg-amber-100 border border-amber-300 rounded text-amber-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Selected playlists project {streamGoalPercentage}% of goal ({totalProjectedStreams.toLocaleString()} / {streamGoal.toLocaleString()} streams). 
                      Consider removing some playlists.
                    </span>
                  </div>
                )}
                {/* Show goal coverage when under goal */}
                {streamGoal > 0 && !isExceedingGoal && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                    Coverage: {streamGoalPercentage}% of stream goal
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Show message when playlists are selected but hidden by filter */}
          {selectedPlaylistsList.length === 0 && hiddenSelectedCount > 0 && (
            <Card className="bg-blue-50 border-blue-300">
              <CardContent className="pt-4">
                <div className="text-sm text-blue-700 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>
                    {hiddenSelectedCount} playlist{hiddenSelectedCount > 1 ? 's' : ''} selected but hidden by current filter. 
                    <button 
                      onClick={() => setShowOnlyMatching(false)}
                      className="underline ml-1 hover:text-blue-900"
                    >
                      Show all playlists
                    </button>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Vendors and Playlists */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading vendors and playlists...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vendors.filter(v => playlistsByVendor[v.id]?.length > 0).map(vendor => {
            const vendorPlaylists = playlistsByVendor[vendor.id] || [];
            const isExpanded = expandedVendors.has(vendor.id);
            const selectedVendorCount = vendorPlaylists.filter(p => selectedPlaylists.has(p.id)).length;
            const vendorSelectedCount = `${selectedVendorCount}/${vendorPlaylists.length}`;

            return (
              <Card key={vendor.id} className="overflow-hidden">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => handleToggleVendor(vendor.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-base">{vendor.name}</CardTitle>
                      {!vendor.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{vendorPlaylists.length} playlists</Badge>
                      <Badge variant={selectedVendorCount > 0 ? 'default' : 'outline'}>
                        {vendorSelectedCount} selected
                      </Badge>
                      {selectedVendorCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeselectAllVendorPlaylists(vendor.id);
                          }}
                          className="text-xs h-7"
                        >
                          Clear
                        </Button>
                      )}
                      {selectedVendorCount < vendorPlaylists.length && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAllVendorPlaylists(vendor.id);
                          }}
                          className="text-xs h-7"
                        >
                          Select All
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {vendorPlaylists.map(playlist => {
                        const isSelected = selectedPlaylists.has(playlist.id);
                        const matchScore = playlist.genreMatchScore || 0;
                        const hasMatch = matchScore > 0 && campaignGenres.length > 0;
                        
                        return (
                          <div
                            key={playlist.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              isSelected 
                                ? 'bg-primary/5 border-primary/30' 
                                : hasMatch
                                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50'
                                  : 'hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleTogglePlaylist(playlist.id)}
                            />
                            <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{playlist.name}</span>
                                  {hasMatch && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        matchScore >= 3 
                                          ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300' 
                                          : matchScore >= 2
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-300'
                                            : 'bg-lime-100 text-lime-700 border-lime-300 dark:bg-lime-900 dark:text-lime-300'
                                      }`}
                                    >
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      {matchScore >= 3 ? 'Strong' : matchScore >= 2 ? 'Good' : 'Partial'} Match
                                    </Badge>
                                  )}
                                </div>
                                {playlist.genres && playlist.genres.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {playlist.genres.slice(0, 3).join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-2 text-center">
                                <div className="text-sm font-medium flex items-center justify-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {(playlist.avg_daily_streams && playlist.avg_daily_streams > 0) 
                                    ? playlist.avg_daily_streams.toLocaleString()
                                    : <span className="text-muted-foreground text-xs">--</span>
                                  }
                                </div>
                                <div className="text-xs text-muted-foreground">daily</div>
                              </div>
                              <div className="col-span-2 text-center">
                                <div className="text-sm font-medium flex items-center justify-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {(playlist.follower_count && playlist.follower_count > 0)
                                    ? playlist.follower_count.toLocaleString()
                                    : <span className="text-muted-foreground text-xs">--</span>
                                  }
                                </div>
                                <div className="text-xs text-muted-foreground">followers</div>
                              </div>
                              <div className="col-span-2 text-center">
                                <div className="text-sm font-medium flex items-center justify-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${playlist.vendor?.cost_per_1k_streams || 8}
                                </div>
                                <div className="text-xs text-muted-foreground">per 1K</div>
                              </div>
                              <div className="col-span-2 text-right">
                                {playlist.url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <a href={playlist.url} target="_blank" rel="noopener noreferrer">
                                      <Music className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={selectedPlaylists.size === 0}
        >
          Continue with {selectedPlaylists.size} playlist{selectedPlaylists.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}


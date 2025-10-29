"use client"

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Package, 
  Music, 
  TrendingUp, 
  DollarSign, 
  Users,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Vendor, Playlist } from '../types';

interface VendorRosterSelectorProps {
  onNext: (selections: { playlistIds: string[] }) => void;
  onBack: () => void;
}

export function VendorRosterSelector({ onNext, onBack }: VendorRosterSelectorProps) {
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter playlists by search term
  const filteredPlaylists = useMemo(() => {
    if (!searchTerm) return allPlaylists;
    
    const term = searchTerm.toLowerCase();
    return allPlaylists.filter(playlist => 
      playlist.name?.toLowerCase().includes(term) ||
      playlist.vendor?.name?.toLowerCase().includes(term) ||
      playlist.genres?.some((g: string) => g.toLowerCase().includes(term))
    );
  }, [allPlaylists, searchTerm]);

  // Group playlists by vendor
  const playlistsByVendor = useMemo(() => {
    const grouped: Record<string, typeof allPlaylists> = {};
    
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

  const selectedPlaylistsList = Array.from(selectedPlaylists).map(id => 
    allPlaylists.find(p => p.id === id)
  ).filter(Boolean);

  const totalDailyStreams = selectedPlaylistsList.reduce((sum, p) => sum + (p?.avg_daily_streams || 0), 0);
  const totalCost = selectedPlaylistsList.reduce((sum, p) => {
    const vendor = p?.vendor;
    if (!vendor?.cost_per_1k_streams) return sum;
    const dailyCost = (p.avg_daily_streams || 0) / 1000 * vendor.cost_per_1k_streams;
    return sum + dailyCost;
  }, 0);

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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors or playlists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
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
          {selectedPlaylistsList.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Daily Streams</div>
                    <div className="text-xl font-bold">{totalDailyStreams.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Estimated Daily Cost</div>
                    <div className="text-xl font-bold">${totalCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Unique Vendors</div>
                    <div className="text-xl font-bold">
                      {new Set(selectedPlaylistsList.map(p => p?.vendor_id)).size}
                    </div>
                  </div>
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
                        
                        return (
                          <div
                            key={playlist.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              isSelected 
                                ? 'bg-primary/5 border-primary/30' 
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleTogglePlaylist(playlist.id)}
                            />
                            <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-4">
                                <div className="font-medium">{playlist.name}</div>
                                {playlist.genres && playlist.genres.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {playlist.genres.slice(0, 2).join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-2 text-center">
                                <div className="text-sm font-medium flex items-center justify-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {playlist.avg_daily_streams?.toLocaleString() || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">daily</div>
                              </div>
                              <div className="col-span-2 text-center">
                                <div className="text-sm font-medium flex items-center justify-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {playlist.follower_count?.toLocaleString() || 'N/A'}
                                </div>
                                <div className="text-xs text-muted-foreground">followers</div>
                              </div>
                              <div className="col-span-2 text-center">
                                <div className="text-sm font-medium flex items-center justify-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {playlist.vendor?.cost_per_1k_streams ? `$${playlist.vendor.cost_per_1k_streams}` : 'N/A'}
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
          onClick={() => onNext({ playlistIds: Array.from(selectedPlaylists) })}
          disabled={selectedPlaylists.size === 0}
        >
          Continue with {selectedPlaylists.size} playlist{selectedPlaylists.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}


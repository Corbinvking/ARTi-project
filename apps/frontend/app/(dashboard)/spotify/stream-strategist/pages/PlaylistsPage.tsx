"use client"

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { supabase } from "../integrations/supabase/client";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { 
  Plus, 
  Search, 
  Filter,
  ExternalLink,
  Music,
  Users,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Upload,
  Download,
  Info,
  Database,
  Activity,
  BarChart3
} from "lucide-react";
import Papa from "papaparse";
import { Vendor, Playlist } from "../types";
import { UNIFIED_GENRES } from "../lib/constants";
import { useToast } from "../hooks/use-toast";
import AddVendorModal from "../components/AddVendorModal";
import AddPlaylistModal from "../components/AddPlaylistModal";
import EditVendorModal from "../components/EditVendorModal";
import AddPerformanceEntryModal from "../components/AddPerformanceEntryModal";
import PerformanceHistoryModal from "../components/PerformanceHistoryModal";
import { PlaylistGenreEditor } from "../components/PlaylistGenreEditor";

interface PlaylistWithVendor extends Playlist {
  vendor: {
    id: string;
    name: string;
    cost_per_1k_streams?: number;
    is_active?: boolean;
  };
}

export default function PlaylistsPage() {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'vendors' | 'table'>('vendors');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showInactive, setShowInactive] = useState(false);

  // Initialize filter from URL parameters
  useEffect(() => {
    const genreParam = searchParams?.get('genre');
    if (genreParam) {
      setSelectedGenres([genreParam]);
      setViewMode('table'); // Switch to table view for better filtering experience
    }
  }, [searchParams]);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  
  // Performance entry modals
  const [addPerformanceModalOpen, setAddPerformanceModalOpen] = useState(false);
  const [performanceHistoryModalOpen, setPerformanceHistoryModalOpen] = useState(false);
  const [selectedPlaylistForPerformance, setSelectedPlaylistForPerformance] = useState<{ id: string; name: string } | null>(null);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  
  // Genre editor modal
  const [genreEditorOpen, setGenreEditorOpen] = useState(false);
  const [editingPlaylistGenres, setEditingPlaylistGenres] = useState<{ id: string; name: string; url?: string; spotify_id?: string; genres?: string[] } | null>(null);
  const vendorFileInputRef = useRef<HTMLInputElement>(null);
  const playlistFileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      toast({
        title: "Playlist Deleted",
        description: "Playlist has been successfully removed.",
      });
    }
  });

  // Bulk delete playlists mutation
  const bulkDeletePlaylistsMutation = useMutation({
    mutationFn: async (playlistIds: string[]) => {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .in('id', playlistIds);

      if (error) throw error;
    },
    onSuccess: (_, playlistIds) => {
      queryClient.invalidateQueries({ queryKey: ['all-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      setSelectedPlaylists(new Set());
      toast({
        title: "Playlists Deleted",
        description: `${playlistIds.length} playlists have been successfully removed.`,
      });
    }
  });

  // Enrich playlist genres mutation
  const enrichPlaylistGenresMutation = useMutation({
    mutationFn: async (playlistIds: string[]) => {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';
      const response = await fetch(`${API_BASE_URL}/api/spotify-web-api/enrich-playlist-genres`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlist_ids: playlistIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enrich playlist genres');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      toast({
        title: "Genre Enrichment Complete",
        description: `Successfully enriched ${data.success_count} playlists. Failed: ${data.failed_count}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      // First delete all playlists associated with this vendor
      const { error: playlistError } = await supabase
        .from('playlists')
        .delete()
        .eq('vendor_id', vendorId);
      
      if (playlistError) throw playlistError;

      // Then delete the vendor
      const { error: vendorError } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);

      if (vendorError) throw vendorError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['all-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-playlists'] });
      toast({
        title: "Vendor Deleted",
        description: "Vendor and all associated playlists have been successfully removed.",
      });
    }
  });

  // Fetch vendors
  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async (): Promise<Vendor[]> => {
      console.log('🔍 Fetching vendors...');
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching vendors:', error);
        throw error;
      }
      console.log('✅ Vendors fetched:', data?.length, data);
      return data || [];
    }
  });

  // Fetch all playlists with vendor data for table view
  const { data: allPlaylists, isLoading: allPlaylistsLoading } = useQuery({
    queryKey: ['all-playlists'],
    queryFn: async (): Promise<PlaylistWithVendor[]> => {
      // Get all playlists
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .order('avg_daily_streams', { ascending: false });
      
      if (playlistError) {
        console.error('❌ Error fetching playlists:', playlistError);
        throw playlistError;
      }
      
      console.log('📊 Total playlists fetched:', playlistData?.length);
      console.log('📊 Sample playlist:', playlistData?.[0]);
      console.log('📊 Genres sample:', playlistData?.[0]?.genres);
      console.log('📊 Follower count sample:', playlistData?.[0]?.follower_count);
      
      // For each playlist, try to find its vendor
      const playlistsWithVendor: PlaylistWithVendor[] = await Promise.all(
        (playlistData || []).map(async (playlist) => {
          // If playlist has vendor_id, fetch vendor data
          if (playlist.vendor_id) {
            const { data: vendorData } = await supabase
              .from('vendors')
              .select('id, name, cost_per_1k_streams, is_active')
              .eq('id', playlist.vendor_id)
              .single();
            
            return {
              ...playlist,
              vendor: vendorData || { id: '', name: 'Unknown', cost_per_1k_streams: 0, is_active: false }
            };
          } else {
            // Try to find vendor from campaign_playlists
            const { data: campaignPlaylist } = await supabase
              .from('campaign_playlists')
              .select('vendor_id, vendors(id, name, cost_per_1k_streams, is_active)')
              .eq('playlist_spotify_id', playlist.spotify_id)
              .limit(1)
              .single();
            
            if (campaignPlaylist?.vendors) {
              return {
                ...playlist,
                vendor: campaignPlaylist.vendors as any
              };
            }
            
            // No vendor found - return with empty vendor
            return {
              ...playlist,
              vendor: { id: '', name: 'No Vendor', cost_per_1k_streams: 0, is_active: false }
            };
          }
        })
      );
      
      console.log('✅ Processed playlists with vendors:', playlistsWithVendor.length);
      
      return playlistsWithVendor;
    }
  });

  // Fetch playlists for selected vendor (vendor cards view)
  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: ['vendor-playlists', selectedVendor],
    queryFn: async (): Promise<Playlist[]> => {
      if (!selectedVendor) return [];
      
      // STEP 1: Get authoritative playlist list from vendor_playlists (CSV import cache)
      const { data: vendorPlaylistsCache, error: cacheError } = await supabase
        .from('vendor_playlists')
        .select('*')
        .eq('vendor_id', selectedVendor);
      
      if (cacheError) {
        console.error('❌ Error fetching vendor_playlists cache:', cacheError);
      }
      
      console.log('📋 Vendor playlists cache:', vendorPlaylistsCache?.length || 0);
      
      // STEP 2: Also get playlists from old playlists table (for enriched data like follower counts)
      const { data: directPlaylists, error: directError } = await supabase
        .from('playlists')
        .select('*')
        .eq('vendor_id', selectedVendor)
        .order('avg_daily_streams', { ascending: false });
      
      if (directError) {
        console.error('❌ Error fetching direct playlists:', directError);
      }
      
      // STEP 3: Get playlists from campaign_playlists table (vendor assignments)
      const { data: campaignPlaylists, error: campaignError } = await supabase
        .from('campaign_playlists')
        .select('playlist_spotify_id')
        .eq('vendor_id', selectedVendor);
      
      if (campaignError) {
        console.error('❌ Error fetching campaign playlists:', campaignError);
      }
      
      console.log('🔍 Found', directPlaylists?.length || 0, 'direct playlists');
      console.log('🔍 Found', campaignPlaylists?.length || 0, 'campaign playlist links');
      
      // Get unique spotify_ids from campaign_playlists
      const spotifyIds = [...new Set(
        (campaignPlaylists || [])
          .map((cp: any) => cp.playlist_spotify_id)
          .filter(Boolean)
      )];
      
      console.log('🎯 Unique spotify IDs:', spotifyIds.length);
      
      // Fetch full playlist data for those spotify_ids
      let enrichedPlaylists: any[] = [];
      if (spotifyIds.length > 0) {
        const { data: enrichedData, error: enrichedError } = await supabase
          .from('playlists')
          .select('*')
          .in('spotify_id', spotifyIds);
        
        if (enrichedError) {
          console.error('❌ Error fetching enriched playlists:', enrichedError);
        } else {
          enrichedPlaylists = enrichedData || [];
          console.log('✅ Fetched', enrichedPlaylists.length, 'enriched playlists');
        }
      }
      
      // STEP 4: Create a map of vendor_playlists by normalized name for genre lookup
      const genreMap = new Map<string, string[]>();
      (vendorPlaylistsCache || []).forEach((vp: any) => {
        if (vp.genres && vp.genres.length > 0) {
          genreMap.set(vp.playlist_name_normalized, vp.genres);
        }
      });
      
      // STEP 5: Combine playlists from playlists table and enrich with genres from vendor_playlists
      const allFromDb = [...(directPlaylists || []), ...enrichedPlaylists];
      const uniquePlaylistsMap = new Map();
      
      allFromDb.forEach(p => {
        if (!uniquePlaylistsMap.has(p.id)) {
          // Try to get genres from vendor_playlists cache if missing
          let genres = p.genres;
          if ((!genres || genres.length === 0) && p.name) {
            const normalizedName = p.name.toLowerCase().trim();
            const cachedGenres = genreMap.get(normalizedName);
            if (cachedGenres) {
              genres = cachedGenres;
            }
          }
          uniquePlaylistsMap.set(p.id, { ...p, genres });
        }
      });
      
      // STEP 6: Also add vendor_playlists that aren't in the playlists table yet
      (vendorPlaylistsCache || []).forEach((vp: any) => {
        // Check if we already have this playlist by name match
        const alreadyExists = Array.from(uniquePlaylistsMap.values()).some(
          (p: any) => p.name?.toLowerCase().trim() === vp.playlist_name_normalized
        );
        
        if (!alreadyExists) {
          // Add as a "virtual" playlist from vendor_playlists cache
          uniquePlaylistsMap.set(`vp-${vp.id}`, {
            id: vp.id,
            name: vp.playlist_name,
            genres: vp.genres,
            spotify_id: vp.spotify_id,
            spotify_url: vp.spotify_url,
            vendor_id: vp.vendor_id,
            follower_count: null,
            avg_daily_streams: null,
            source: 'vendor_playlists'
          });
        }
      });
      
      const result = Array.from(uniquePlaylistsMap.values())
        .sort((a, b) => (b.avg_daily_streams || 0) - (a.avg_daily_streams || 0));
      
      console.log('🎵 Total unique playlists for vendor:', result.length);
      console.log('🎵 Playlists with genres:', result.filter(p => p.genres && p.genres.length > 0).length);
      
      return result;
    },
    enabled: !!selectedVendor
  });

  // Filter data based on current view
  const filteredVendors = vendors?.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActiveFilter = (showInactive || vendor.is_active !== false);
    return matchesSearch && matchesActiveFilter;
  }) || [];

  // Debug logging
  useEffect(() => {
    console.log('🔍 Vendors:', vendors?.length);
    console.log('🔍 Filtered vendors:', filteredVendors.length);
    console.log('🔍 Show inactive:', showInactive);
    console.log('🔍 Search term:', searchTerm);
  }, [vendors, filteredVendors, showInactive, searchTerm]);

  // Debug logging for playlists
  useEffect(() => {
    if (allPlaylists && allPlaylists.length > 0) {
      console.log('🎵 All playlists loaded:', allPlaylists.length);
      console.log('🎵 First playlist:', allPlaylists[0]);
      console.log('🎵 Genres type:', typeof allPlaylists[0]?.genres);
      console.log('🎵 Genres value:', allPlaylists[0]?.genres);
      console.log('🎵 Genres is array:', Array.isArray(allPlaylists[0]?.genres));
      console.log('🎵 Follower count:', allPlaylists[0]?.follower_count);
    }
  }, [allPlaylists]);

  const filteredPlaylists = viewMode === 'table' 
    ? allPlaylists?.filter(playlist => {
        const matchesSearch = playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             playlist.vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGenres = selectedGenres.length === 0 || 
          selectedGenres.some(genre => playlist.genres?.includes(genre));
        const matchesActiveFilter = showInactive || playlist.vendor?.is_active !== false;
        return matchesSearch && matchesGenres && matchesActiveFilter;
      }) || []
    : playlists?.filter(playlist => {
        const matchesSearch = playlist.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGenres = selectedGenres.length === 0 || 
          selectedGenres.some(genre => playlist.genres?.includes(genre));
        return matchesSearch && matchesGenres;
      }) || [];

  // For table view mass select functionality
  const filteredAllPlaylists = allPlaylists?.filter(playlist => {
    const matchesSearch = playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playlist.vendor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenres = selectedGenres.length === 0 || 
      selectedGenres.some(genre => playlist.genres?.includes(genre));
    const matchesActiveFilter = showInactive || playlist.vendor?.is_active !== false;
    return matchesSearch && matchesGenres && matchesActiveFilter;
  }) || [];

  const selectedVendorData = vendors?.find(v => v.id === selectedVendor);

  // Calculate vendor max daily streams
  const calculateVendorMaxStreams = (vendorId: string) => {
    if (!playlists || selectedVendor !== vendorId) return 0;
    return playlists.reduce((sum, p) => sum + (p.avg_daily_streams || 0), 0);
  };

  // Enhanced CSV export with all data points
  const handleExportCSV = async () => {
    console.log('Export CSV clicked');
    
    try {
      const exportData = [];
      
      if (viewMode === 'table' && allPlaylists) {
        // Export all playlists with vendor data
        allPlaylists.forEach(playlist => {
          exportData.push({
            vendor_name: playlist.vendor?.name || '',
            vendor_cost_per_1k: playlist.vendor?.cost_per_1k_streams || 0,
            vendor_status: playlist.vendor?.is_active ? 'Active' : 'Inactive',
            playlist_name: playlist.name,
            playlist_url: playlist.url,
            genres: playlist.genres?.join(';') || '',
            followers: playlist.follower_count || 0,
            avg_daily_streams: playlist.avg_daily_streams || 0,
            last_updated: playlist.updated_at
          });
        });
      } else if (selectedVendorData && playlists) {
        // Export selected vendor's playlists
        playlists.forEach(playlist => {
          exportData.push({
            vendor_name: selectedVendorData.name,
            vendor_cost_per_1k: selectedVendorData.cost_per_1k_streams || 0,
            vendor_status: selectedVendorData.is_active ? 'Active' : 'Inactive',
            playlist_name: playlist.name,
            playlist_url: playlist.url,
            genres: playlist.genres?.join(';') || '',
            followers: playlist.follower_count || 0,
            avg_daily_streams: playlist.avg_daily_streams || 0,
            last_updated: playlist.updated_at
          });
        });
      }
      
      if (exportData.length === 0) {
        toast({
          title: "No Data",
          description: "No playlists to export",
          variant: "destructive"
        });
        return;
      }
      
      const csv = Papa.unparse(exportData);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      element.setAttribute('download', `playlists_export_${new Date().toISOString().split('T')[0]}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast({
        title: "Success",
        description: `Exported ${exportData.length} playlists to CSV`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive"
      });
    }
  };

  // Helper function to extract playlist ID from Spotify URL
  const extractPlaylistId = (url: string) => {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  // Enhanced CSV Import functionality with Spotify API fetching
  const handleVendorPlaylistImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          let importCount = 0;
          let fetchedCount = 0;
          const totalRows = results.data.length;
          
          toast({
            title: "Import Started",
            description: `Processing ${totalRows} playlists with Spotify API fetching...`,
          });

          for (const [index, row] of (results.data as any[]).entries()) {
            // Handle different possible column name variations
            const vendorName = row.vendor_name || row.vendor || row.Vendor || row['Vendor Name'] || row['vendor name'];
            const playlistUrl = row.playlist_url || row.url || row.URL || row['Playlist URL'] || row['playlist url'] || row.link;
            const costPer1k = row.cost_per_1k_streams || row['cost per 1k streams'] || row['Cost per 1k streams'] || row.cost || row.Cost;
            
            if (!vendorName || !playlistUrl) {
              console.log(`Skipping row ${index + 1}: Missing vendor name (${vendorName}) or playlist URL (${playlistUrl})`);
              console.log('Available columns:', Object.keys(row));
              continue;
            }
            
            // Progress notification every 5 items
            if (index % 5 === 0) {
              toast({
                title: "Processing...",
                description: `Processed ${index}/${totalRows} playlists`,
              });
            }
            
            // Find or create vendor
            let { data: vendor } = await supabase
              .from('vendors')
              .select('*')
              .eq('name', vendorName.trim())
              .single();
            
            if (!vendor) {
              const { data: newVendor } = await supabase
                .from('vendors')
                .insert({
                  name: vendorName.trim(),
                  cost_per_1k_streams: parseFloat(costPer1k) || 0
                })
                .select()
                .single();
              vendor = newVendor;
            }
            
            if (vendor) {
              let playlistData = {
                name: row.playlist_name || 'Unknown Playlist',
                followers: parseInt(row.followers) || 0,
                genres: row.genres ? row.genres.split(';').map((g: string) => g.trim()) : [],
                avg_daily_streams: parseInt(row.avg_daily_streams) || 0
              };

              // Try to fetch data from Spotify API if it's a valid Spotify URL
              const playlistId = extractPlaylistId(playlistUrl);
              if (playlistId) {
                try {
                  console.log(`Fetching Spotify data for playlist: ${playlistId}`);
                  
                  const { data: spotifyData, error } = await supabase.functions.invoke('spotify-playlist-fetch', {
                    body: { playlistId }
                  });

                  if (!error && spotifyData) {
                    // Use Spotify data if available, otherwise fall back to CSV data
                    playlistData = {
                      name: spotifyData.name || playlistData.name,
                      followers: spotifyData.followers || playlistData.followers,
                      genres: spotifyData.genres?.length > 0 ? spotifyData.genres : playlistData.genres,
                      avg_daily_streams: playlistData.avg_daily_streams // Keep CSV value for streams
                    };
                    
                    fetchedCount++;
                    console.log(`Successfully fetched Spotify data for: ${playlistData.name}`);
                  } else {
                    console.log(`Failed to fetch Spotify data for ${playlistId}, using CSV data:`, error);
                  }
                } catch (apiError) {
                  console.warn(`Spotify API call failed for ${playlistId}:`, apiError);
                  // Continue with CSV data
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
              }

              // Check for existing playlist with same URL to avoid duplicates
              const { data: existingPlaylist } = await supabase
                .from('playlists')
                .select('id')
                .eq('url', playlistUrl)
                .single();

              if (existingPlaylist) {
                console.log(`Duplicate playlist found for URL: ${playlistUrl}, skipping...`);
                continue;
              }

              // Create playlist with fetched or CSV data
              const { error: insertError } = await supabase.from('playlists').insert({
                vendor_id: vendor.id,
                name: playlistData.name,
                url: playlistUrl,
                genres: playlistData.genres,
                avg_daily_streams: playlistData.avg_daily_streams,
                follower_count: playlistData.followers
              });

              if (!insertError) {
                importCount++;
              } else {
                console.error(`Failed to insert playlist: ${playlistData.name}`, insertError);
              }
            }
          }
          
          queryClient.invalidateQueries({ queryKey: ["vendors"] });
          queryClient.invalidateQueries({ queryKey: ["all-playlists"] });
          queryClient.invalidateQueries({ queryKey: ["vendor-playlists"] });
          
          toast({
            title: "Import Complete!",
            description: `Imported ${importCount} playlists. ${fetchedCount} playlists auto-populated from Spotify.`,
          });
          
        } catch (error) {
          console.error('Import error:', error);
          toast({
            title: "Error",
            description: "Failed to import data. Check console for details.",
            variant: "destructive",
          });
        }
      },
    });
    
    event.target.value = '';
  };

  const handleEditPlaylist = (playlist: PlaylistWithVendor | Playlist) => {
    const playlistData = 'vendor' in playlist ? playlist : playlist;
    setEditingPlaylist(playlistData as Playlist);
    setShowAddPlaylistModal(true);
  };

  const handleSelectPlaylist = (playlistId: string, checked: boolean) => {
    setSelectedPlaylists(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(playlistId);
      } else {
        newSet.delete(playlistId);
      }
      return newSet;
    });
  };

  const handleSelectAllPlaylists = (checked: boolean) => {
    if (checked) {
      setSelectedPlaylists(new Set(filteredAllPlaylists.map(p => p.id)));
    } else {
      setSelectedPlaylists(new Set());
    }
  };

  const handleBulkDeletePlaylists = () => {
    if (selectedPlaylists.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedPlaylists.size} playlists? This action cannot be undone.`)) {
      bulkDeletePlaylistsMutation.mutate(Array.from(selectedPlaylists));
    }
  };

  const handleDeletePlaylist = (id: string) => {
    if (confirm("Are you sure you want to delete this playlist? This action cannot be undone.")) {
      deletePlaylistMutation.mutate(id);
    }
  };

  const handleDeleteVendor = (vendorId: string, vendorName: string, playlistCount: number) => {
    const message = playlistCount > 0 
      ? `Are you sure you want to delete "${vendorName}" and all ${playlistCount} associated playlists? This action cannot be undone.`
      : `Are you sure you want to delete "${vendorName}"? This action cannot be undone.`;
    
    if (confirm(message)) {
      deleteVendorMutation.mutate(vendorId);
    }
  };

  const toggleGenreFilter = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  if (selectedVendor && selectedVendorData && viewMode === 'vendors') {
    // Single vendor detail view
    return (
      <Layout>
        <div className="p-8 space-y-6">
          {/* Vendor Detail Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedVendor(null)}
                className="px-3"
              >
                ← Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
                  {selectedVendorData.name}
                </h1>
                <p className="text-muted-foreground">
                  {playlists?.length || 0} playlists • Max {calculateVendorMaxStreams(selectedVendor).toLocaleString()} daily streams
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setEditingPlaylist(null);
                  setShowAddPlaylistModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Playlist
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleExportCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      onClick={() => playlistFileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                      <Info className="w-3 h-3 ml-2" />
                    </Button>
                  </TooltipTrigger>
                   <TooltipContent>
                    <div className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">CSV Format (Spotify Auto-Fetch):</p>
                      <pre className="text-xs">vendor_name,cost_per_1k_streams,playlist_name,playlist_url,genres,followers,avg_daily_streams{'\n'}"Electronic Vibes",0.05,"My Playlist","https://open.spotify.com/playlist/...","electronic;dance",50000,5000</pre>
                      <p className="text-yellow-400 mt-2 font-semibold">✨ Auto-fetches from Spotify:</p>
                      <p className="text-yellow-300">• Playlist name, followers & genres</p>
                      <p className="text-gray-400">• Falls back to CSV data if API fails</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <input
                ref={playlistFileInputRef}
                type="file"
                accept=".csv"
                onChange={handleVendorPlaylistImport}
                className="hidden"
              />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="default"
                      onClick={() => {
                        if (playlists && playlists.length > 0) {
                          const spotifyIds = playlists
                            .map(p => p.spotify_id)
                            .filter(Boolean);
                          
                          if (spotifyIds.length === 0) {
                            toast({
                              title: "No Valid Playlists",
                              description: "No playlists found with Spotify IDs to enrich.",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          enrichPlaylistGenresMutation.mutate(spotifyIds);
                        }
                      }}
                      disabled={enrichPlaylistGenresMutation.isPending}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Music className="w-4 h-4 mr-2" />
                      {enrichPlaylistGenresMutation.isPending ? 'Enriching...' : 'Enrich Genres'}
                      <Info className="w-3 h-3 ml-2" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs max-w-xs">
                      <p className="font-semibold mb-1">Fetch Genre Tags from Spotify</p>
                      <p className="text-gray-300">Analyzes playlist tracks and artist genres</p>
                      <p className="text-gray-400 mt-1">• Fetches top 5 genres per playlist</p>
                      <p className="text-gray-400">• Updates database automatically</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search playlists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter by Genre
                  {selectedGenres.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedGenres.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-64 overflow-auto">
                <DropdownMenuLabel>Filter by Genre</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {UNIFIED_GENRES.map(genre => (
                  <DropdownMenuCheckboxItem
                    key={genre}
                    checked={selectedGenres.includes(genre)}
                    onCheckedChange={() => toggleGenreFilter(genre)}
                  >
                    {genre}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Playlists Table */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Music className="w-5 h-5" />
                <span>Playlists</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {playlistsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Playlist Name</TableHead>
                      <TableHead>Genres</TableHead>
                      <TableHead>Daily Streams</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Cost/1k</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlaylists.map((playlist) => (
                      <TableRow key={playlist.id} className="hover:bg-accent/20">
                        <TableCell className="font-medium">
                          {playlist.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 items-center group">
                            {(playlist.genres && Array.isArray(playlist.genres) && playlist.genres.length > 0) ? (
                              <>
                                {playlist.genres.slice(0, 3).map((genre) => (
                                  <Badge key={genre} variant="secondary" className="text-xs">
                                    {genre}
                                  </Badge>
                                ))}
                                {playlist.genres.length > 3 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline" className="text-xs cursor-help">
                                          +{playlist.genres.length - 3}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="flex flex-wrap gap-1">
                                          {playlist.genres.slice(3).map((genre) => (
                                            <Badge key={genre} variant="secondary" className="text-xs">
                                              {genre}
                                            </Badge>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">No genres</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                              onClick={() => {
                                setEditingPlaylistGenres({
                                  id: playlist.id,
                                  name: playlist.name,
                                  url: playlist.url,
                                  spotify_id: (playlist as any).spotify_id,
                                  genres: playlist.genres
                                });
                                setGenreEditorOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {playlist.avg_daily_streams?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {playlist.follower_count?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          ${selectedVendorData?.cost_per_1k_streams?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          <a 
                            href={playlist.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center space-x-1"
                          >
                            <span className="truncate max-w-[100px]">Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPlaylistForPerformance({ id: playlist.id, name: playlist.name });
                                      setAddPerformanceModalOpen(true);
                                    }}
                                  >
                                    <Activity className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Stream Data</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPlaylistForPerformance({ id: playlist.id, name: playlist.name });
                                      setPerformanceHistoryModalOpen(true);
                                    }}
                                  >
                                    <BarChart3 className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Performance History</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditPlaylist(playlist)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeletePlaylist(playlist.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <AddVendorModal 
          open={showAddVendorModal} 
          onOpenChange={setShowAddVendorModal} 
        />
        <AddPlaylistModal 
          open={showAddPlaylistModal} 
          onOpenChange={(open) => {
            setShowAddPlaylistModal(open);
            if (!open) setEditingPlaylist(null);
          }}
          vendorId={selectedVendor}
          editingPlaylist={editingPlaylist}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">VENDORS & PLAYLISTS</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedVendor(null);
                setEditingPlaylist(null);
                setShowAddPlaylistModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Playlist
            </Button>
            <Button onClick={() => vendorFileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setShowAddVendorModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </div>
        </div>
        
        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={viewMode === 'vendors' ? 'default' : 'outline'}
            onClick={() => setViewMode('vendors')}
          >
            <Database className="w-4 h-4 mr-2" />
            Vendor Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
          >
            <Music className="w-4 h-4 mr-2" />
            All Playlists Table
          </Button>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'vendors' ? (
          <>
            {/* Search */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="showInactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="showInactive">Show Inactive</Label>
              </div>
            </div>

            {/* Vendor Cards Grid */}
            {vendorsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {vendors?.length === 0 
                    ? 'No vendors found. Click "Add Vendor" to create one.' 
                    : 'No vendors match your search criteria.'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Total vendors: {vendors?.length || 0} | Filtered: {filteredVendors.length}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                  <Card key={vendor.id} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold">{vendor.name}</span>
                          {vendor.is_active === false && (
                            <Badge variant="destructive" className="text-xs">INACTIVE</Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedVendor(vendor.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Cost per 1k streams: ${vendor.cost_per_1k_streams?.toFixed(2) || '0.00'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Max Daily Streams</span>
                          <span className="font-mono">{vendor.max_daily_streams?.toLocaleString() || '0'}</span>
                        </div>
                         <div className="flex gap-2">
                           <Button 
                             className="flex-1" 
                             variant="outline"
                             onClick={() => setSelectedVendor(vendor.id)}
                           >
                             <Eye className="w-4 h-4 mr-2" />
                             View Playlists
                           </Button>
                           <Button 
                             variant="outline"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               setEditingVendor(vendor);
                               setShowEditVendorModal(true);
                             }}
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button 
                             variant="outline"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               const playlistCount = allPlaylists?.filter(p => p.vendor.id === vendor.id).length || 0;
                               handleDeleteVendor(vendor.id, vendor.name, playlistCount);
                             }}
                             className="text-destructive hover:text-destructive"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
              {/* Search and Filter for Table View */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search playlists or vendors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showInactiveTable"
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                  />
                  <Label htmlFor="showInactiveTable">Show Inactive</Label>
                </div>
                
                {selectedPlaylists.size > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={handleBulkDeletePlaylists}
                    disabled={bulkDeletePlaylistsMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedPlaylists.size})
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter by Genre
                      {selectedGenres.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedGenres.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 max-h-64 overflow-auto">
                    <DropdownMenuLabel>Filter by Genre</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {UNIFIED_GENRES.map(genre => (
                      <DropdownMenuCheckboxItem
                        key={genre}
                        checked={selectedGenres.includes(genre)}
                        onCheckedChange={() => toggleGenreFilter(genre)}
                      >
                        {genre}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="default"
                        onClick={() => {
                          if (allPlaylists && allPlaylists.length > 0) {
                            const spotifyIds = allPlaylists
                              .map(p => p.spotify_id)
                              .filter(Boolean);
                            
                            if (spotifyIds.length === 0) {
                              toast({
                                title: "No Valid Playlists",
                                description: "No playlists found with Spotify IDs to enrich.",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            enrichPlaylistGenresMutation.mutate(spotifyIds);
                          }
                        }}
                        disabled={enrichPlaylistGenresMutation.isPending}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <Music className="w-4 h-4 mr-2" />
                        {enrichPlaylistGenresMutation.isPending ? 'Enriching...' : 'Enrich Genres'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs max-w-xs">
                        <p className="font-semibold mb-1">Fetch Genre Tags from Spotify</p>
                        <p className="text-gray-300">Analyzes playlist tracks and artist genres</p>
                        <p className="text-gray-400 mt-1">• Fetches top 5 genres per playlist</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

            {/* All Playlists Table */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Music className="w-5 h-5" />
                  <span>All Playlists</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allPlaylistsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedPlaylists.size === filteredAllPlaylists.length && filteredAllPlaylists.length > 0}
                            onChange={(e) => handleSelectAllPlaylists(e.target.checked)}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>Playlist</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Genres</TableHead>
                        <TableHead>Followers</TableHead>
                        <TableHead>Avg Daily Streams</TableHead>
                        <TableHead>Cost/1k</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAllPlaylists.map((playlist) => (
                        <TableRow key={playlist.id} className="hover:bg-accent/20">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedPlaylists.has(playlist.id)}
                              onChange={(e) => handleSelectPlaylist(playlist.id, e.target.checked)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold">{playlist.name}</p>
                              <a 
                                href={playlist.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center space-x-1 text-xs"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{playlist.vendor?.name}</span>
                              {playlist.vendor?.is_active === false && (
                                <Badge variant="destructive" className="text-xs">INACTIVE</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 items-center group">
                              {(playlist.genres && Array.isArray(playlist.genres) && playlist.genres.length > 0) ? (
                                <>
                                  {playlist.genres.slice(0, 2).map((genre) => (
                                    <Badge key={genre} variant="secondary" className="text-xs">
                                      {genre}
                                    </Badge>
                                  ))}
                                  {playlist.genres.length > 2 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant="outline" className="text-xs cursor-help">
                                            +{playlist.genres.length - 2}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="flex flex-wrap gap-1">
                                            {playlist.genres.slice(2).map((genre) => (
                                              <Badge key={genre} variant="secondary" className="text-xs">
                                                {genre}
                                              </Badge>
                                            ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">No genres</span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                onClick={() => {
                                  setEditingPlaylistGenres({
                                    id: playlist.id,
                                    name: playlist.name,
                                    url: playlist.url,
                                    spotify_id: (playlist as any).spotify_id,
                                    genres: playlist.genres
                                  });
                                  setGenreEditorOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {playlist.follower_count?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell className="font-mono">
                            {playlist.avg_daily_streams?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            ${playlist.vendor?.cost_per_1k_streams?.toFixed(2) || '0.00'}
                          </TableCell>
                           <TableCell>
                             <div className="flex items-center space-x-1">
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => {
                                         setSelectedPlaylistForPerformance({ id: playlist.id, name: playlist.name });
                                         setAddPerformanceModalOpen(true);
                                       }}
                                     >
                                       <Activity className="w-3 h-3" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>Add Stream Data</TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>
                               
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => {
                                         setSelectedPlaylistForPerformance({ id: playlist.id, name: playlist.name });
                                         setPerformanceHistoryModalOpen(true);
                                       }}
                                     >
                                       <BarChart3 className="w-3 h-3" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>Performance History</TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>
                               
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 onClick={() => handleEditPlaylist(playlist)}
                               >
                                 <Edit className="w-3 h-3" />
                               </Button>
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 onClick={() => handleDeletePlaylist(playlist.id)}
                                 className="text-destructive hover:text-destructive"
                               >
                                 <Trash2 className="w-3 h-3" />
                               </Button>
                             </div>
                           </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                
                {!allPlaylistsLoading && filteredAllPlaylists.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No playlists found. Try adjusting your search or filters.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Hidden file inputs */}
        <input
          ref={vendorFileInputRef}
          type="file"
          accept=".csv"
          onChange={handleVendorPlaylistImport}
          className="hidden"
        />

        {/* Modals */}
        <AddVendorModal
          open={showAddVendorModal}
          onOpenChange={setShowAddVendorModal}
        />
        
        <EditVendorModal
          open={showEditVendorModal}
          onOpenChange={setShowEditVendorModal}
          vendor={editingVendor}
        />
        <AddPlaylistModal 
          open={showAddPlaylistModal} 
          onOpenChange={(open) => {
            setShowAddPlaylistModal(open);
            if (!open) setEditingPlaylist(null);
          }}
          vendorId={selectedVendor}
          editingPlaylist={editingPlaylist}
        />
        
        {selectedPlaylistForPerformance && (
          <>
            <AddPerformanceEntryModal
              open={addPerformanceModalOpen}
              onOpenChange={setAddPerformanceModalOpen}
              playlistId={selectedPlaylistForPerformance.id}
              playlistName={selectedPlaylistForPerformance.name}
            />
            
            <PerformanceHistoryModal
              open={performanceHistoryModalOpen}
              onOpenChange={setPerformanceHistoryModalOpen}
              playlistId={selectedPlaylistForPerformance.id}
              playlistName={selectedPlaylistForPerformance.name}
            />
          </>
        )}
        
        {/* Genre Editor Modal */}
        <PlaylistGenreEditor
          playlist={editingPlaylistGenres}
          isOpen={genreEditorOpen}
          onClose={() => {
            setGenreEditorOpen(false);
            setEditingPlaylistGenres(null);
          }}
        />
      </div>
    </Layout>
  );
}









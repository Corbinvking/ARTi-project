"use client"

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Target,
  TrendingUp,
  Users,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Vendor, Playlist } from "../types";
import { allocateStreams, calculateProjections, GenreMatch, validateAllocations, VendorAllocation } from "../lib/allocationAlgorithm";
import { useVendorCampaignCounts } from "../hooks/useVendorCampaignCounts";

interface AIRecommendationsProps {
  campaignData: {
    name: string;
    client: string;
    client_id?: string;
    track_url: string;
    track_name?: string;
    stream_goal: number;
    budget: number;
    sub_genre: string;
    start_date: string;
    duration_days: number;
  };
  onNext: (allocations: any) => void;
  onBack: () => void;
}

export default function AIRecommendations({ campaignData, onNext, onBack }: AIRecommendationsProps) {
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [allocations, setAllocations] = useState<any[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);
  const [genreMatches, setGenreMatches] = useState<GenreMatch[]>([]);
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});
  const [vendorAllocations, setVendorAllocations] = useState<VendorAllocation[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());

  // Fetch vendors and playlists (only active vendors for AI recommendations)
  const { data: vendors } = useQuery({
    queryKey: ['vendors', 'active'],
    queryFn: async (): Promise<Vendor[]> => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch vendor campaign counts for capacity validation
  const { data: vendorCampaignCounts } = useVendorCampaignCounts();

  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: ['playlists-for-campaign', 'active-vendors'],
    queryFn: async (): Promise<Playlist[]> => {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          vendor:vendors!inner(id, name, is_active)
        `)
        .eq('vendor.is_active', true)
        .order('avg_daily_streams', { ascending: false });
      
      if (error) throw error;
      
      // Filter playlists by campaign genres for better recommendations
      const campaignGenres = campaignData.sub_genre.split(', ').map(g => g.trim().toLowerCase());
      const filteredPlaylists = (data || []).filter(playlist => {
        return playlist.genres.some(genre => 
          campaignGenres.some(campaignGenre => 
            genre.toLowerCase().includes(campaignGenre) || 
            campaignGenre.includes(genre.toLowerCase())
          )
        );
      });
      
      return filteredPlaylists;
    }
  });

  // Run AI allocation when data is ready
  useEffect(() => {
    if (playlists && vendors && !isAllocating) {
      runAllocation();
    }
  }, [playlists, vendors, campaignData]);

  const runAllocation = async () => {
    if (!playlists || !vendors) return;
    
    setIsAllocating(true);
    
    // Create vendor caps map - treat zero/missing max_daily_streams as unlimited
    const vendorCaps: Record<string, number> = {};
    vendors.forEach(vendor => {
      const dailyCapacity = vendor.max_daily_streams || 0;
      vendorCaps[vendor.id] = dailyCapacity > 0 ? dailyCapacity * campaignData.duration_days : Infinity;
    });

    try {
      // Run allocation algorithm with enhanced parameters
      const result = await allocateStreams({
        playlists,
        goal: campaignData.stream_goal,
        vendorCaps,
        subGenre: campaignData.sub_genre,
        durationDays: campaignData.duration_days,
        vendors: vendors,
        campaignBudget: campaignData.budget,
        campaignGenres: [campaignData.sub_genre]
      });

      setAllocations(result.allocations);
      setGenreMatches(result.genreMatches);
      
      // Auto-select top playlists
      const topPlaylists = result.allocations.slice(0, 15).map(a => a.playlist_id);
      setSelectedPlaylists(new Set(topPlaylists));
      
    } catch (error) {
      console.error('Allocation failed:', error);
    } finally {
      setIsAllocating(false);
    }
  };

  const togglePlaylist = (playlistId: string) => {
    const newSelected = new Set(selectedPlaylists);
    if (newSelected.has(playlistId)) {
      newSelected.delete(playlistId);
    } else {
      newSelected.add(playlistId);
    }
    setSelectedPlaylists(newSelected);
  };

  const updateManualAllocation = (playlistId: string, dailyStreams: number) => {
    // Convert daily streams to campaign total for storage
    const campaignTotal = dailyStreams * campaignData.duration_days;
    setManualAllocations(prev => ({
      ...prev,
      [playlistId]: campaignTotal
    }));
  };

  const toggleVendor = (vendorId: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorId)) {
      newSelected.delete(vendorId);
      // Remove vendor allocation when deselected
      setVendorAllocations(prev => prev.filter(va => va.vendor_id !== vendorId));
    } else {
      newSelected.add(vendorId);
      // Add default vendor allocation
      const vendor = vendors?.find(v => v.id === vendorId);
      if (vendor) {
        const defaultAllocation = Math.min(10000, campaignData.stream_goal * 0.1); // 10% of goal or 10k, whichever is smaller
        setVendorAllocations(prev => [...prev, { vendor_id: vendorId, allocation: defaultAllocation }]);
      }
    }
    setSelectedVendors(newSelected);
  };

  const updateVendorAllocation = (vendorId: string, dailyStreams: number) => {
    const campaignTotal = dailyStreams * campaignData.duration_days;
    setVendorAllocations(prev => 
      prev.map(va => 
        va.vendor_id === vendorId 
          ? { ...va, allocation: campaignTotal }
          : va
      )
    );
  };

  // Create allocations for selected playlists (including manual ones) - memoized for performance
  const selectedAllocations = useMemo(() => {
    return Array.from(selectedPlaylists).map(playlistId => {
      const existingAllocation = allocations.find(a => a.playlist_id === playlistId);
      const playlist = playlists?.find(p => p.id === playlistId);
      const vendor = vendors?.find(v => v.id === playlist?.vendor_id);
      
      // Always use manual allocation if available, otherwise fall back to existing or default
      const campaignTotal = manualAllocations[playlistId] || 
        existingAllocation?.allocation || 
        Math.min(1000 * campaignData.duration_days, (playlist?.avg_daily_streams || 100) * campaignData.duration_days);
      
      return {
        playlist_id: playlistId,
        vendor_id: vendor?.id || '',
        allocation: campaignTotal
      };
    }).filter(a => a.vendor_id); // Filter out invalid allocations
  }, [selectedPlaylists, allocations, playlists, vendors, manualAllocations, campaignData.duration_days]);
  
  // Memoized projections that update when allocations change
  const projections = useMemo(() => {
    return calculateProjections(selectedAllocations, playlists || [], vendorAllocations);
  }, [selectedAllocations, playlists, vendorAllocations]);
  // Memoized validation with campaign capacity checks
  const validation = useMemo(() => {
    const vendorCaps = vendors?.reduce((acc, v) => ({ 
      ...acc, 
      [v.id]: (v.max_daily_streams && v.max_daily_streams > 0) ? v.max_daily_streams * campaignData.duration_days : Infinity 
    }), {}) || {};

    const baseValidation = validateAllocations(
      selectedAllocations, 
      vendorCaps,
      playlists || [],
      campaignData.duration_days,
      vendors || [],
      vendorAllocations
    );

    // Add campaign capacity validation
    const capacityErrors: string[] = [];
    
    if (vendorCampaignCounts) {
      // Check vendor allocations
      vendorAllocations.forEach(va => {
        const counts = vendorCampaignCounts[va.vendor_id];
        if (counts && counts.active_campaigns >= counts.max_concurrent_campaigns) {
          const vendor = vendors?.find(v => v.id === va.vendor_id);
          capacityErrors.push(`${vendor?.name || 'Vendor'} is at capacity (${counts.active_campaigns}/${counts.max_concurrent_campaigns} campaigns)`);
        }
      });

      // Check playlist allocations by vendor
      const vendorsWithPlaylists = new Set(
        selectedAllocations.map(a => a.vendor_id).filter(Boolean)
      );

      vendorsWithPlaylists.forEach(vendorId => {
        const counts = vendorCampaignCounts[vendorId];
        if (counts && counts.active_campaigns >= counts.max_concurrent_campaigns) {
          const vendor = vendors?.find(v => v.id === vendorId);
          capacityErrors.push(`${vendor?.name || 'Vendor'} is at capacity (${counts.active_campaigns}/${counts.max_concurrent_campaigns} campaigns)`);
        }
      });
    }

    return {
      isValid: baseValidation.isValid && capacityErrors.length === 0,
      errors: [...baseValidation.errors, ...capacityErrors]
    };
  }, [selectedAllocations, vendors, playlists, vendorAllocations, campaignData.duration_days, vendorCampaignCounts]);

  const handleContinue = () => {
    const finalAllocations = selectedAllocations.map(allocation => {
      const playlist = playlists?.find(p => p.id === allocation.playlist_id);
      const vendor = vendors?.find(v => v.id === allocation.vendor_id);
      
      return {
        ...allocation,
        allocation: manualAllocations[allocation.playlist_id] || allocation.allocation,
        vendor: vendor ? { id: vendor.id, name: vendor.name } : null,
        playlist: playlist ? { id: playlist.id, name: playlist.name } : null
      };
    });
    
    onNext({
      allocations: finalAllocations,
      vendorAllocations,
      projections,
      selectedPlaylists: Array.from(selectedPlaylists),
      selectedVendors: Array.from(selectedVendors),
      totalProjectedStreams: projections.totalStreams,
      totalCost: projections.totalStreams * 0.001 // Estimated cost per stream
    });
  };

  if (playlistsLoading || isAllocating) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <Card className="bg-gradient-glow border-primary/20">
          <CardContent className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <RefreshCw className="w-12 h-12 text-primary animate-spin" />
              <h2 className="text-xl font-semibold">AI Analyzing Playlists...</h2>
              <p className="text-muted-foreground">
                Finding the perfect matches for "{campaignData.sub_genre}" genre
              </p>
              <Progress value={66} className="w-64" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
          AI Playlist Recommendations
        </h1>
        <p className="text-muted-foreground">
          AI-powered playlist selection based on "{campaignData.sub_genre}" genre matching
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Recommendations Table */}
        <div className="lg:col-span-3 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Playlists</p>
                    <p className="text-lg font-semibold">{genreMatches.length}</p>
                  </div>
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Selected</p>
                    <p className="text-lg font-semibold">{selectedPlaylists.size}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1">
                      <p className="text-sm text-muted-foreground">Total Projected Streams</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total streams over {campaignData.duration_days} days</p>
                            <p className="text-xs">({Math.round(projections.totalStreams / campaignData.duration_days).toLocaleString()} avg/day)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-lg font-semibold">{projections.totalStreams.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Over {campaignData.duration_days} days</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1">
                      <p className="text-sm text-muted-foreground">Goal Coverage</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Projected vs. target streams over campaign duration</p>
                            <p className="text-xs">{projections.totalStreams.toLocaleString()} / {campaignData.stream_goal.toLocaleString()}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-lg font-semibold">
                      {((projections.totalStreams / campaignData.stream_goal) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Controls */}
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search playlists by name or vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={showOnlySelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                  >
                    {showOnlySelected ? "Show All" : "Selected Only"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={runAllocation}
                    disabled={isAllocating}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations Table */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>AI Recommendations</span>
              </CardTitle>
              {allocations.length === 0 && genreMatches.length > 0 && (
                <CardDescription className="flex items-center space-x-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>No automatic allocations made. Playlists may lack performance data. You can still manually select playlists below.</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Vendor/Playlist</TableHead>
                    <TableHead>Genres</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>Match Score</TableHead>
                    <TableHead>
                      <div className="flex items-center space-x-1">
                        <span>Daily Streams</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Average daily streams for this playlist/vendor</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center space-x-1">
                        <span>Campaign Total</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Total streams allocated over {campaignData.duration_days} days</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead>Vendor Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Group playlists by vendor and sort selected to top */}
                  {(() => {
                    // Filter matches based on search term and selection filter
                    let filteredMatches = genreMatches.filter(match => {
                      const matchesSearch = !searchTerm || 
                        match.playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        vendors?.find(v => v.id === match.playlist.vendor_id)?.name.toLowerCase().includes(searchTerm.toLowerCase());
                      
                      const matchesSelection = !showOnlySelected || selectedPlaylists.has(match.playlist.id);
                      
                      return matchesSearch && matchesSelection;
                    });

                    // Group filtered matches by vendor
                    const groupedByVendor = filteredMatches.reduce((groups, match) => {
                      const vendorId = match.playlist.vendor_id;
                      if (!groups[vendorId]) {
                        groups[vendorId] = [];
                      }
                      groups[vendorId].push(match);
                      return groups;
                    }, {} as Record<string, typeof genreMatches>);

                    // Sort each vendor group by selection status
                    Object.keys(groupedByVendor).forEach(vendorId => {
                      groupedByVendor[vendorId].sort((a, b) => {
                        const aSelected = selectedPlaylists.has(a.playlist.id);
                        const bSelected = selectedPlaylists.has(b.playlist.id);
                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;
                        return b.relevanceScore - a.relevanceScore; // Then by relevance
                      });
                    });

                    // Render grouped playlists
                    return Object.entries(groupedByVendor).map(([vendorId, matches]) => {
                      const vendor = vendors?.find(v => v.id === vendorId);
                      const vendorName = vendor?.name || 'Unknown Vendor';
                      const isExpanded = expandedVendors.has(vendorId);
                      const selectedCount = matches.filter(m => selectedPlaylists.has(m.playlist.id)).length;
                      
                      return (
                        <React.Fragment key={vendorId}>
                           {/* Vendor Header Row - Collapsible with vendor allocation controls */}
                          <TableRow 
                            className="bg-muted/50 cursor-pointer hover:bg-muted/70"
                          >
                            <TableCell onClick={() => {
                              const newExpanded = new Set(expandedVendors);
                              if (isExpanded) {
                                newExpanded.delete(vendorId);
                              } else {
                                newExpanded.add(vendorId);
                              }
                              setExpandedVendors(newExpanded);
                            }}>
                              <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                            </TableCell>
                             <TableCell onClick={() => {
                               const newExpanded = new Set(expandedVendors);
                               if (isExpanded) {
                                 newExpanded.delete(vendorId);
                               } else {
                                 newExpanded.add(vendorId);
                               }
                               setExpandedVendors(newExpanded);
                             }} className="font-semibold text-primary">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center space-x-2">
                                   <span>{vendorName}</span>
                                   {vendorCampaignCounts && vendorCampaignCounts[vendorId] && (
                                     <Badge 
                                       variant={
                                         vendorCampaignCounts[vendorId].active_campaigns >= vendorCampaignCounts[vendorId].max_concurrent_campaigns 
                                           ? "destructive" 
                                           : vendorCampaignCounts[vendorId].active_campaigns >= vendorCampaignCounts[vendorId].max_concurrent_campaigns * 0.8
                                             ? "secondary"
                                             : "outline"
                                       }
                                       className="text-xs"
                                     >
                                       {vendorCampaignCounts[vendorId].active_campaigns}/{vendorCampaignCounts[vendorId].max_concurrent_campaigns}
                                     </Badge>
                                   )}
                                 </div>
                                 <span className="text-xs">{matches.length} playlists {selectedCount > 0 && `(${selectedCount} selected)`}</span>
                               </div>
                             </TableCell>
                             <TableCell colSpan={3}>
                               <div className="flex items-center space-x-2">
                                 <Switch
                                   checked={selectedVendors.has(vendorId)}
                                   onCheckedChange={() => toggleVendor(vendorId)}
                                   disabled={
                                     !selectedVendors.has(vendorId) && 
                                     vendorCampaignCounts?.[vendorId]?.active_campaigns >= vendorCampaignCounts?.[vendorId]?.max_concurrent_campaigns
                                   }
                                 />
                                 <Label className="text-xs">
                                   {vendorCampaignCounts?.[vendorId]?.active_campaigns >= vendorCampaignCounts?.[vendorId]?.max_concurrent_campaigns && !selectedVendors.has(vendorId)
                                     ? "At Capacity" 
                                     : "Allocate to Vendor"
                                   }
                                 </Label>
                               </div>
                             </TableCell>
                            <TableCell>
                              {selectedVendors.has(vendorId) && (
                                <Input
                                  type="number"
                                  value={Math.round((vendorAllocations.find(va => va.vendor_id === vendorId)?.allocation || 0) / campaignData.duration_days)}
                                  onChange={(e) => updateVendorAllocation(vendorId, parseInt(e.target.value) || 0)}
                                  className="w-20 h-8 text-xs"
                                  placeholder="Daily"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {selectedVendors.has(vendorId) && (
                                <span className="text-sm font-mono">
                                  {(vendorAllocations.find(va => va.vendor_id === vendorId)?.allocation || 0).toLocaleString()}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              {(() => {
                                // Calculate vendor total: sum of playlist allocations + direct vendor allocation
                                const playlistTotal = matches
                                  .filter(m => selectedPlaylists.has(m.playlist.id))
                                  .reduce((sum, match) => {
                                    const playlistId = match.playlist.id;
                                    const allocation = allocations.find(a => a.playlist_id === playlistId);
                                    const campaignTotal = manualAllocations[playlistId] || 
                                      (allocation?.allocation) || 
                                      Math.min(1000 * campaignData.duration_days, (match.playlist.avg_daily_streams || 100) * campaignData.duration_days);
                                    return sum + campaignTotal;
                                  }, 0);
                                
                                const directVendorTotal = vendorAllocations.find(va => va.vendor_id === vendorId)?.allocation || 0;
                                const vendorTotal = playlistTotal + directVendorTotal;
                                
                                return vendorTotal.toLocaleString();
                              })()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleVendor(vendorId);
                                }}
                              >
                                {selectedVendors.has(vendorId) ? 'Remove' : 'Add Vendor'}
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* Vendor's Playlists - Only show selected if collapsed, all if expanded */}
                          {(isExpanded ? matches : matches.filter(m => selectedPlaylists.has(m.playlist.id))).map((match) => {
                            const playlist = match.playlist;
                            const allocation = allocations.find(a => a.playlist_id === playlist.id);
                            const isSelected = selectedPlaylists.has(playlist.id);
                            
                            return (
                              <TableRow 
                                key={playlist.id} 
                                className={`${isSelected ? 'bg-primary/10 border-primary/30' : ''} hover:bg-accent/20`}
                              >
                         <TableCell>
                           <Switch
                             checked={isSelected}
                             onCheckedChange={() => togglePlaylist(playlist.id)}
                             disabled={
                               !isSelected && 
                               vendorCampaignCounts?.[playlist.vendor_id]?.active_campaigns >= vendorCampaignCounts?.[playlist.vendor_id]?.max_concurrent_campaigns
                             }
                           />
                         </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{playlist.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Vendor: {vendors?.find(v => v.id === playlist.vendor_id)?.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {playlist.genres.slice(0, 2).map((genre) => (
                              <Badge 
                                key={genre} 
                                variant={genre === campaignData.sub_genre ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {genre}
                              </Badge>
                            ))}
                            {playlist.genres.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{playlist.genres.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{(playlist.follower_count || 0).toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={Math.min(match.relevanceScore * 100, 100)} 
                              className="w-16 h-2" 
                            />
                            <span className="text-xs font-mono">
                              {(match.relevanceScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSelected ? (
                            <Input
                              type="number"
                              value={Math.round((manualAllocations[playlist.id] || (allocation?.allocation) || Math.min(1000 * campaignData.duration_days, (playlist.avg_daily_streams || 100) * campaignData.duration_days)) / campaignData.duration_days)}
                              onChange={(e) => updateManualAllocation(playlist.id, parseInt(e.target.value) || 0)}
                              className="w-20 h-8 text-xs"
                              placeholder="Daily"
                            />
                          ) : (
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="w-3 h-3 text-secondary" />
                              <span className="text-sm">{playlist.avg_daily_streams.toLocaleString()}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSelected && (
                            <span className="text-sm font-mono">
                              {(manualAllocations[playlist.id] || (allocation?.allocation) || Math.min(1000 * campaignData.duration_days, (playlist.avg_daily_streams || 100) * campaignData.duration_days)).toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <span className="text-xs">Part of vendor total</span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={playlist.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-4">
          <Card className="bg-gradient-glow border-primary/20 sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Allocation Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Goal</span>
                  <span className="font-mono text-sm">{campaignData.stream_goal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Projected Total</span>
                  <span className="font-mono text-sm">{projections.totalStreams.toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">From Playlists</span>
                  <span className="font-mono text-sm">{Object.values(projections.byPlaylist).reduce((sum, val) => sum + val, 0).toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">From Vendors</span>
                  <span className="font-mono text-sm">{vendorAllocations.reduce((sum, va) => sum + va.allocation, 0).toLocaleString()}</span>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-sm">Coverage</span>
                    <span className="font-mono text-sm">
                      {((projections.totalStreams / campaignData.stream_goal) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Selected Items</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Playlists: {selectedPlaylists.size}</div>
                    <div>Vendors: {selectedVendors.size}</div>
                  </div>
                </div>

                {vendorAllocations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Vendor Allocations</h4>
                    <div className="space-y-1">
                      {vendorAllocations.map(va => {
                        const vendor = vendors?.find(v => v.id === va.vendor_id);
                        return (
                          <div key={va.vendor_id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{vendor?.name}</span>
                            <span className="font-mono">{va.allocation.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {validation.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-destructive">Validation Errors</h4>
                    <div className="space-y-1">
                      {validation.errors.slice(0, 3).map((error, idx) => (
                        <p key={idx} className="text-xs text-destructive">{error}</p>
                      ))}
                      {validation.errors.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{validation.errors.length - 3} more errors</p>
                      )}
                    </div>
                  </div>
                )}
                
                <Progress 
                  value={Math.min((projections.totalStreams / campaignData.stream_goal) * 100, 100)} 
                  className="h-2"
                />
              </div>

              <Button 
                onClick={handleContinue}
                disabled={selectedPlaylists.size === 0 && selectedVendors.size === 0 || !validation.isValid}
                className="w-full"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue to Review
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-border/30">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Configuration
        </Button>
        
        <Button 
          onClick={handleContinue}
          className="bg-gradient-primary hover:opacity-80 shadow-glow"
          disabled={selectedPlaylists.size === 0 && selectedVendors.size === 0 || !validation.isValid}
        >
          Continue to Review
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}









"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useVendors } from '../hooks/useVendors';
import { AlertCircle, Plus, Trash2, DollarSign, TrendingUp, Music, ChevronDown, ChevronRight, Sparkles, Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// Genre mapping for matching
const GENRE_MAPPING: Record<string, string[]> = {
  'phonk': ['phonk', 'drift phonk', 'brazilian phonk', 'dark phonk'],
  'tech house': ['tech house', 'melodic house', 'deep tech'],
  'techno': ['techno', 'dark techno', 'industrial techno', 'minimal techno', 'peak time techno', 'hard techno'],
  'house': ['house', 'deep house', 'future house', 'funky house', 'vocal house', 'uk house', 'chicago house', 'slap house'],
  'dubstep': ['dubstep', 'brostep', 'riddim dubstep', 'melodic dubstep', 'chillstep'],
  'trap': ['trap', 'trap edm', 'festival trap', 'hybrid trap'],
  'melodic bass': ['melodic bass', 'melodic dubstep', 'future bass', 'color bass', 'wave'],
  'trance': ['trance', 'uplifting trance', 'vocal trance', 'psytrance', 'progressive trance'],
  'dance': ['dance', 'dance pop', 'edm', 'electro house', 'electronic'],
  'pop': ['pop', 'dance pop', 'synth-pop', 'electropop', 'indie pop'],
  'hip-hop': ['hip hop', 'hip-hop', 'rap', 'trap', 'boom bap'],
  'r&b': ['r&b', 'rnb', 'neo soul', 'soul'],
  'rock': ['rock', 'classic rock', 'hard rock', 'indie rock'],
  'chill': ['chill', 'chillout', 'chillwave', 'lo-fi', 'lofi beats', 'chillhop'],
};

// Calculate genre match score
function calculateGenreMatchScore(campaignGenres: string[], playlistGenres: string[]): number {
  if (!campaignGenres.length || !playlistGenres.length) return 0;
  
  let score = 0;
  const normalizedPlaylistGenres = playlistGenres.map(g => g.toLowerCase().trim());
  
  for (const campaignGenre of campaignGenres) {
    const normalizedCampaignGenre = campaignGenre.toLowerCase().trim();
    
    // Direct match
    if (normalizedPlaylistGenres.includes(normalizedCampaignGenre)) {
      score += 3;
      continue;
    }
    
    // Related genres
    const relatedGenres = GENRE_MAPPING[normalizedCampaignGenre] || [normalizedCampaignGenre];
    for (const related of relatedGenres) {
      if (normalizedPlaylistGenres.some(pg => pg.includes(related) || related.includes(pg))) {
        score += 2;
        break;
      }
    }
    
    // Partial match
    if (normalizedPlaylistGenres.some(pg => pg.includes(normalizedCampaignGenre) || normalizedCampaignGenre.includes(pg))) {
      score += 1;
    }
  }
  
  return score;
}

interface VendorAssignment {
  vendor_id: string;
  vendor_name: string;
  allocated_streams: number;
  allocated_budget: number;
  playlist_ids?: string[];
  cost_per_1k?: number; // Allow override of default vendor rate
}

interface VendorAssignmentStepProps {
  assignments: VendorAssignment[];
  onChange: (assignments: VendorAssignment[]) => void;
  totalStreamGoal: number;
  totalBudget: number;
  campaignGenres?: string[]; // Added for auto-suggestions
}

export function VendorAssignmentStep({ 
  assignments, 
  onChange, 
  totalStreamGoal, 
  totalBudget,
  campaignGenres = []
}: VendorAssignmentStepProps) {
  const { data: vendors = [] } = useVendors();
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [hasAutoSuggested, setHasAutoSuggested] = useState(false);
  // Use ref instead of state to prevent re-render loops
  const autoApplyAttemptedRef = useRef(false);
  
  const activeVendors = vendors.filter(v => v.is_active);

  // Fetch all playlists grouped by vendor
  const { data: allPlaylists = [] } = useQuery({
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

  // Calculate genre match scores for all playlists
  const playlistsWithScores = useMemo(() => {
    try {
      return allPlaylists.map(playlist => ({
        ...playlist,
        genreMatchScore: calculateGenreMatchScore(campaignGenres || [], playlist.genres || [])
      }));
    } catch (error) {
      console.error('Error calculating playlist scores:', error);
      return allPlaylists;
    }
  }, [allPlaylists, campaignGenres]);

  // Get matching playlists grouped by vendor
  const matchingPlaylistsByVendor = useMemo(() => {
    try {
      const matching = playlistsWithScores.filter(p => (p.genreMatchScore || 0) >= 2);
      const grouped: Record<string, any[]> = {};
      
      matching.forEach(playlist => {
        if (!playlist.vendor_id) return;
        if (!grouped[playlist.vendor_id]) {
          grouped[playlist.vendor_id] = [];
        }
        grouped[playlist.vendor_id].push(playlist);
      });
      
      return grouped;
    } catch (error) {
      console.error('Error grouping playlists by vendor:', error);
      return {};
    }
  }, [playlistsWithScores]);

  // Count matching playlists (moved up for useEffect dependency)
  const matchingPlaylistsCount = Object.values(matchingPlaylistsByVendor).flat().length;
  const matchingVendorsCount = Object.keys(matchingPlaylistsByVendor).length;

  // AUTO-APPLY: Disabled to prevent infinite render loops
  // Manual auto-suggest via button click is still available
  // The auto-apply was causing issues with Radix UI Select components

  // Internal auto-suggest function (reusable)
  const handleAutoSuggestInternal = () => {
    console.log('🔧 handleAutoSuggestInternal called');
    console.log('🔧 Campaign genres:', campaignGenres);
    console.log('🔧 Matching playlists by vendor:', Object.keys(matchingPlaylistsByVendor || {}));
    console.log('🔧 Active vendors count:', activeVendors?.length || 0);
    
    if (!campaignGenres || campaignGenres.length === 0) {
      console.log('⚠️ No campaign genres, skipping auto-suggest');
      return;
    }
    
    if (!matchingPlaylistsByVendor || Object.keys(matchingPlaylistsByVendor).length === 0) {
      console.log('⚠️ No matching playlists by vendor, skipping auto-suggest');
      return;
    }

    const newAssignments: VendorAssignment[] = [];
    
    // Calculate total estimated daily streams from matching playlists
    const totalEstimatedStreams = Object.values(matchingPlaylistsByVendor)
      .flat()
      .reduce((sum, p) => sum + (p?.avg_daily_streams || 0), 0);
    
    console.log('🔧 Total estimated daily streams:', totalEstimatedStreams);

    Object.entries(matchingPlaylistsByVendor).forEach(([vendorId, playlists]) => {
      const vendor = activeVendors.find(v => v.id === vendorId);
      if (!vendor) {
        console.log('⚠️ Vendor not found for ID:', vendorId);
        return;
      }

      // Calculate this vendor's share based on their playlists' daily streams
      const vendorDailyStreams = playlists.reduce((sum, p) => sum + (p.avg_daily_streams || 0), 0);
      const streamShare = totalEstimatedStreams > 0 
        ? vendorDailyStreams / totalEstimatedStreams 
        : 1 / Object.keys(matchingPlaylistsByVendor).length;

      const allocatedStreams = Math.floor(totalStreamGoal * streamShare);
      const allocatedBudget = Math.floor(totalBudget * streamShare * 100) / 100;

      console.log(`🔧 Vendor ${vendor.name}: ${playlists.length} playlists, ${allocatedStreams} streams, $${allocatedBudget}`);

      newAssignments.push({
        vendor_id: vendorId,
        vendor_name: vendor.name,
        allocated_streams: allocatedStreams,
        allocated_budget: allocatedBudget,
        playlist_ids: playlists.map(p => p.id)
      });
    });

    console.log('🔧 New assignments count before sorting:', newAssignments.length);

    // Sort by allocated streams (highest first) and limit to top 5
    newAssignments.sort((a, b) => b.allocated_streams - a.allocated_streams);
    const topAssignments = newAssignments.slice(0, 5);

    // Adjust allocations to match totals exactly
    if (topAssignments.length > 0) {
      const totalAllocatedStreams = topAssignments.reduce((sum, a) => sum + a.allocated_streams, 0);
      const totalAllocatedBudget = topAssignments.reduce((sum, a) => sum + a.allocated_budget, 0);
      
      // Add remainder to first vendor
      if (totalAllocatedStreams < totalStreamGoal) {
        topAssignments[0].allocated_streams += totalStreamGoal - totalAllocatedStreams;
      }
      if (totalAllocatedBudget < totalBudget) {
        topAssignments[0].allocated_budget += Math.round((totalBudget - totalAllocatedBudget) * 100) / 100;
      }
    }

    console.log('✅ Final assignments:', topAssignments.map(a => `${a.vendor_name}: ${a.allocated_streams} streams`));
    
    onChange(topAssignments);
    setHasAutoSuggested(true);
    
    // Expand all assigned vendors
    setExpandedVendors(new Set(topAssignments.map(a => a.vendor_id)));
  };

  // Fallback distribution when no genre matches found
  const handleFallbackDistribution = () => {
    console.log('🔧 handleFallbackDistribution called');
    
    if (activeVendors.length === 0) {
      console.log('⚠️ No active vendors available');
      return;
    }
    
    // Get top 3 vendors with most playlists
    const vendorPlaylistCounts = activeVendors.map(vendor => {
      const vendorPlaylists = allPlaylists.filter(p => p.vendor_id === vendor.id);
      return {
        vendor,
        playlistCount: vendorPlaylists.length,
        playlists: vendorPlaylists
      };
    }).filter(v => v.playlistCount > 0)
      .sort((a, b) => b.playlistCount - a.playlistCount)
      .slice(0, 3);
    
    if (vendorPlaylistCounts.length === 0) {
      console.log('⚠️ No vendors have playlists');
      return;
    }
    
    const sharePerVendor = 1 / vendorPlaylistCounts.length;
    const newAssignments: VendorAssignment[] = vendorPlaylistCounts.map(({ vendor, playlists }) => ({
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      allocated_streams: Math.floor(totalStreamGoal * sharePerVendor),
      allocated_budget: Math.floor(totalBudget * sharePerVendor * 100) / 100,
      playlist_ids: playlists.slice(0, 5).map(p => p.id) // Max 5 playlists per vendor
    }));
    
    // Adjust first vendor to match totals exactly
    if (newAssignments.length > 0) {
      const totalAllocatedStreams = newAssignments.reduce((sum, a) => sum + a.allocated_streams, 0);
      const totalAllocatedBudget = newAssignments.reduce((sum, a) => sum + a.allocated_budget, 0);
      
      if (totalAllocatedStreams < totalStreamGoal) {
        newAssignments[0].allocated_streams += totalStreamGoal - totalAllocatedStreams;
      }
      if (totalAllocatedBudget < totalBudget) {
        newAssignments[0].allocated_budget += Math.round((totalBudget - totalAllocatedBudget) * 100) / 100;
      }
    }
    
    console.log('✅ Fallback assignments:', newAssignments.map(a => `${a.vendor_name}: ${a.allocated_streams} streams`));
    
    onChange(newAssignments);
    setHasAutoSuggested(true);
    setExpandedVendors(new Set(newAssignments.map(a => a.vendor_id)));
  };

  // Auto-suggest vendors based on genre matching (button handler - calls internal function)
  const handleAutoSuggest = () => {
    try {
      handleAutoSuggestInternal();
    } catch (error) {
      console.error('❌ Error in auto-suggest:', error);
      // Fallback to basic distribution if auto-suggest fails
      handleFallbackDistribution();
    }
  };
  
  // Calculate totals
  const totalAllocatedStreams = assignments.reduce((sum, a) => sum + (a.allocated_streams || 0), 0);
  const totalAllocatedBudget = assignments.reduce((sum, a) => sum + (a.allocated_budget || 0), 0);
  
  const remainingStreams = totalStreamGoal - totalAllocatedStreams;
  const remainingBudget = totalBudget - totalAllocatedBudget;
  
  const isOverAllocatedStreams = totalAllocatedStreams > totalStreamGoal;
  const isOverAllocatedBudget = totalAllocatedBudget > totalBudget;

  const handleAddVendor = () => {
    if (!selectedVendorId) return;
    
    const vendor = activeVendors.find(v => v.id === selectedVendorId);
    if (!vendor) return;
    
    // Check if vendor already added
    if (assignments.some(a => a.vendor_id === selectedVendorId)) {
      return;
    }
    
    const newAssignment: VendorAssignment = {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      allocated_streams: 0,
      allocated_budget: 0,
      playlist_ids: []
    };
    
    onChange([...assignments, newAssignment]);
    setSelectedVendorId('');
  };

  const handleRemoveVendor = (vendorId: string) => {
    onChange(assignments.filter(a => a.vendor_id !== vendorId));
  };

  const handleUpdateAssignment = (vendorId: string, field: 'allocated_streams' | 'allocated_budget' | 'cost_per_1k', value: number) => {
    onChange(
      assignments.map(a => {
        if (a.vendor_id !== vendorId) return a;
        
        const updated = { ...a, [field]: Math.max(0, value) };
        
        // Auto-recalculate budget when streams or cost_per_1k changes
        if (field === 'allocated_streams' || field === 'cost_per_1k') {
          const streams = field === 'allocated_streams' ? value : (a.allocated_streams || 0);
          const costPer1k = field === 'cost_per_1k' ? value : (a.cost_per_1k ?? activeVendors.find(v => v.id === vendorId)?.cost_per_1k_streams ?? 8);
          updated.allocated_budget = Math.round((streams / 1000) * costPer1k * 100) / 100;
        }
        
        return updated;
      })
    );
  };

  const handleTogglePlaylist = (vendorId: string, playlistId: string) => {
    // Validate inputs
    if (!vendorId || !playlistId) {
      console.warn('handleTogglePlaylist: Missing vendorId or playlistId', { vendorId, playlistId });
      return;
    }
    
    try {
      onChange(
        assignments.map(a => {
          if (a.vendor_id !== vendorId) return a;
          
          const currentPlaylists = a.playlist_ids || [];
          const newPlaylists = currentPlaylists.includes(playlistId)
            ? currentPlaylists.filter(id => id !== playlistId)
            : [...currentPlaylists, playlistId];
          
          return { ...a, playlist_ids: newPlaylists };
        })
      );
    } catch (error) {
      console.error('Error toggling playlist:', error);
    }
  };

  const handleToggleVendorExpansion = (vendorId: string) => {
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

  // Memoized vendor playlists map to prevent creating new arrays on each render
  const vendorPlaylistsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    allPlaylists.forEach(p => {
      if (!p.vendor_id) return;
      if (!map[p.vendor_id]) {
        map[p.vendor_id] = [];
      }
      map[p.vendor_id].push(p);
    });
    return map;
  }, [allPlaylists]);

  // Get playlists for a specific vendor (returns memoized array)
  const getVendorPlaylists = useCallback((vendorId: string) => {
    return vendorPlaylistsMap[vendorId] || [];
  }, [vendorPlaylistsMap]);

  // Smart auto-distribute: genre-matched playlists, proportional streams, budget based on cost per 1k
  const handleSmartAutoDistribute = () => {
    if (assignments.length === 0) return;
    
    // Calculate total matching daily streams across all assigned vendors
    const totalMatchingStreams = assignments.reduce((total, assignment) => {
      const vendorMatchingPlaylists = matchingPlaylistsByVendor[assignment.vendor_id] || [];
      return total + vendorMatchingPlaylists.reduce((sum, p) => sum + (p.avg_daily_streams || 0), 0);
    }, 0);
    
    // If no genre matches, fall back to equal distribution based on all playlists
    const useEqualDistribution = totalMatchingStreams === 0;
    
    const updatedAssignments = assignments.map(assignment => {
      const vendor = activeVendors.find(v => v.id === assignment.vendor_id);
      const vendorCost = assignment.cost_per_1k ?? vendor?.cost_per_1k_streams ?? 8;
      
      // Get genre-matching playlists for this vendor (or all vendor playlists if no matches)
      const vendorMatchingPlaylists = matchingPlaylistsByVendor[assignment.vendor_id] || [];
      const vendorAllPlaylists = allPlaylists.filter(p => p.vendor_id === assignment.vendor_id);
      const playlistsToUse = vendorMatchingPlaylists.length > 0 ? vendorMatchingPlaylists : vendorAllPlaylists.slice(0, 10);
      
      const vendorDailyStreams = playlistsToUse.reduce((sum, p) => sum + (p.avg_daily_streams || 0), 0);
      
      // Calculate this vendor's proportional share
      let streamShare: number;
      if (useEqualDistribution) {
        streamShare = 1 / assignments.length;
      } else {
        streamShare = totalMatchingStreams > 0 
          ? vendorDailyStreams / totalMatchingStreams 
          : 1 / assignments.length;
      }
      
      const allocatedStreams = Math.floor(totalStreamGoal * streamShare);
      const allocatedBudget = (allocatedStreams / 1000) * vendorCost;
      
      return {
        ...assignment,
        allocated_streams: allocatedStreams,
        allocated_budget: Math.round(allocatedBudget * 100) / 100,
        cost_per_1k: vendorCost,
        playlist_ids: playlistsToUse.map(p => p.id)
      };
    });
    
    // Adjust remainder to first vendor to match totals exactly
    if (updatedAssignments.length > 0) {
      const totalAllocatedStreams = updatedAssignments.reduce((sum, a) => sum + a.allocated_streams, 0);
      const streamRemainder = totalStreamGoal - totalAllocatedStreams;
      
      if (streamRemainder !== 0) {
        updatedAssignments[0].allocated_streams += streamRemainder;
        // Recalculate budget for first vendor with adjusted streams
        const firstVendorCost = updatedAssignments[0].cost_per_1k ?? 8;
        updatedAssignments[0].allocated_budget = Math.round((updatedAssignments[0].allocated_streams / 1000) * firstVendorCost * 100) / 100;
      }
    }
    
    console.log('✅ Smart auto-distribute:', updatedAssignments.map(a => 
      `${a.vendor_name}: ${a.allocated_streams} streams, $${a.allocated_budget} @ $${a.cost_per_1k}/1k`
    ));
    
    onChange(updatedAssignments);
    
    // Expand all assigned vendors to show playlists
    setExpandedVendors(new Set(updatedAssignments.map(a => a.vendor_id)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Vendor Assignment</h3>
          <p className="text-sm text-muted-foreground">
            Assign vendors to handle this campaign and allocate streams/budget to each.
          </p>
        </div>
        
        {/* Auto-Suggest Button */}
        {campaignGenres.length > 0 && matchingVendorsCount > 0 && (
          <Button 
            type="button"
            onClick={handleAutoSuggest}
            variant="default"
            size="sm"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Wand2 className="h-4 w-4" />
            Auto-Suggest ({matchingVendorsCount} vendors, {matchingPlaylistsCount} playlists)
          </Button>
        )}
      </div>

      {/* Auto-Suggestion Info */}
      {campaignGenres.length > 0 && !hasAutoSuggested && matchingVendorsCount > 0 && assignments.length === 0 && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Genre-matched vendors available!</p>
                <p className="text-xs text-muted-foreground">
                  Found {matchingPlaylistsCount} playlists from {matchingVendorsCount} vendors matching your genres: {campaignGenres.join(', ')}
                </p>
              </div>
              <Button 
                type="button"
                onClick={handleAutoSuggest}
                size="sm"
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Apply Suggestions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {campaignGenres.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-muted-foreground">
                Select genres above to enable automatic vendor suggestions based on playlist genre matching.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Streams Summary */}
        <Card className={isOverAllocatedStreams ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Stream Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campaign Goal:</span>
                <span className="font-medium">{totalStreamGoal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Allocated:</span>
                <span className={`font-medium ${isOverAllocatedStreams ? 'text-destructive' : ''}`}>
                  {totalAllocatedStreams.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className={`font-medium ${isOverAllocatedStreams ? 'text-destructive' : 'text-primary'}`}>
                  {remainingStreams.toLocaleString()}
                </span>
              </div>
              {isOverAllocatedStreams && (
                <div className="flex items-center gap-2 text-xs text-destructive mt-2">
                  <AlertCircle className="h-3 w-3" />
                  Over-allocated by {Math.abs(remainingStreams).toLocaleString()} streams
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <Card className={isOverAllocatedBudget ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campaign Budget:</span>
                <span className="font-medium">${totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Allocated:</span>
                <span className={`font-medium ${isOverAllocatedBudget ? 'text-destructive' : ''}`}>
                  ${totalAllocatedBudget.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className={`font-medium ${isOverAllocatedBudget ? 'text-destructive' : 'text-primary'}`}>
                  ${remainingBudget.toLocaleString()}
                </span>
              </div>
              {isOverAllocatedBudget && (
                <div className="flex items-center gap-2 text-xs text-destructive mt-2">
                  <AlertCircle className="h-3 w-3" />
                  Over-allocated by ${Math.abs(remainingBudget).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Vendor Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Vendors</CardTitle>
          <CardDescription>Select vendors to work on this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select a vendor...</option>
              {activeVendors
                .filter(v => !assignments.some(a => a.vendor_id === v.id))
                .map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} {vendor.max_daily_streams ? `(Max: ${vendor.max_daily_streams.toLocaleString()}/day)` : ''}
                  </option>
                ))}
            </select>
            <Button 
              type="button"
              onClick={handleAddVendor}
              disabled={!selectedVendorId}
              size="default"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Assignments List */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Vendor Allocations</CardTitle>
              <CardDescription>{assignments.length} vendor(s) assigned</CardDescription>
            </div>
            <Button 
              type="button"
              onClick={handleSmartAutoDistribute}
              variant="default"
              size="sm"
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Wand2 className="h-4 w-4" />
              Auto-Distribute
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignments.map((assignment, index) => {
                const vendor = activeVendors.find(v => v.id === assignment.vendor_id);
                
                return (
                  <Card key={assignment.vendor_id} className="border-2">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{assignment.vendor_name}</h4>
                          {vendor?.cost_per_1k_streams && (
                            <p className="text-xs text-muted-foreground">
                              Standard rate: ${vendor.cost_per_1k_streams}/1K streams
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleRemoveVendor(assignment.vendor_id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Allocated Streams</Label>
                          <Input
                            type="number"
                            min="0"
                            value={assignment.allocated_streams || ''}
                            onChange={(e) => handleUpdateAssignment(
                              assignment.vendor_id, 
                              'allocated_streams', 
                              parseInt(e.target.value) || 0
                            )}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cost per 1K ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={assignment.cost_per_1k ?? vendor?.cost_per_1k_streams ?? ''}
                            onChange={(e) => handleUpdateAssignment(
                              assignment.vendor_id, 
                              'cost_per_1k', 
                              parseFloat(e.target.value) || 0
                            )}
                            placeholder={vendor?.cost_per_1k_streams?.toString() || "8.00"}
                          />
                          {vendor?.cost_per_1k_streams && assignment.cost_per_1k && assignment.cost_per_1k !== vendor.cost_per_1k_streams && (
                            <p className="text-xs text-amber-600 mt-1">
                              Default: ${vendor.cost_per_1k_streams}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Allocated Budget ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={assignment.allocated_budget || ''}
                            onChange={(e) => handleUpdateAssignment(
                              assignment.vendor_id, 
                              'allocated_budget', 
                              parseFloat(e.target.value) || 0
                            )}
                            placeholder="0.00"
                            className="bg-muted/50"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
                        </div>
                      </div>

                      {/* Playlist Selection */}
                      <div className="mt-4 pt-4 border-t">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => handleToggleVendorExpansion(assignment.vendor_id)}
                        >
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium cursor-pointer">
                              <Music className="h-4 w-4 inline mr-1" />
                              Select Playlists (Optional)
                            </Label>
                            {assignment.playlist_ids && assignment.playlist_ids.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {assignment.playlist_ids.length} selected
                              </Badge>
                            )}
                          </div>
                          {expandedVendors.has(assignment.vendor_id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {expandedVendors.has(assignment.vendor_id) && (
                          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                            {getVendorPlaylists(assignment.vendor_id).length > 0 ? (
                              getVendorPlaylists(assignment.vendor_id).map(playlist => {
                                // Ensure isSelected is always a boolean (not undefined)
                                const isSelected = Boolean(assignment.playlist_ids?.includes(playlist.id));
                                return (
                                  <div
                                    key={playlist.id}
                                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-primary/10 border-primary'
                                        : 'hover:bg-muted/50'
                                    }`}
                                    onClick={() => handleTogglePlaylist(assignment.vendor_id, playlist.id)}
                                  >
                                    <Checkbox checked={isSelected} />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{playlist.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {(playlist.follower_count || 0).toLocaleString()} followers
                                        {playlist.avg_daily_streams && playlist.avg_daily_streams > 0 && (
                                          <span> • ~{playlist.avg_daily_streams.toLocaleString()}/day</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No playlists available for this vendor
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Messages */}
      {assignments.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-md bg-muted/20">
          <AlertCircle className="h-4 w-4" />
          <span>No vendors assigned yet. Add at least one vendor to continue.</span>
        </div>
      )}
    </div>
  );
}



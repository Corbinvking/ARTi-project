"use client"

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import {
  Search,
  Users,
  Target,
  CheckCircle,
  Plus,
  Minus,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFollowerCount, getFollowerTier } from '../../utils/creditCalculations';
import { estimateReach } from '../ui/soundcloud-reach-estimator';

// Enhanced artist selection with large pool support (12-50 artists)
const optimizeArtistSelection = (artists: Member[], targetReach: number, submitterFollowers: number): { quick: string[], optimized?: string[] } => {
  if (artists.length === 0) return { quick: [] };
  
  // Use larger dataset for better combinations - expand to 100+ artists
  const limitedArtists = artists.slice(0, 100);

  console.log('Starting enhanced artist selection:', {
    totalArtists: artists.length,
    limitedArtists: limitedArtists.length,
    targetReach,
    submitterFollowers,
    targetArtistRange: '12-50 artists'
  });

  // Enhanced selection for 12-50 artist optimization
  const quickResult = findOptimalSelection(limitedArtists, targetReach, submitterFollowers);
  
  return { 
    quick: quickResult.selected,
    optimized: quickResult.selected
  };
};

// Enhanced selection algorithm for 12-50 artists with 110% hard cap
const findOptimalSelection = (artists: Member[], targetReach: number, submitterFollowers: number) => {
  // Calculate similarity scores and tier-based weighting
  const artistsWithSimilarity = artists.map(artist => {
    const followers = artist.soundcloud_followers || 0;
    const similarityScore = calculateSimilarityScore(followers, submitterFollowers);
    
    // Add tier-based selection logic
    const submitterTier = getArtistTier(submitterFollowers);
    const artistTier = getArtistTier(followers);
    const tierBonus = getTierCompatibilityBonus(submitterTier, artistTier);
    
    return {
      ...artist,
      followers,
      similarityScore: similarityScore * tierBonus
    };
  });
  
  // Sort by similarity first, but keep variety of sizes
  const sorted = artistsWithSimilarity.sort((a, b) => {
    const similarityDiff = b.similarityScore - a.similarityScore;
    if (Math.abs(similarityDiff) > 0.1) return similarityDiff;
    return b.followers - a.followers;
  });
  
  const selected: string[] = [];
  let currentFollowerSum = 0;
  const hardCap = targetReach * 1.10; // Hard 110% cap to prevent overdelivery
  const targetTolerance = targetReach * 0.06; // 6% tolerance for optimization
  
  console.log('Starting selection with 110% hard cap:', {
    targetReach,
    hardCap,
    tolerance: targetTolerance,
    maxArtists: 50,
    availableArtists: sorted.length
  });
  
  // Enhanced algorithm for 12-50 artists with overdelivery prevention
  for (const artist of sorted) {
    if (selected.length >= 50) break; // Hard cap at 50 artists
    
    const newSum = currentFollowerSum + artist.followers;
    
    // CRITICAL: Never exceed 110% hard cap
    if (newSum > hardCap) {
      console.log('Skipping artist to prevent overdelivery:', {
        name: artist.stage_name || artist.name,
        followers: artist.followers,
        wouldReach: newSum,
        hardCap: hardCap,
        overdeliveryPrevented: true
      });
      continue; // Skip this artist to prevent overdelivery
    }
    
    const currentDistance = Math.abs(targetReach - currentFollowerSum);
    const newDistance = Math.abs(targetReach - newSum);
    
    // Selection logic: add if under target, or if it gets us closer without exceeding cap
    const shouldAdd = currentFollowerSum < targetReach || newDistance <= currentDistance;
    
    if (shouldAdd) {
      selected.push(artist.id);
      currentFollowerSum = newSum;
      const reachPercentage = (currentFollowerSum / targetReach) * 100;
      
      console.log('Added artist:', {
        name: artist.stage_name || artist.name,
        followers: artist.followers,
        similarityScore: artist.similarityScore.toFixed(2),
        currentSum: currentFollowerSum,
        targetReach,
        reachPercentage: reachPercentage.toFixed(1) + '%',
        distance: Math.abs(currentFollowerSum - targetReach),
        selectedCount: selected.length,
        withinHardCap: currentFollowerSum <= hardCap
      });
      
      // Success criteria: within tolerance, at least 12 artists, and under hard cap
      if (selected.length >= 12 && 
          Math.abs(currentFollowerSum - targetReach) <= targetTolerance && 
          currentFollowerSum <= hardCap) {
        console.log('✅ Target reached successfully with hard cap respected:', {
          selectedCount: selected.length,
          finalReach: currentFollowerSum,
          targetReach,
          hardCap,
          reachPercentage: reachPercentage.toFixed(1) + '%',
          accuracy: `${((1 - Math.abs(currentFollowerSum - targetReach) / targetReach) * 100).toFixed(1)}%`
        });
        break;
      }
    }
  }
  
  // If we haven't reached minimum, fill with smaller artists
  if (selected.length < 12) {
    const remainingArtists = sorted.filter(a => !selected.includes(a.id));
    const smallerArtists = remainingArtists.sort((a, b) => a.followers - b.followers);
    
    for (const artist of smallerArtists) {
      if (selected.length >= 12) break;
      selected.push(artist.id);
      currentFollowerSum += artist.followers;
      
      console.log('Filling minimum requirement:', {
        name: artist.stage_name || artist.name,
        followers: artist.followers,
        selectedCount: selected.length
      });
    }
  }
  
  console.log('Final selection result with hard cap compliance:', {
    selectedCount: selected.length,
    totalReach: currentFollowerSum,
    targetReach,
    hardCap,
    reachPercentage: ((currentFollowerSum / targetReach) * 100).toFixed(1) + '%',
    accuracy: `${((1 - Math.abs(currentFollowerSum - targetReach) / targetReach) * 100).toFixed(1)}%`,
    withinTolerance: Math.abs(currentFollowerSum - targetReach) <= targetTolerance,
    respectsHardCap: currentFollowerSum <= hardCap,
    overdeliveryPrevented: currentFollowerSum <= hardCap
  });
  
  return { selected, totalReach: currentFollowerSum };
};

// Helper functions for tier-based matching
const getArtistTier = (followers: number): string => {
  if (followers < 50000) return 'small';
  if (followers < 500000) return 'medium';
  return 'large';
};

const getTierCompatibilityBonus = (submitterTier: string, artistTier: string): number => {
  // Same tier gets highest bonus
  if (submitterTier === artistTier) return 1.5;
  
  // Small submitters should avoid large artists
  if (submitterTier === 'small' && artistTier === 'large') return 0.6;
  
  // Medium submitters can work with anyone
  if (submitterTier === 'medium') return 1.2;
  
  // Large submitters prefer medium/large artists
  if (submitterTier === 'large' && artistTier === 'small') return 0.8;
  
  return 1.0;
};

// Calculate similarity score based on follower count tiers
const calculateSimilarityScore = (artistFollowers: number, submitterFollowers: number): number => {
  if (submitterFollowers === 0) return 0.5; // Default for unknown submitters
  
  const ratio = Math.min(artistFollowers, submitterFollowers) / Math.max(artistFollowers, submitterFollowers);
  
  // Bonus for same tier
  const getTier = (followers: number) => {
    if (followers < 50000) return 'small';
    if (followers < 500000) return 'medium';
    return 'large';
  };
  
  const sameTier = getTier(artistFollowers) === getTier(submitterFollowers);
  return ratio * (sameTier ? 1.2 : 1.0);
};

// Removed complex algorithms to improve performance

interface Member {
  id: string;
  name: string;
  stage_name: string;
  soundcloud_followers: number;
  size_tier: string;
  net_credits: number;
  families: string[];
  groups: string[];
  reach_factor: number;
  status: string;
  repost_credit_wallet: {
    balance: number;
    monthly_grant: number;
  };
}

interface ArtistAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedArtists: string[], supportDate: Date) => void;
  submission: {
    id: string;
    artist_name: string;
    family: string;
    subgenres: string[];
    expected_reach_planned: number;
    members: {
      size_tier: string;
      soundcloud_followers: number;
    };
  } | null;
}

export const ArtistAssignmentModal: React.FC<ArtistAssignmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  submission,
}) => {
  const { toast } = useToast();
  const [suggestedArtists, setSuggestedArtists] = useState<Member[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [totalReach, setTotalReach] = useState(0);
  const [addedFromSearch, setAddedFromSearch] = useState<Set<string>>(new Set());
  const [hasSearchFocus, setHasSearchFocus] = useState(false);
  const [supportDate, setSupportDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });

  // Calculate total estimated reach of selected artists
  useEffect(() => {
    console.log('Calculating total reach for selected artists:', {
      selectedArtists,
      suggestedArtistsCount: suggestedArtists.length,
      searchResultsCount: searchResults.length
    });
    
    const totalEstimatedReach = selectedArtists.reduce((total, artistId) => {
      const artist = [...suggestedArtists, ...searchResults].find(a => a.id === artistId);
      if (artist) {
        const artistReach = artist.soundcloud_followers || 0;
        console.log('Found artist for reach calculation:', {
          artistId,
          name: artist.stage_name || artist.name,
          followers: artist.soundcloud_followers,
          followerCount: artistReach
        });
        return total + artistReach;
      } else {
        console.log('Artist not found for reach calculation:', artistId);
      }
      return total;
    }, 0);
    
    console.log('Setting total reach:', totalEstimatedReach);
    setTotalReach(totalEstimatedReach);
  }, [selectedArtists, suggestedArtists, searchResults]);

  // Fast-first fetch with progressive enhancement
  const fetchSuggestedArtists = async () => {
    if (!submission) return;

    setQuickLoading(true);
    setLoading(true);
    
    try {
      console.log('Fetching artists for submission:', {
        family: submission.family,
        subgenres: submission.subgenres,
        memberFollowers: submission.members?.soundcloud_followers
      });

      // Start with basic query (without integration status filtering)
      let query = supabase
        .from('members')
        .select(`
          id, name, stage_name, soundcloud_followers, size_tier, 
          net_credits, families, groups, reach_factor, status,
          repost_credit_wallet!inner(balance, monthly_grant)
        `)
        .eq('status', 'active')
        .gt('repost_credit_wallet.balance', 0)
        .gt('soundcloud_followers', 1000)
        .order('soundcloud_followers', { ascending: false })
        .limit(100);

      // Apply genre filter for precision
      if (submission.subgenres?.length > 0) {
        console.log('Adding subgenres filter:', submission.subgenres);
        query = query.overlaps('groups', submission.subgenres);
      }

      const { data, error } = await query;
      if (error) throw error;

      let members = data as Member[];
      console.log('Query results:', { count: members.length });
      
      // Quick fallback if no genre matches
      if (members.length === 0) {
        console.log('No genre matches, using top artists...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('members')
          .select(`
            id, name, stage_name, soundcloud_followers, size_tier,
            net_credits, families, groups, reach_factor, status,
            repost_credit_wallet!inner(balance, monthly_grant)
          `)
          .eq('status', 'active')
          .gt('repost_credit_wallet.balance', 0)
          .gt('soundcloud_followers', 1000)
          .order('soundcloud_followers', { ascending: false })
          .limit(100);
        
        if (fallbackError) throw fallbackError;
        members = fallbackData as Member[];
      }

      // Calculate target reach using estimateReach function
      const submitterFollowers = submission.members?.soundcloud_followers || 0;
      const targetReach = estimateReach(submitterFollowers)?.reach_median || 0;
      
      console.log('Target reach:', targetReach, 'for', submitterFollowers, 'followers');

      // Smart selection prioritizing similar-sized artists
      setQuickLoading(false);
      const selectionResult = optimizeArtistSelection(members, targetReach, submitterFollowers);
      
      // Set artists and selection immediately
      setSuggestedArtists(members);
      setSelectedArtists(selectionResult.quick);
      
      console.log('Quick selection complete:', {
        selectedCount: selectionResult.quick.length,
        targetReach,
        selectedIds: selectionResult.quick
      });

    } catch (error: any) {
      console.error('Error fetching artists:', error);
      toast({
        title: "Error",
        description: "Failed to fetch suggested artists",
        variant: "destructive",
      });
    } finally {
      setQuickLoading(false);
      setLoading(false);
    }
  };

  // Search for additional artists with follower count sorting
  const searchArtists = async (term: string) => {
    try {
      let query = supabase
        .from('members')
        .select(`
          *,
          repost_credit_wallet!inner(balance, monthly_grant)
        `)
        .eq('status', 'active')
        .gt('repost_credit_wallet.balance', 0)
        .order('soundcloud_followers', { ascending: false })
        .limit(500);

      // If there's a search term, filter by it - otherwise show all artists
      if (term.trim()) {
        query = query.or(`name.ilike.${term}%,stage_name.ilike.${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSearchResults(data as Member[]);
    } catch (error: any) {
      console.error('Error searching artists:', error);
    }
  };

  // Show all artists on focus
  const handleSearchFocus = () => {
    setHasSearchFocus(true);
    if (searchResults.length === 0) {
      searchArtists(''); // Load all artists sorted by follower count
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding to allow clicking on dropdown items
    setTimeout(() => {
      setHasSearchFocus(false);
      setSearchResults([]);
    }, 150);
  };

  useEffect(() => {
    if (isOpen && submission) {
      fetchSuggestedArtists();
    } else if (!isOpen) {
      // Reset search state when modal closes
      setSearchTerm('');
      setSearchResults([]);
      setHasSearchFocus(false);
    }
  }, [isOpen, submission]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // Only search if user has focused the input or there's an actual search term
      if (hasSearchFocus || searchTerm.trim()) {
        searchArtists(searchTerm);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, hasSearchFocus]);

  const handleArtistToggle = (artistId: string) => {
    setSelectedArtists(prev => {
      if (prev.includes(artistId)) {
        // Deselecting - remove from selected and from suggested if it was added from search
        if (addedFromSearch.has(artistId)) {
          setSuggestedArtists(current => current.filter(artist => artist.id !== artistId));
          setAddedFromSearch(current => {
            const newSet = new Set(current);
            newSet.delete(artistId);
            return newSet;
          });
        }
        return prev.filter(id => id !== artistId);
      } else {
        // Selecting
        return [...prev, artistId];
      }
    });
  };

  const handleSearchArtistSelect = (artist: Member) => {
    // Add to selected artists
    setSelectedArtists(prev => [...prev, artist.id]);
    
    // Add to suggested artists if not already there
    setSuggestedArtists(current => {
      if (current.find(a => a.id === artist.id)) {
        return current;
      }
      const updated = [...current, artist];
      // Sort by follower count (highest first)
      return updated.sort((a, b) => b.soundcloud_followers - a.soundcloud_followers);
    });
    
    // Track that this was added from search
    setAddedFromSearch(current => new Set(current).add(artist.id));
    
    // Clear search
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleConfirm = () => {
    if (selectedArtists.length === 0) {
      toast({
        title: "No Artists Selected",
        description: "Please select at least one artist",
        variant: "destructive",
      });
      return;
    }

    if (!supportDate) {
      toast({
        title: "No Support Date Selected",
        description: "Please select when reposts should start",
        variant: "destructive",
      });
      return;
    }

    onConfirm(selectedArtists, supportDate);
    onClose();
  };

  const renderArtistItem = (artist: Member, isSelected: boolean) => (
    <div 
      key={artist.id} 
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
        isSelected ? 'bg-primary/5 border-primary' : 'border-border'
      }`}
      onClick={() => handleArtistToggle(artist.id)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => handleArtistToggle(artist.id)}
      />
      <div className="flex-1">
        <span className="font-medium">{artist.stage_name || artist.name}</span>
        <span className="text-muted-foreground ml-2">
          ({formatFollowerCount(artist.soundcloud_followers)})
        </span>
      </div>
    </div>
  );

  if (!submission) return null;

  // Calculate target reach based on submitter's follower count using estimateReach
  const submitterFollowers = submission.members?.soundcloud_followers || 0;
  const targetReach = estimateReach(submitterFollowers)?.reach_median || 0;
  const reachPercentage = (totalReach / targetReach) * 100;
  const hardCapPercentage = 110;
  
  // Updated reach status with 110% hard cap awareness
  const isReachGood = reachPercentage >= 94 && reachPercentage <= 106;
  const isReachWarning = reachPercentage > 106 && reachPercentage <= hardCapPercentage;
  const isReachExceeded = reachPercentage > hardCapPercentage;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assign Artists - {submission.artist_name}
          </DialogTitle>
          <DialogDescription>
            {quickLoading ? "Finding optimal artists..." : "Select artists to assign to this submission."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reach Summary */}
          <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Supporter Summary
            </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Target Reach</div>
                  <div className="text-2xl font-bold">{targetReach.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Estimated Reach</div>
                  <div className={`text-2xl font-bold ${
                    isReachGood ? 'text-green-600' : 
                    isReachWarning ? 'text-yellow-600' : 
                    isReachExceeded ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {totalReach.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                  <div className={`text-2xl font-bold ${
                    isReachGood ? 'text-green-600' : 
                    isReachWarning ? 'text-yellow-600' : 
                    isReachExceeded ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {reachPercentage.toFixed(0)}%
                  </div>
                </div>
              </div>
              {(isReachWarning || isReachExceeded || (!isReachGood && reachPercentage < 90)) && (
                <div className={`flex items-center gap-2 mt-3 p-3 rounded-lg ${
                  isReachExceeded ? 'bg-red-50' : 
                  isReachWarning ? 'bg-yellow-50' : 
                  'bg-orange-50'
                }`}>
                  <AlertCircle className={`w-4 h-4 ${
                    isReachExceeded ? 'text-red-600' : 
                    isReachWarning ? 'text-yellow-600' : 
                    'text-orange-600'
                  }`} />
                  <span className={`text-sm ${
                    isReachExceeded ? 'text-red-800' : 
                    isReachWarning ? 'text-yellow-800' : 
                    'text-orange-800'
                  }`}>
                    {isReachExceeded 
                      ? `❌ Exceeds 110% limit! Remove artists to prevent overdelivery (currently ${reachPercentage.toFixed(0)}%)`
                      : isReachWarning 
                        ? `⚠️ Approaching overdelivery limit (${reachPercentage.toFixed(0)}%). Max allowed: 110%`
                        : 'Consider adding more artists to reach target reach'
                    }
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Support Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Select when the reposts should start
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !supportDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {supportDate ? format(supportDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={supportDate}
                      onSelect={(date) => date && setSupportDate(date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Search Additional Artists */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Add More Artists</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Click to see all artists sorted by followers, or type to filter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                className="pl-9"
              />
              {hasSearchFocus && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  <div className="px-3 py-2 border-b bg-muted text-xs text-muted-foreground">
                    {searchTerm 
                      ? `Artists starting with "${searchTerm}" (${searchResults.filter(artist => !suggestedArtists.find(s => s.id === artist.id)).length} results)` 
                      : `All artists sorted by followers (${searchResults.filter(artist => !suggestedArtists.find(s => s.id === artist.id)).length} available)`
                    }
                  </div>
                  {searchResults
                    .filter(artist => !suggestedArtists.find(s => s.id === artist.id))
                    .map(artist => (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0"
                        onClick={() => handleSearchArtistSelect(artist)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{artist.stage_name || artist.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {formatFollowerCount(artist.soundcloud_followers)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getFollowerTier(artist.soundcloud_followers)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {searchTerm && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 p-3 text-sm text-muted-foreground">
                  No artists found starting with "{searchTerm}"
                </div>
              )}
            </div>
          </div>

          {/* Suggested Artists */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {quickLoading 
                ? "Optimizing selection..." 
                : loading 
                  ? "Loading artists..." 
                  : `Suggested Artists (${suggestedArtists.length})`
              }
            </h3>
            {quickLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                🔄 Finding optimal artist combination...
              </div>
            ) : loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading suggestions...</div>
            ) : (
              <div className="space-y-2">
                {suggestedArtists
                  .sort((a, b) => {
                    const aSelected = selectedArtists.includes(a.id);
                    const bSelected = selectedArtists.includes(b.id);
                    
                    // Selected artists first
                    if (aSelected && !bSelected) return -1;
                    if (!aSelected && bSelected) return 1;
                    
                    // Within same selection status, sort by followers
                    return b.soundcloud_followers - a.soundcloud_followers;
                  })
                  .map(artist => 
                    renderArtistItem(artist, selectedArtists.includes(artist.id))
                  )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedArtists.length} artists selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={selectedArtists.length === 0 || !supportDate || isReachExceeded}
                variant={isReachExceeded ? "destructive" : "default"}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isReachExceeded 
                  ? 'Cannot Approve - Exceeds 110%'
                  : supportDate 
                    ? `Approve for ${format(supportDate, 'MMM d')}` 
                    : 'Approve with Selected Artists'
                }
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
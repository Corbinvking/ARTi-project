"use client"

import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { Search, Users, Target, CheckCircle, Plus, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { formatFollowerCount } from '../../utils/creditCalculations';
import { estimateReach } from '../ui/soundcloud-reach-estimator';

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

interface RepostingArtistsListProps {
  submissionId: string;
  submission?: {
    id?: string;
    status: string;
    support_date: string | null;
    suggested_supporters?: string[];
    expected_reach_planned?: number;
    artist_name?: string;
    family?: string;
    subgenres?: string[];
    members?: {
      soundcloud_followers: number;
    };
  };
}

export const RepostingArtistsList: React.FC<RepostingArtistsListProps> = ({ submissionId, submission }) => {
  const { toast } = useToast();
  const [selectedArtists, setSelectedArtists] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasSearchFocus, setHasSearchFocus] = useState(false);

  // Load selected artists from suggested_supporters
  const loadSelectedArtists = async () => {
    if (!submission?.suggested_supporters?.length) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          id, name, stage_name, soundcloud_followers, size_tier, 
          net_credits, families, groups, reach_factor, status,
          repost_credit_wallet!inner(balance, monthly_grant)
        `)
        .in('id', submission.suggested_supporters)
        .eq('status', 'active');

      if (error) throw error;
      setSelectedArtists(data as Member[]);
    } catch (error: any) {
      console.error('Error loading selected artists:', error);
      toast({
        title: "Error",
        description: "Failed to load selected artists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Search for additional artists
  const searchArtists = async (term: string) => {
    try {
      let query = supabase
        .from('members')
        .select(`
          id, name, stage_name, soundcloud_followers, size_tier,
          net_credits, families, groups, reach_factor, status,
          repost_credit_wallet!inner(balance, monthly_grant)
        `)
        .eq('status', 'active')
        .gt('repost_credit_wallet.balance', 0)
        .order('soundcloud_followers', { ascending: false })
        .limit(100);

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

  // Save changes to suggested_supporters
  const saveChanges = async () => {
    if (!submission?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          suggested_supporters: selectedArtists.map(a => a.id)
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Artist selection saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateQueue = async () => {
    if (!submission?.support_date) {
      toast({
        title: "Error",
        description: "No support date found",
        variant: "destructive",
      });
      return;
    }
    
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-queue', {
        body: { date: submission.support_date }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: data.message || "Queue generated successfully",
      });

      // Reload the selected artists to reflect any changes
      setTimeout(() => {
        loadSelectedArtists();
      }, 1000);
    } catch (error: any) {
      console.error('Error generating queue:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate queue assignments",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Calculate reach estimates
  const calculateReachEstimates = () => {
    const totalReach = selectedArtists.reduce((sum, artist) => sum + (artist.soundcloud_followers || 0), 0);
    const targetReach = submission?.expected_reach_planned || 0;
    const reachPercentage = targetReach > 0 ? (totalReach / targetReach) * 100 : 0;
    
    return {
      totalReach,
      targetReach,
      reachPercentage,
      status: reachPercentage > 110 ? 'exceeded' : reachPercentage >= 95 ? 'good' : 'needs_more'
    };
  };

  const handleArtistToggle = (artist: Member) => {
    setSelectedArtists(prev => {
      const isSelected = prev.find(a => a.id === artist.id);
      if (isSelected) {
        return prev.filter(a => a.id !== artist.id);
      } else {
        return [...prev, artist];
      }
    });
  };

  const handleSearchFocus = () => {
    setHasSearchFocus(true);
    if (searchResults.length === 0) {
      searchArtists('');
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      setHasSearchFocus(false);
      setSearchResults([]);
    }, 150);
  };

  // Load data on component mount
  useEffect(() => {
    if (submission) {
      loadSelectedArtists();
    }
  }, [submission]);

  // Search debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (hasSearchFocus || searchTerm.trim()) {
        searchArtists(searchTerm);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, hasSearchFocus]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h4 className="text-md font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Reposting Artists
        </h4>
        <div className="space-y-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const reachEstimates = calculateReachEstimates();
  const canGenerateQueue = submission?.status === 'approved' && submission?.support_date;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Reposting Artists ({selectedArtists.length})
        </h4>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={saveChanges}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          {canGenerateQueue && (
            <Button 
              size="sm"
              onClick={generateQueue}
              disabled={generating}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Generate Queue'}
            </Button>
          )}
        </div>
      </div>

      {/* Reach Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              Reach Progress
            </CardTitle>
            <Badge 
              variant={reachEstimates.status === 'good' ? 'default' : 
                      reachEstimates.status === 'exceeded' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {reachEstimates.reachPercentage.toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current: {formatFollowerCount(reachEstimates.totalReach)}</span>
              <span>Target: {formatFollowerCount(reachEstimates.targetReach)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  reachEstimates.status === 'exceeded' ? 'bg-destructive' :
                  reachEstimates.status === 'good' ? 'bg-primary' : 'bg-muted-foreground'
                }`}
                style={{ width: `${Math.min(reachEstimates.reachPercentage, 100)}%` }}
              />
            </div>
            {reachEstimates.status === 'exceeded' && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircle className="w-3 h-3" />
                Over 110% target - consider removing some artists
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and Add Artists */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search artists to add..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            className="pl-9"
          />
        </div>

        {/* Search Results Dropdown */}
        {(hasSearchFocus || searchTerm) && searchResults.length > 0 && (
          <Card className="absolute z-10 w-full mt-1 border shadow-lg bg-background">
            <ScrollArea className="max-h-60">
              <div className="p-2 space-y-1">
                {searchResults
                  .filter(artist => !selectedArtists.find(a => a.id === artist.id))
                  .slice(0, 10)
                  .map((artist) => (
                    <div
                      key={artist.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                      onClick={() => handleArtistToggle(artist)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {artist.stage_name || artist.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFollowerCount(artist.soundcloud_followers)} followers
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>

      {/* Selected Artists */}
      {selectedArtists.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No artists selected yet.</p>
          <p className="text-sm">Search above to add artists for this submission.</p>
        </div>
      ) : (
        <ScrollArea className="h-80 w-full">
          <div className="grid gap-3">
            {selectedArtists.map((artist, index) => (
              <Card key={artist.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => handleArtistToggle(artist)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {artist.stage_name || artist.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFollowerCount(artist.soundcloud_followers)} followers
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
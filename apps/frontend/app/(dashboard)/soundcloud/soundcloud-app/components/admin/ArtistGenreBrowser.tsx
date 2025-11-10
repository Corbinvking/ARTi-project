"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InteractiveCard } from '../ui/interactive-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GenreTagFilter } from './GenreTagFilter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Users, 
  Music, 
  TrendingUp, 
  Calendar,
  Grid,
  List,
  Settings,
  ExternalLink,
  Crown,
  Award,
  Medal,
  Zap,
  CheckCircle,
  Clock,
  UserX,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  stage_name?: string;
  primary_email: string;
  status: string;
  size_tier: string;
  soundcloud_url?: string;
  soundcloud_followers?: number;
  influence_planner_status?: string;
  created_at: string;
  groups?: string[];
}

interface GenreFamily {
  id: string;
  name: string;
  color?: string;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
  patterns: string[];
  order_index: number;
  active: boolean;
}

export const ArtistGenreBrowser: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [subgenres, setSubgenres] = useState<Subgenre[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'followers' | 'created' | 'tier'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Calculate tier counts dynamically
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach(member => {
      if (member.size_tier) {
        counts[member.size_tier] = (counts[member.size_tier] || 0) + 1;
      }
    });
    return counts;
  }, [members]);

  // Get available tiers sorted
  const availableTiers = useMemo(() => {
    return Object.keys(tierCounts).sort((a, b) => {
      // Custom sort for T1, T2, T3 format
      const aNum = parseInt(a.replace('T', ''));
      const bNum = parseInt(b.replace('T', ''));
      return aNum - bNum;
    });
  }, [tierCounts]);

  const availableIPStatuses = useMemo(() => {
    const statusCounts = members.reduce((acc, member) => {
      const status = member.influence_planner_status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusOptions = [
      { value: 'all', label: `All (${members.length})` },
      { value: 'connected', label: `Connected (${statusCounts.connected || 0})` },
      { value: 'invited', label: `Invited (${statusCounts.invited || 0})` },
      { value: 'hasnt_logged_in', label: `Not Logged In (${statusCounts.hasnt_logged_in || 0})` },
      { value: 'disconnected', label: `Disconnected (${statusCounts.disconnected || 0})` },
      { value: 'uninterested', label: `Uninterested (${statusCounts.uninterested || 0})` },
      { value: 'unknown', label: `Unknown (${statusCounts.unknown || 0})` }
    ];

    return statusOptions;
  }, [members]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersResponse, familiesResponse, subgenresResponse] = await Promise.all([
        supabase.from('members').select('id, name, stage_name, primary_email, status, size_tier, soundcloud_url, soundcloud_followers, influence_planner_status, created_at, groups'),
        supabase.from('genre_families').select('*').order('name'),
        supabase.from('subgenres').select('*').order('order_index')
      ]);

      if (membersResponse.error) throw membersResponse.error;
      if (familiesResponse.error) throw familiesResponse.error;
      if (subgenresResponse.error) throw subgenresResponse.error;

      setMembers(membersResponse.data || []);
      setGenreFamilies(familiesResponse.data || []);
      setSubgenres(subgenresResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch artist data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members.filter(member => {
      // Search filter
      const matchesSearch = (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            member.primary_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (member.stage_name && member.stage_name.toLowerCase().includes(searchTerm.toLowerCase())));

      // IP Status filter
      const matchesStatus = statusFilter === 'all' || member.influence_planner_status === statusFilter;

      // Tier filter
      const matchesTier = tierFilter === 'all' || member.size_tier === tierFilter;

      // Genre filter - check against member groups and formal genres
      const matchesGenre = selectedGenres.length === 0 || 
        selectedGenres.some(genre => {
          // Check if it's a group name (direct string match)
          if (member.groups?.includes(genre)) return true;
          
          // Check if it's a formal genre family ID
          if (genreFamilies.some(f => f.id === genre)) return true;
          
          // Check if it's a formal subgenre ID  
          if (subgenres.some(s => s.id === genre)) return true;
          
          return false;
        });

      return matchesSearch && matchesStatus && matchesTier && matchesGenre;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.stage_name || a.name).localeCompare(b.stage_name || b.name);
          break;
        case 'followers':
          comparison = (a.soundcloud_followers || 0) - (b.soundcloud_followers || 0);
          break;
        case 'tier':
          // Sort tiers T1, T2, T3
          const aTier = parseInt(a.size_tier?.replace('T', '') || '0');
          const bTier = parseInt(b.size_tier?.replace('T', '') || '0');
          comparison = aTier - bTier;
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [members, searchTerm, selectedGenres, statusFilter, tierFilter, sortBy, sortOrder]);

  const handleMemberSelect = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (selectedMembers.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleBulkGenreAssignment = () => {
    if (selectedMembers.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select artists to assign genres to",
        variant: "destructive",
      });
      return;
    }

    // This would open a bulk assignment modal
    toast({
      title: "Bulk Assignment",
      description: `Bulk genre assignment for ${selectedMembers.size} artists coming soon!`,
    });
  };

  const getIPStatusBadge = (status?: string) => {
    if (!status || status === 'unknown') {
      return { 
        variant: 'outline' as const, 
        text: 'Unknown', 
        className: 'text-muted-foreground border-muted-foreground/30',
        icon: HelpCircle
      };
    }
    
    switch (status) {
      case 'connected':
        return { 
          variant: 'default' as const, 
          text: 'Connected', 
          className: 'bg-emerald-500/90 hover:bg-emerald-600 text-white border-emerald-500',
          icon: CheckCircle
        };
      case 'invited':
        return { 
          variant: 'secondary' as const, 
          text: 'Invited', 
          className: 'bg-amber-500/90 hover:bg-amber-600 text-white border-amber-500',
          icon: Clock
        };
      case 'hasnt_logged_in':
        return { 
          variant: 'secondary' as const, 
          text: 'Not Logged In', 
          className: 'bg-blue-500/90 hover:bg-blue-600 text-white border-blue-500',
          icon: AlertCircle
        };
      case 'disconnected':
        return { 
          variant: 'destructive' as const, 
          text: 'Disconnected', 
          className: 'bg-red-500/90 hover:bg-red-600 text-white border-red-500',
          icon: UserX
        };
      case 'uninterested':
        return { 
          variant: 'outline' as const, 
          text: 'Uninterested', 
          className: 'text-muted-foreground border-muted-foreground/50',
          icon: UserX
        };
      default:
        return { 
          variant: 'outline' as const, 
          text: status, 
          className: 'text-muted-foreground border-muted-foreground/30',
          icon: HelpCircle
        };
    }
  };

  const getTierBadgeInfo = (tier?: string) => {
    if (!tier) return { icon: Medal, className: 'text-muted-foreground' };
    
    switch (tier) {
      case 'T1':
        return { 
          icon: Crown, 
          className: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold shadow-lg hover:from-yellow-500 hover:to-yellow-700'
        };
      case 'T2':
        return { 
          icon: Award, 
          className: 'bg-gradient-to-r from-gray-300 to-gray-500 text-black font-semibold shadow-lg hover:from-gray-400 hover:to-gray-600'
        };
      case 'T3':
        return { 
          icon: Medal, 
          className: 'bg-gradient-to-r from-amber-600 to-amber-800 text-white font-semibold shadow-lg hover:from-amber-700 hover:to-amber-900'
        };
      default:
        return { 
          icon: Medal, 
          className: 'bg-muted text-muted-foreground'
        };
    }
  };

  const getGenreDisplay = (member: Member) => {
    // Get genres from groups field (primary source) and other sources
    const allGenres = [];
    
    // Add groups (primary genre source)
    if (member.groups && member.groups.length > 0) {
      member.groups.forEach(group => {
        allGenres.push({ name: group, type: 'group' });
      });
    }
    
    if (allGenres.length === 0) {
      return <span className="text-xs text-muted-foreground">No genres</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {allGenres.slice(0, 2).map((genre, index) => (
          <Badge 
            key={`${genre.type}-${genre.name}-${index}`}
            variant="outline" 
            className="text-xs bg-primary/5 text-primary border-primary/20"
          >
            {genre.name}
          </Badge>
        ))}
        {allGenres.length > 2 && (
          <Badge variant="outline" className="text-xs">
            +{allGenres.length - 2}
          </Badge>
        )}
      </div>
    );
  };

  const ArtistCard: React.FC<{ member: Member }> = ({ member }) => {
    const ipStatus = getIPStatusBadge(member.influence_planner_status);
    const tierInfo = getTierBadgeInfo(member.size_tier);
    const IPStatusIcon = ipStatus.icon;
    const TierIcon = tierInfo.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <InteractiveCard
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-card/50 to-card/80 backdrop-blur-sm hover:from-card/70 hover:to-card/90 transition-all duration-300 ${
            selectedMembers.has(member.id) 
              ? 'ring-2 ring-primary/50 shadow-lg shadow-primary/10' 
              : 'hover:shadow-lg hover:shadow-primary/5'
          }`}
          glowOnHover={true}
          hoverScale={1.02}
          onClick={() => handleMemberSelect(member.id)}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50" />
          
          {/* Selection Indicator */}
          {selectedMembers.has(member.id) && (
            <div className="absolute top-1 left-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          )}

          <div className="relative p-3 space-y-2">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Checkbox
                  checked={selectedMembers.has(member.id)}
                  onCheckedChange={() => handleMemberSelect(member.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 border-2 transition-all data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Music className="h-3 w-3 text-primary/70 flex-shrink-0" />
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {member.stage_name || member.name}
                    </h4>
                  </div>
                </div>
              </div>
              
              {/* External Link */}
              {member.soundcloud_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(member.soundcloud_url, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Member Info Row */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground truncate">
                {member.name} • {member.primary_email}
              </div>
              
              {/* Status and Badges Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* IP Status Badge */}
                  <Badge 
                    variant={ipStatus.variant} 
                    className={`text-xs px-2 py-0.5 h-5 flex items-center gap-1 font-medium ${ipStatus.className}`}
                  >
                    <IPStatusIcon className="h-2.5 w-2.5" />
                    {ipStatus.text}
                  </Badge>
                  
                  {/* Tier Badge */}
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-0.5 h-5 flex items-center gap-1 border-0 ${tierInfo.className}`}
                  >
                    <TierIcon className="h-2.5 w-2.5" />
                    {member.size_tier}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Genre Display */}
            {getGenreDisplay(member)}

            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-primary/60" />
                <span className="font-medium">
                  {(member.soundcloud_followers || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary/60" />
                <span>
                  {new Date(member.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        </InteractiveCard>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading artists...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Artist Browser Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search artists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">IP Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIPStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {availableTiers.map(tier => (
                    <SelectItem key={tier} value={tier}>
                      {tier} ({tierCounts[tier]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="followers">Followers</SelectItem>
                    <SelectItem value="tier">Tier</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <TrendingUp className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          <GenreTagFilter
            genreFamilies={genreFamilies}
            subgenres={subgenres as any}
            selectedGenres={selectedGenres}
            onGenreChange={setSelectedGenres}
            availableGroups={Array.from(new Set(members.flatMap(m => m.groups || []))).sort()}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredAndSortedMembers.length} artists
            {selectedMembers.size > 0 && ` (${selectedMembers.size} selected)`}
          </span>
          {selectedMembers.size > 0 && (
            <Button size="sm" onClick={handleBulkGenreAssignment}>
              <Settings className="h-4 w-4 mr-1" />
              Bulk Assign Genres
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Artists Grid/List */}
      <AnimatePresence>
        <div className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3' 
            : 'space-y-2'
        }`}>
          {filteredAndSortedMembers.map(member => (
            <ArtistCard key={member.id} member={member} />
          ))}
        </div>
      </AnimatePresence>

      {filteredAndSortedMembers.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No artists found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
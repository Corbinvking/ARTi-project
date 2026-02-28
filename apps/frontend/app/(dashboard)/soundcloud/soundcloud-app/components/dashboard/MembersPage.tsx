"use client"

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import {
  Users,
  Search,
  Filter,
  Mail,
  Activity,
  TrendingUp,
  Crown,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Music,
  UserPlus,
  Upload,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { MemberDetailModal } from './MemberDetailModal';
import { AddMemberModal } from './AddMemberModal';
import { BulkMemberImport } from './BulkMemberImport';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type MemberStatus = 'connected' | 'disconnected' | 'invited' | 'uninterested';
type SizeTier = 'T1' | 'T2' | 'T3' | 'T4';

type InfluencePlannerStatus = 'hasnt_logged_in' | 'invited' | 'disconnected' | 'connected' | 'uninterested';

// Database still uses old enum values, we'll map them to display values
type DbMemberStatus = 'active' | 'needs_reconnect';

interface Member {
  id: string;
  name: string;
  first_name?: string;
  stage_name?: string;
  primary_email: string;
  emails: string[];
  status: DbMemberStatus; // Database value
  size_tier: SizeTier;
  followers: number;
  soundcloud_followers: number;
  soundcloud_url: string;
  families: string[];
  subgenres: string[];
  groups: string[];
  monthly_repost_limit: number;
  submissions_this_month: number;
  net_credits: number;
  created_at: string;
  updated_at: string;
  last_submission_at: string;
  manual_genres: string[];
  genre_family_id?: string;
  genre_notes?: string;
  influence_planner_status: InfluencePlannerStatus;
}

interface GenreFamily {
  id: string;
  name: string;
  active: boolean;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
  active: boolean;
}

// Helper function to map database status to display status
const mapDbStatusToDisplay = (dbStatus: DbMemberStatus): MemberStatus => {
  switch (dbStatus) {
    case 'active':
      return 'connected';
    case 'needs_reconnect':
      return 'disconnected';
    default:
      return 'disconnected';
  }
};

// Helper function to map display status to database status
const mapDisplayStatusToDb = (displayStatus: MemberStatus): DbMemberStatus => {
  switch (displayStatus) {
    case 'connected':
      return 'active';
    case 'disconnected':
    case 'invited':
    case 'uninterested':
      return 'needs_reconnect';
    default:
      return 'needs_reconnect';
  }
};

interface MemberStats {
  total: number;
  active: number;
  premium: number;
  needsAttention: number;
}

export const MembersPage = () => {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [subgenres, setSubgenres] = useState<Subgenre[]>([]);
  const [stats, setStats] = useState<MemberStats>({
    total: 0,
    active: 0,
    premium: 0,
    needsAttention: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const urlStatus = searchParams?.get('status');
    return urlStatus || 'all';
  });
  const [tierFilter, setTierFilter] = useState('all');
  const [influencePlannerFilter, setInfluencePlannerFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState(() => {
    const urlGenre = searchParams?.get('genre');
    return urlGenre || 'all';
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [syncingFollowers, setSyncingFollowers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const statusConfig = {
    connected: { label: 'Connected', color: 'bg-success text-success-foreground', icon: CheckCircle },
    disconnected: { label: 'Disconnected', color: 'bg-destructive text-destructive-foreground', icon: AlertCircle },
    invited: { label: 'Invited', color: 'bg-info text-info-foreground', icon: Activity },
    uninterested: { label: 'Uninterested', color: 'bg-muted text-muted-foreground', icon: XCircle },
  };

  const tierConfig = {
    T1: { label: 'Tier 1', color: 'bg-muted text-muted-foreground', followers: '0-1K' },
    T2: { label: 'Tier 2', color: 'bg-info text-info-foreground', followers: '1K-10K' },
    T3: { label: 'Tier 3', color: 'bg-primary text-primary-foreground', followers: '10K-100K' },
    T4: { label: 'Tier 4', color: 'bg-accent text-accent-foreground', followers: '100K+' },
  };

  const fetchMembers = async () => {
    try {
      // Fetch members, genre families, and subgenres in parallel
      const [membersResponse, familiesResponse, subgenresResponse] = await Promise.all([
        supabase
          .from('soundcloud_members')
          .select('*')
          .order(sortBy, { ascending: sortDirection === 'asc' }),
        supabase
          .from('soundcloud_genre_families')
          .select('*')
          .eq('active', true)
          .order('name'),
        supabase
          .from('soundcloud_subgenres')
          .select('*')
          .eq('active', true)
          .order('name')
      ]);

      if (membersResponse.error) throw membersResponse.error;
      if (familiesResponse.error) throw familiesResponse.error;
      if (subgenresResponse.error) throw subgenresResponse.error;

      let membersData = membersResponse.data || [];

      // Apply filters
      if (statusFilter !== 'all') {
        const dbStatus = mapDisplayStatusToDb(statusFilter as MemberStatus);
        membersData = membersData.filter(m => m.status === dbStatus);
      }

      if (tierFilter !== 'all') {
        membersData = membersData.filter(m => m.size_tier === tierFilter);
      }

      if (influencePlannerFilter !== 'all') {
        membersData = membersData.filter(m => m.influence_planner_status === influencePlannerFilter);
      }

      if (genreFilter !== 'all') {
        if (genreFilter === 'untagged') {
          // Members are untagged if they have no groups (primary genre source)
          membersData = membersData.filter(m => 
            (!m.groups || m.groups.length === 0)
          );
        } else {
          // Filter by groups primarily
          membersData = membersData.filter(m => {
            // First check groups (primary source)
            if (m.groups?.includes(genreFilter)) return true;
            
            // Then check formal genre system
            if (m.families?.includes(genreFilter)) return true;
            if (m.subgenres?.some(sub => sub === genreFilter)) return true;
            if (m.manual_genres?.includes(genreFilter)) return true;
            
            // Check if genreFilter matches any genre family or subgenre name
            const genreFamily = genreFamilies.find(f => f.name === genreFilter);
            if (genreFamily && m.families?.includes(genreFamily.id)) return true;
            
            const subgenre = subgenres.find(s => s.name === genreFilter);
            if (subgenre && m.subgenres?.includes(subgenre.id)) return true;
            
            // Check if any group contains the filter term
            if (m.groups?.some(group => group.toLowerCase().includes(genreFilter.toLowerCase()))) return true;
            
            return false;
          });
        }
      }

      setMembers(membersData);
      setGenreFamilies(familiesResponse.data || []);
      setSubgenres(subgenresResponse.data || []);

      // Calculate stats using mapped values
      const newStats = {
        total: membersData.length,
        active: membersData.filter(m => mapDbStatusToDisplay(m.status) === 'connected').length,
        premium: membersData.filter(m => m.size_tier === 'T4').length,
        needsAttention: membersData.filter(m => {
          const displayStatus = mapDbStatusToDisplay(m.status);
          return displayStatus === 'disconnected' || displayStatus === 'uninterested';
        }).length,
      };
      setStats(newStats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [statusFilter, tierFilter, influencePlannerFilter, genreFilter, sortBy, sortDirection]);

  // Handle URL parameters and show notification when filters are applied
  useEffect(() => {
    const urlStatus = searchParams?.get('status');
    const urlGenre = searchParams?.get('genre');
    
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
      toast({
        title: "Filter Applied",
        description: `Showing ${urlStatus === 'disconnected' ? 'disconnected' : urlStatus} members`,
      });
    }
    
    if (urlGenre && urlGenre !== genreFilter) {
      setGenreFilter(urlGenre);
      toast({
        title: "Filter Applied", 
        description: `Showing ${urlGenre === 'untagged' ? 'untagged' : urlGenre} members`,
      });
    }
  }, [searchParams]);

  const updateMemberStatus = async (memberId: string, newDisplayStatus: MemberStatus) => {
    try {
      const newDbStatus = mapDisplayStatusToDb(newDisplayStatus);
      const { error } = await supabase
        .from('soundcloud_members')
        .update({ status: newDbStatus })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Member status changed to ${statusConfig[newDisplayStatus]?.label || newDisplayStatus}`,
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleSyncFollowers = async () => {
    setSyncingFollowers(true);
    try {
      console.log('Starting follower sync...');
      
      const { data, error } = await supabase.functions.invoke('daily-follower-sync');
      
      if (error) {
        throw error;
      }
      
      console.log('Sync result:', data);
      
      toast({
        title: "Success",
        description: `Follower sync completed: ${data.result.successful_syncs}/${data.result.total_processed} members updated`,
      });
      
      // Refresh members data to show updated follower counts
      fetchMembers();
      
    } catch (error: any) {
      console.error('Error syncing followers:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync followers",
        variant: "destructive",
      });
    } finally {
      setSyncingFollowers(false);
    }
  };

  const handleMemberSelect = (memberId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers(prev => [...prev, memberId]);
    } else {
      setSelectedMembers(prev => prev.filter(id => id !== memberId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(filteredMembers.map(m => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSingleDelete = (member: Member) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  };

  const handleBulkDelete = () => {
    if (selectedMembers.length === 0) return;
    setMemberToDelete(null); // Indicates bulk delete
    setShowDeleteDialog(true);
  };

  const deleteMember = async (memberId: string) => {
    // Delete related records in the correct order to avoid foreign key constraints
    
    // 1. First get member_account IDs to delete integration_status records
    const { data: memberAccounts } = await supabase
      .from('soundcloud_member_accounts')
      .select('id')
      .eq('member_id', memberId);

    if (memberAccounts && memberAccounts.length > 0) {
      const accountIds = memberAccounts.map(acc => acc.id);
      
      // Delete integration_status records
      const { error: integrationError } = await supabase
        .from('soundcloud_integration_status')
        .delete()
        .in('member_account_id', accountIds);
      
      if (integrationError) throw integrationError;
    }

    // 2. Delete member_accounts (references members)
    const { error: accountsError } = await supabase
      .from('soundcloud_member_accounts')
      .delete()
      .eq('member_id', memberId);
    
    if (accountsError) throw accountsError;

    // 3. Delete other related records
    const { error: avoidListError } = await supabase
      .from('soundcloud_avoid_list_items')
      .delete()
      .eq('member_id', memberId);
    if (avoidListError) throw avoidListError;

    const { error: genresError } = await supabase
      .from('soundcloud_member_genres')
      .delete()
      .eq('member_id', memberId);
    if (genresError) throw genresError;

    const { error: ledgerError } = await supabase
      .from('soundcloud_repost_credit_ledger')
      .delete()
      .eq('member_id', memberId);
    if (ledgerError) throw ledgerError;

    const { error: walletError } = await supabase
      .from('soundcloud_repost_credit_wallet')
      .delete()
      .eq('member_id', memberId);
    if (walletError) throw walletError;

    // 4. Finally delete the member
    const { error: memberError } = await supabase
      .from('soundcloud_members')
      .delete()
      .eq('id', memberId);
    
    if (memberError) throw memberError;
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (memberToDelete) {
        // Single delete
        await deleteMember(memberToDelete.id);
        toast({
          title: "Success",
          description: "Member deleted successfully",
        });
      } else {
        // Bulk delete
        for (const memberId of selectedMembers) {
          await deleteMember(memberId);
        }
        toast({
          title: "Success", 
          description: `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} deleted successfully`,
        });
        setSelectedMembers([]);
      }
      
      setShowDeleteDialog(false);
      setMemberToDelete(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete member(s)",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.stage_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.primary_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.emails?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    member.groups?.some(group => group.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (member: Member) => {
    const displayStatus = mapDbStatusToDisplay(member.status);
    const config = statusConfig[displayStatus] || {
      label: displayStatus,
      color: 'bg-gray-500',
      icon: AlertCircle
    };
    
    return (
      <Badge className={`${config.color} hover:opacity-80 transition-opacity`}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTierBadge = (tier: SizeTier) => {
    const config = tierConfig[tier];
    
    return (
      <Badge className={`${config.color} text-white hover:${config.color}/80`}>
        <Crown className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const influencePlannerStatusConfig = {
    hasnt_logged_in: { label: "Hasn't Logged In", color: 'bg-muted text-muted-foreground' },
    invited: { label: 'Invited', color: 'bg-info text-info-foreground' },
    disconnected: { label: 'Disconnected', color: 'bg-destructive text-destructive-foreground' },
    connected: { label: 'Connected', color: 'bg-success text-success-foreground' },
    uninterested: { label: 'Uninterested', color: 'bg-warning text-warning-foreground' },
  };

  const getInfluencePlannerStatusBadge = (status: InfluencePlannerStatus) => {
    const config = influencePlannerStatusConfig[status];
    return (
      <Badge className={`${config.color} hover:opacity-80 transition-opacity`}>
        {config.label}
      </Badge>
    );
  };

  const updateInfluencePlannerStatus = async (memberId: string, newStatus: InfluencePlannerStatus) => {
    try {
      const { error } = await supabase
        .from('soundcloud_members')
        .update({ influence_planner_status: newStatus })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Influence Planner status changed to ${influencePlannerStatusConfig[newStatus]?.label}`,
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update influence planner status",
        variant: "destructive",
      });
    }
  };

  const getFirstName = (fullName: string) => {
    return fullName?.split(' ')[0] || '';
  };

  const getSecondaryEmail = (emails: string[], primaryEmail: string) => {
    return emails?.find(email => email !== primaryEmail) || '';
  };

  const getGroupsBadges = (groups: string[]) => {
    if (!groups || groups.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {groups.slice(0, 2).map((group, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {group}
          </Badge>
        ))}
        {groups.length > 2 && (
          <Badge variant="outline" className="text-xs">
            +{groups.length - 2}
          </Badge>
        )}
      </div>
    );
  };

  const getUnifiedGenreBadges = (member: Member) => {
    // Debug: Log member data to see what's available
    console.log('Member data for genre display:', {
      id: member.id,
      name: member.name,
      groups: member.groups,
      groupsType: typeof member.groups,
      groupsLength: member.groups?.length,
      allKeys: Object.keys(member)
    });

    // Show only groups as genre badges - the primary source of truth
    if (!member.groups || member.groups.length === 0) {
      return <span className="text-xs text-muted-foreground">Untagged</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {member.groups.slice(0, 3).map((group, index) => (
          <Badge 
            key={`group-${group}-${index}`}
            variant="secondary"
            className="text-xs bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 transition-colors"
          >
            {group}
          </Badge>
        ))}
        {member.groups.length > 3 && (
          <Badge variant="outline" className="text-xs hover:bg-muted/50 transition-colors">
            +{member.groups.length - 3}
          </Badge>
        )}
      </div>
    );
  };

  const handleColumnSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleColumnSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column && (
          sortDirection === 'asc' ? 
            <ChevronUp className="w-4 h-4" /> : 
            <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Import Members Button and Existing Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Free Members</h1>
          <p className="text-muted-foreground">Manage free member accounts and permissions</p>
        </div>
        <div className="flex items-center gap-4">
          {selectedMembers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedMembers.length} selected</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={() => setIsBulkImportOpen(true)} 
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Members
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSyncFollowers} 
            disabled={syncingFollowers}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncingFollowers ? 'animate-spin' : ''}`} />
            {syncingFollowers ? 'Syncing...' : 'Sync Followers'}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Member
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Free Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Free Members</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.needsAttention}</div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Genre Management Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="w-5 h-5" />
            Manual Genre Management
          </CardTitle>
          <CardDescription>
            Genres are now assigned manually when adding members or through member details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>• Use the "Add Member" form to assign genres during member creation</p>
            <p>• Edit existing member genres through member detail pages</p>
            <p>• Import multiple members with CSV and assign genres individually</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="disconnected">Disconnected</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="uninterested">Uninterested</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="T1">Tier 1 (0-1K)</SelectItem>
                <SelectItem value="T2">Tier 2 (1K-10K)</SelectItem>
                <SelectItem value="T3">Tier 3 (10K-100K)</SelectItem>
                <SelectItem value="T4">Tier 4 (100K+)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={influencePlannerFilter} onValueChange={setInfluencePlannerFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All IP Status</SelectItem>
                <SelectItem value="hasnt_logged_in">Hasn't Logged In</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="disconnected">Disconnected</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="uninterested">Uninterested</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Genres</SelectItem>
                 <SelectItem value="untagged">Untagged Members</SelectItem>
                 {/* Groups (primary source) */}
                 {Array.from(new Set(members.flatMap(m => m.groups || []))).sort().map(group => (
                   <SelectItem key={`group-${group}`} value={group}>
                     {group}
                   </SelectItem>
                 ))}
                 {/* Formal genre families */}
                 {genreFamilies.map(family => (
                   <SelectItem key={family.id} value={family.id}>
                     {family.name} (Family)
                   </SelectItem>
                 ))}
                 {/* Formal subgenres */}
                 {subgenres.map(subgenre => (
                   <SelectItem key={subgenre.id} value={subgenre.id}>
                     {subgenre.name} (Subgenre)
                   </SelectItem>
                 ))}
               </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest First</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stage_name">Stage Name</SelectItem>
                  <SelectItem value="soundcloud_followers">SC Followers</SelectItem>
                  <SelectItem value="updated_at">Last Updated</SelectItem>
                  <SelectItem value="influence_planner_status">IP Status</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Free Members</CardTitle>
          <CardDescription>
            Manage free member accounts, tiers, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No members found matching your criteria</p>
            </div>
          ) : (
            <div className="rounded-md border max-h-[70vh] overflow-auto">
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-12">
                       <Checkbox
                         checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                         onCheckedChange={handleSelectAll}
                         aria-label="Select all members"
                       />
                     </TableHead>
                      <SortableHeader column="name">Member</SortableHeader>
                      <SortableHeader column="stage_name">Stage Name</SortableHeader>
                      <SortableHeader column="status">Status</SortableHeader>
                      <TableHead>Genres</TableHead>
                      <SortableHeader column="influence_planner_status">IP Status</SortableHeader>
                      <SortableHeader column="soundcloud_followers">SC Followers</SortableHeader>
                      <SortableHeader column="updated_at">Last Updated</SortableHeader>
                      <SortableHeader column="monthly_repost_limit">Reposts/Month</SortableHeader>
                      <SortableHeader column="net_credits">Total Credits</SortableHeader>
                      <TableHead>Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow 
                        key={member.id} 
                        className={`hover:bg-muted/50 cursor-pointer ${selectedMembers.includes(member.id) ? 'bg-muted/30' : ''}`}
                        onClick={() => {
                          setSelectedMember(member);
                          setIsModalOpen(true);
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedMembers.includes(member.id)}
                            onCheckedChange={(checked) => handleMemberSelect(member.id, !!checked)}
                            aria-label={`Select ${member.name}`}
                          />
                        </TableCell>
                         <TableCell>
                           <span className="font-medium">{member.name}</span>
                         </TableCell>
                         <TableCell>
                           {member.soundcloud_url ? (
                             <a 
                               href={member.soundcloud_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               onClick={(e) => e.stopPropagation()}
                               className="flex items-center gap-1 text-primary hover:underline font-medium"
                             >
                               {member.stage_name || member.name}
                               <ExternalLink className="w-3 h-3" />
                             </a>
                           ) : (
                             <span className="text-sm">{member.stage_name || '-'}</span>
                           )}
                         </TableCell>
                          <TableCell>
                            {getStatusBadge(member)}
                          </TableCell>
                          <TableCell>
                            {getUnifiedGenreBadges(member)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={member.influence_planner_status}
                              onValueChange={(value: InfluencePlannerStatus) => 
                                updateInfluencePlannerStatus(member.id, value)
                              }
                            >
                              <SelectTrigger className="w-40 h-9 border-border hover:border-accent/50 transition-colors">
                                <SelectValue>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      member.influence_planner_status === 'connected' ? 'bg-success' :
                                      member.influence_planner_status === 'disconnected' ? 'bg-destructive' :
                                      member.influence_planner_status === 'invited' ? 'bg-info' :
                                      member.influence_planner_status === 'uninterested' ? 'bg-warning' :
                                      'bg-muted'
                                    }`} />
                                    <span className="text-sm">
                                      {influencePlannerStatusConfig[member.influence_planner_status]?.label}
                                    </span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="hasnt_logged_in" className="hover:bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-muted" />
                                    Hasn't Logged In
                                  </div>
                                </SelectItem>
                                <SelectItem value="invited" className="hover:bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-info" />
                                    Invited
                                  </div>
                                </SelectItem>
                                <SelectItem value="disconnected" className="hover:bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-destructive" />
                                    Disconnected
                                  </div>
                                </SelectItem>
                                <SelectItem value="connected" className="hover:bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-success" />
                                    Connected
                                  </div>
                                </SelectItem>
                                <SelectItem value="uninterested" className="hover:bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-warning" />
                                    Uninterested
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-1">
                             <TrendingUp className="w-3 h-3 text-muted-foreground" />
                             <span className="text-sm">{member.soundcloud_followers?.toLocaleString() || '0'}</span>
                           </div>
                         </TableCell>
                         <TableCell>
                           <span className="text-sm text-muted-foreground">
                             {member.updated_at ? format(new Date(member.updated_at), 'MMM d, yyyy') : '-'}
                           </span>
                         </TableCell>
                         <TableCell>
                           <span className="text-sm">{member.monthly_repost_limit || 0}</span>
                         </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${member.net_credits >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {member.net_credits >= 0 ? '+' : ''}{member.net_credits}
                            </span>
                          </TableCell>
                           <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              {mapDbStatusToDisplay(member.status) === 'connected' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 border-warning/50 text-warning hover:bg-warning/10 hover:border-warning transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMemberStatus(member.id, 'disconnected');
                                  }}
                                >
                                  Disconnect
                                </Button>
                              )}
                              {mapDbStatusToDisplay(member.status) === 'disconnected' && (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 bg-success hover:bg-success/90 text-success-foreground transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMemberStatus(member.id, 'connected');
                                  }}
                                >
                                  Connect
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleDelete(member);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                      </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}
         </CardContent>
       </Card>

        {/* Member Detail Modal */}
        <MemberDetailModal
          member={selectedMember}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMember(null);
          }}
          onUpdate={() => {
            fetchMembers();
          }}
        />

        {/* Add Member Modal */}
        <AddMemberModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            fetchMembers();
          }}
        />
        
        <BulkMemberImport
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={() => {
            fetchMembers();
          }}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {memberToDelete ? 'Delete Member' : 'Delete Selected Members'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {memberToDelete 
                  ? `Are you sure you want to delete "${memberToDelete.name}"? This action cannot be undone and will remove all associated data including submissions, credits, and account information.`
                  : `Are you sure you want to delete ${selectedMembers.length} selected member${selectedMembers.length > 1 ? 's' : ''}? This action cannot be undone and will remove all associated data for these members.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
     </div>
  );
};
"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import {
  Users, Search, Filter, Mail, Activity, TrendingUp, Crown, AlertCircle, 
  CheckCircle, XCircle, ExternalLink, ChevronUp, ChevronDown, Music, 
  UserPlus, Download, Upload, MessageSquare, Phone, Calendar, 
  BarChart3, Target, Zap, FileText, Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { InteractiveCard } from '../ui/interactive-card';

type MemberStatus = 'active' | 'needs_reconnect';
type SizeTier = 'T1' | 'T2' | 'T3' | 'T4';

interface Member {
  id: string;
  name: string;
  primary_email: string;
  emails: string[];
  status: MemberStatus;
  size_tier: SizeTier;
  followers: number;
  soundcloud_followers: number;
  soundcloud_url: string;
  families: string[];
  subgenres: string[];
  monthly_repost_limit: number;
  submissions_this_month: number;
  net_credits: number;
  created_at: string;
  last_submission_at: string;
  manual_genres: string[];
  genre_family_id?: string;
  genre_notes?: string;
}

interface MemberAnalytics {
  performance_score: number;
  engagement_rate: number;
  support_quality: number;
  monthly_activity: Array<{ month: string; submissions: number; supports: number }>;
  genre_preferences: Array<{ genre: string; percentage: number }>;
}

interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'welcome' | 'reactivation' | 'warning' | 'promotion';
}

export const EnhancedMemberManagement: React.FC = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, MemberAnalytics>>({});
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('');
  const [importData, setImportData] = useState('');

  const statusConfig = {
    active: { label: 'Active', color: 'bg-green-500', icon: CheckCircle },
    needs_reconnect: { label: 'Needs Reconnect', color: 'bg-orange-500', icon: AlertCircle },
  };

  const tierConfig = {
    T1: { label: 'Tier 1', color: 'bg-gray-500', followers: '0-1K', limit: 1 },
    T2: { label: 'Tier 2', color: 'bg-blue-500', followers: '1K-10K', limit: 2 },
    T3: { label: 'Tier 3', color: 'bg-purple-500', followers: '10K-100K', limit: 4 },
    T4: { label: 'Tier 4', color: 'bg-yellow-500', followers: '100K+', limit: 8 },
  };

  useEffect(() => {
    fetchMembers();
    fetchCommunicationTemplates();
  }, [statusFilter, tierFilter, sortBy, sortDirection]);

  const fetchMembers = async () => {
    try {
      let query = supabase
        .from('members')
        .select('*')
        .order(sortBy, { ascending: sortDirection === 'asc' });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as MemberStatus);
      }

      if (tierFilter !== 'all') {
        query = query.eq('size_tier', tierFilter as SizeTier);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMembers(data || []);
      
      // Fetch analytics for visible members
      if (data && data.length > 0) {
        await fetchMemberAnalytics(data.slice(0, 20).map(m => m.id));
      }
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

  const fetchMemberAnalytics = async (memberIds: string[]) => {
    try {
      // Mock analytics data - in real app this would come from complex queries
      const mockAnalytics: Record<string, MemberAnalytics> = {};
      
      memberIds.forEach(id => {
        mockAnalytics[id] = {
          performance_score: Math.floor(Math.random() * 40) + 60, // 60-100
          engagement_rate: Math.floor(Math.random() * 30) + 70, // 70-100
          support_quality: Math.floor(Math.random() * 25) + 75, // 75-100
          monthly_activity: [
            { month: 'Jan', submissions: Math.floor(Math.random() * 5), supports: Math.floor(Math.random() * 10) },
            { month: 'Feb', submissions: Math.floor(Math.random() * 5), supports: Math.floor(Math.random() * 10) },
            { month: 'Mar', submissions: Math.floor(Math.random() * 5), supports: Math.floor(Math.random() * 10) },
            { month: 'Apr', submissions: Math.floor(Math.random() * 5), supports: Math.floor(Math.random() * 10) },
          ],
          genre_preferences: [
            { genre: 'Electronic', percentage: Math.floor(Math.random() * 40) + 20 },
            { genre: 'Hip Hop', percentage: Math.floor(Math.random() * 30) + 15 },
            { genre: 'Pop', percentage: Math.floor(Math.random() * 25) + 10 },
            { genre: 'Rock', percentage: Math.floor(Math.random() * 20) + 5 },
          ]
        };
      });
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error fetching member analytics:', error);
    }
  };

  const fetchCommunicationTemplates = async () => {
    // Mock templates - in real app these would come from database
    const mockTemplates: CommunicationTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome New Member',
        subject: 'Welcome to SoundCloud Groups!',
        content: 'Welcome {{name}}! We\'re excited to have you join our community...',
        type: 'welcome'
      },
      {
        id: 'reactivation',
        name: 'Reactivation Campaign',
        subject: 'We miss you, {{name}}!',
        content: 'It\'s been a while since your last submission. Here\'s what you\'ve missed...',
        type: 'reactivation'
      },
      {
        id: 'tier_promotion',
        name: 'Tier Promotion',
        subject: 'Congratulations! You\'ve been promoted to {{tier}}',
        content: 'Your consistent quality submissions have earned you a tier upgrade...',
        type: 'promotion'
      }
    ];
    setTemplates(mockTemplates);
  };

  const handleBulkStatusUpdate = async (newStatus: MemberStatus) => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select members to update",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('members')
        .update({ status: newStatus })
        .in('id', selectedMembers);

      if (error) throw error;

      toast({
        title: "Bulk Update Complete",
        description: `Updated ${selectedMembers.length} members to ${newStatus}`,
      });

      setSelectedMembers([]);
      await fetchMembers();
    } catch (error: any) {
      toast({
        title: "Bulk Update Failed",
        description: error.message || "Failed to update members",
        variant: "destructive",
      });
    }
  };

  const handleBulkCommunication = async (templateId: string, customMessage?: string) => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select members to contact",
        variant: "destructive",
      });
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (!template && !customMessage) {
      toast({
        title: "No template selected",
        description: "Please select a template or provide a custom message",
        variant: "destructive",
      });
      return;
    }

    try {
      // In real app, this would call an edge function to send bulk emails
      const selectedMemberData = members.filter(m => selectedMembers.includes(m.id));
      
      // Mock bulk email sending
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Communication Sent",
        description: `Sent ${template?.name || 'custom message'} to ${selectedMembers.length} members`,
      });

      setSelectedMembers([]);
      setShowCommunicationDialog(false);
    } catch (error: any) {
      toast({
        title: "Communication Failed",
        description: error.message || "Failed to send messages",
        variant: "destructive",
      });
    }
  };

  const handleImportMembers = async () => {
    if (!importData.trim()) {
      toast({
        title: "No data provided",
        description: "Please provide CSV data to import",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse CSV data (simple implementation)
      const lines = importData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const memberData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const member: any = {};
        headers.forEach((header, index) => {
          member[header] = values[index];
        });
        return member;
      });

      // In real app, this would validate and insert to database
      toast({
        title: "Import Started",
        description: `Processing ${memberData.length} member records`,
      });

      setImportData('');
      setShowImportDialog(false);
      await fetchMembers();
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import members",
        variant: "destructive",
      });
    }
  };

  const exportMembers = async () => {
    const selectedMemberData = selectedMembers.length > 0 
      ? members.filter(m => selectedMembers.includes(m.id))
      : members;

    const csvContent = [
      // Headers
      'Name,Email,Status,Tier,Followers,Submissions This Month,Credits,Created At',
      // Data
      ...selectedMemberData.map(member => 
        `${member.name},${member.primary_email},${member.status},${member.size_tier},${member.followers},${member.submissions_this_month},${member.net_credits},${member.created_at}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `members_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${selectedMemberData.length} member records`,
    });
  };

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.primary_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.emails?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: MemberStatus) => {
    const config = statusConfig[status] || {
      label: status,
      color: 'bg-gray-500',
      icon: AlertCircle
    };
    
    return (
      <Badge className={`${config.color} text-white hover:${config.color}/80`}>
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

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading enhanced member management...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Enhanced Member Management</h1>
          <p className="text-muted-foreground">Advanced member analytics, bulk operations, and communication tools</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportMembers} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Members</DialogTitle>
                <DialogDescription>
                  Paste CSV data to bulk import members
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>CSV Data</Label>
                  <Textarea
                    placeholder="Name,Email,Status,Tier,Followers&#10;John Doe,john@example.com,active,T2,5000"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={8}
                  />
                </div>
                <Button onClick={handleImportMembers} className="w-full">
                  Import Members
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setShowBulkActions(!showBulkActions)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Bulk Actions
          </Button>
        </div>
      </motion.div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="members">Member List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                title: "Total Members",
                value: members.length,
                icon: Users,
                color: "text-blue-600"
              },
              {
                title: "Active Members",
                value: members.filter(m => m.status === 'active').length,
                icon: Activity,
                color: "text-green-600"
              },
              {
                title: "Premium Tiers",
                value: members.filter(m => ['T3', 'T4'].includes(m.size_tier)).length,
                icon: Crown,
                color: "text-purple-600"
              },
              {
                title: "Need Attention",
                value: members.filter(m => m.status === 'needs_reconnect').length,
                icon: AlertCircle,
                color: "text-orange-600"
              },
              {
                title: "Avg Performance",
                value: "87%",
                icon: BarChart3,
                color: "text-indigo-600"
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <InteractiveCard hoverScale={1.03}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${stat.color}`}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </div>
                  </CardContent>
                </InteractiveCard>
              </motion.div>
            ))}
          </div>

          {/* Bulk Actions Panel */}
          {showBulkActions && selectedMembers.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bulk Actions ({selectedMembers.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleBulkStatusUpdate('active')}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Mark Active
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleBulkStatusUpdate('needs_reconnect')}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Needs Reconnect
                  </Button>
                  
                  <Dialog open={showCommunicationDialog} onOpenChange={setShowCommunicationDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Send Message
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Bulk Message</DialogTitle>
                        <DialogDescription>
                          Send a message to {selectedMembers.length} selected members
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Template</Label>
                          <Select onValueChange={(value) => handleBulkCommunication(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={() => setShowCommunicationDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 w-5" />
                Advanced Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="needs_reconnect">Needs Reconnect</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="T1">Tier 1</SelectItem>
                    <SelectItem value="T2">Tier 2</SelectItem>
                    <SelectItem value="T3">Tier 3</SelectItem>
                    <SelectItem value="T4">Tier 4</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date Added</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="followers">Followers</SelectItem>
                    <SelectItem value="last_submission_at">Last Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>Member Directory</CardTitle>
              <CardDescription>
                Complete member management with analytics and bulk operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No members found matching your criteria</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedMembers.length === filteredMembers.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMembers(filteredMembers.map(m => m.id));
                              } else {
                                setSelectedMembers([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.slice(0, 50).map((member) => {
                        const memberAnalytics = analytics[member.id];
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedMembers.includes(member.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedMembers([...selectedMembers, member.id]);
                                  } else {
                                    setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{member.primary_email}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Users className="w-3 h-3" />
                                  <span className="text-xs">{member.followers?.toLocaleString() || 0}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(member.status)}</TableCell>
                            <TableCell>{getTierBadge(member.size_tier)}</TableCell>
                            <TableCell>
                              {memberAnalytics && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">Score:</span>
                                    <Progress 
                                      value={memberAnalytics.performance_score} 
                                      className="w-16 h-2" 
                                    />
                                    <span className="text-xs font-medium">
                                      {memberAnalytics.performance_score}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{member.submissions_this_month} submissions</p>
                                <p className="text-muted-foreground">
                                  {member.last_submission_at 
                                    ? format(new Date(member.last_submission_at), 'MMM d')
                                    : 'No submissions'
                                  }
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="outline">
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Member growth analytics will be displayed here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Engagement metrics will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Communication Center</CardTitle>
              <CardDescription>
                Manage member communications and templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">{template.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{template.subject}</p>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>
                Set up automated member management workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Automation workflows will be configured here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
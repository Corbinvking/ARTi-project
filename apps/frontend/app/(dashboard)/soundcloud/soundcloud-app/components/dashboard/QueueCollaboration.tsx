"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, MessageSquare, Eye, Edit, Clock, CheckCircle, 
  AlertTriangle, UserPlus, Share2, History, Plus,
  Activity, Bell, Settings, Filter, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { InteractiveCard } from '../ui/interactive-card';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'moderator' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen?: string;
  currentQueue?: string;
  permissions: Permission[];
}

interface Permission {
  action: 'view' | 'edit' | 'approve' | 'publish' | 'delete';
  resource: 'queue' | 'assignment' | 'member' | 'analytics';
}

interface QueueActivity {
  id: string;
  queueId: string;
  queueName: string;
  userId: string;
  userName: string;
  action: 'created' | 'edited' | 'approved' | 'published' | 'commented' | 'assigned' | 'removed';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface QueueComment {
  id: string;
  queueId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  mentions?: string[];
  resolved: boolean;
  parentId?: string;
}

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  queueId: string;
  queueName: string;
  action: 'viewing' | 'editing' | 'reviewing';
  startedAt: string;
  cursor?: {
    position: string;
    selection?: string;
  };
}

export const QueueCollaboration: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [activities, setActivities] = useState<QueueActivity[]>([]);
  const [comments, setComments] = useState<QueueComment[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [newComment, setNewComment] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaborationUser['role']>('viewer');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCollaborationData();
    
    // Set up real-time subscriptions
    const interval = setInterval(loadCollaborationData, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadCollaborationData = async () => {
    setLoading(true);
    
    try {
      await Promise.all([
        loadActiveUsers(),
        loadRecentActivities(),
        loadQueueComments(),
        loadActiveSessions()
      ]);
    } catch (error) {
      console.error('Error loading collaboration data:', error);
      toast({
        title: "Error",
        description: "Failed to load collaboration data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveUsers = async () => {
    // Mock active users - in production this would come from database
    const mockUsers: CollaborationUser[] = [
      {
        id: 'user_1',
        name: 'Sarah Chen',
        email: 'sarah@example.com',
        avatar: '/avatars/sarah.jpg',
        role: 'admin',
        isOnline: true,
        currentQueue: 'queue_2024_01_20',
        permissions: [
          { action: 'view', resource: 'queue' },
          { action: 'edit', resource: 'queue' },
          { action: 'approve', resource: 'queue' },
          { action: 'publish', resource: 'queue' },
          { action: 'delete', resource: 'queue' }
        ]
      },
      {
        id: 'user_2',
        name: 'Mike Rodriguez',
        email: 'mike@example.com',
        avatar: '/avatars/mike.jpg',
        role: 'moderator',
        isOnline: true,
        currentQueue: 'queue_2024_01_20',
        permissions: [
          { action: 'view', resource: 'queue' },
          { action: 'edit', resource: 'queue' },
          { action: 'approve', resource: 'queue' }
        ]
      },
      {
        id: 'user_3',
        name: 'Emma Thompson',
        email: 'emma@example.com',
        avatar: '/avatars/emma.jpg',
        role: 'editor',
        isOnline: false,
        lastSeen: new Date(Date.now() - 1800000).toISOString(),
        permissions: [
          { action: 'view', resource: 'queue' },
          { action: 'edit', resource: 'queue' }
        ]
      },
      {
        id: 'user_4',
        name: 'David Park',
        email: 'david@example.com',
        role: 'viewer',
        isOnline: true,
        currentQueue: 'queue_2024_01_19',
        permissions: [
          { action: 'view', resource: 'queue' }
        ]
      }
    ];
    
    setActiveUsers(mockUsers);
  };

  const loadRecentActivities = async () => {
    // Mock recent activities
    const mockActivities: QueueActivity[] = [
      {
        id: 'activity_1',
        queueId: 'queue_2024_01_20',
        queueName: 'Queue - Jan 20, 2024',
        userId: 'user_1',
        userName: 'Sarah Chen',
        action: 'approved',
        description: 'Approved queue with 45 assignments',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        metadata: { assignmentsCount: 45 }
      },
      {
        id: 'activity_2',
        queueId: 'queue_2024_01_20',
        queueName: 'Queue - Jan 20, 2024',
        userId: 'user_2',
        userName: 'Mike Rodriguez',
        action: 'edited',
        description: 'Reordered assignments for better genre balance',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        metadata: { changesCount: 8 }
      },
      {
        id: 'activity_3',
        queueId: 'queue_2024_01_20',
        queueName: 'Queue - Jan 20, 2024',
        userId: 'user_2',
        userName: 'Mike Rodriguez',
        action: 'commented',
        description: 'Added comment about genre clustering concern',
        timestamp: new Date(Date.now() - 1200000).toISOString()
      },
      {
        id: 'activity_4',
        queueId: 'queue_2024_01_19',
        queueName: 'Queue - Jan 19, 2024',
        userId: 'user_1',
        userName: 'Sarah Chen',
        action: 'published',
        description: 'Published queue to members',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        metadata: { notificationsSent: 42 }
      },
      {
        id: 'activity_5',
        queueId: 'queue_2024_01_19',
        queueName: 'Queue - Jan 19, 2024',
        userId: 'user_3',
        userName: 'Emma Thompson',
        action: 'assigned',
        description: 'Added 3 new member assignments',
        timestamp: new Date(Date.now() - 90000000).toISOString(),
        metadata: { newAssignments: 3 }
      }
    ];
    
    setActivities(mockActivities);
  };

  const loadQueueComments = async () => {
    // Mock queue comments
    const mockComments: QueueComment[] = [
      {
        id: 'comment_1',
        queueId: 'queue_2024_01_20',
        userId: 'user_2',
        userName: 'Mike Rodriguez',
        userAvatar: '/avatars/mike.jpg',
        content: 'I noticed some genre clustering around positions 15-18. Should we redistribute these tracks?',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        resolved: false
      },
      {
        id: 'comment_2',
        queueId: 'queue_2024_01_20',
        userId: 'user_1',
        userName: 'Sarah Chen',
        userAvatar: '/avatars/sarah.jpg',
        content: 'Good catch! I\'ll run the optimization algorithm to fix that clustering issue.',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        parentId: 'comment_1',
        resolved: false
      },
      {
        id: 'comment_3',
        queueId: 'queue_2024_01_19',
        userId: 'user_3',
        userName: 'Emma Thompson',
        userAvatar: '/avatars/emma.jpg',
        content: 'The electronic music placement looks great in this queue. Good job team!',
        timestamp: new Date(Date.now() - 86700000).toISOString(),
        resolved: true
      }
    ];
    
    setComments(mockComments);
  };

  const loadActiveSessions = async () => {
    // Mock active editing sessions
    const mockSessions: ActiveSession[] = [
      {
        id: 'session_1',
        userId: 'user_1',
        userName: 'Sarah Chen',
        queueId: 'queue_2024_01_20',
        queueName: 'Queue - Jan 20, 2024',
        action: 'editing',
        startedAt: new Date(Date.now() - 1800000).toISOString(),
        cursor: {
          position: 'assignment_15',
          selection: 'positions_15_18'
        }
      },
      {
        id: 'session_2',
        userId: 'user_2',
        userName: 'Mike Rodriguez',
        queueId: 'queue_2024_01_20',
        queueName: 'Queue - Jan 20, 2024',
        action: 'reviewing',
        startedAt: new Date(Date.now() - 600000).toISOString()
      },
      {
        id: 'session_3',
        userId: 'user_4',
        userName: 'David Park',
        queueId: 'queue_2024_01_19',
        queueName: 'Queue - Jan 19, 2024',
        action: 'viewing',
        startedAt: new Date(Date.now() - 300000).toISOString()
      }
    ];
    
    setActiveSessions(mockSessions);
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    // Simulate sending invitation
    const newUser: CollaborationUser = {
      id: `user_${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      isOnline: false,
      permissions: getPermissionsForRole(inviteRole)
    };

    setActiveUsers(prev => [...prev, newUser]);
    setShowInviteDialog(false);
    setInviteEmail('');
    setInviteRole('viewer');

    toast({
      title: "Invitation Sent",
      description: `Invitation sent to ${inviteEmail}`
    });
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedQueue) {
      return;
    }

    const comment: QueueComment = {
      id: `comment_${Date.now()}`,
      queueId: selectedQueue,
      userId: 'current_user',
      userName: 'Current User',
      content: newComment,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');

    toast({
      title: "Comment Added",
      description: "Your comment has been posted"
    });
  };

  const getPermissionsForRole = (role: CollaborationUser['role']): Permission[] => {
    const basePermissions: Record<string, Permission[]> = {
      admin: [
        { action: 'view', resource: 'queue' },
        { action: 'edit', resource: 'queue' },
        { action: 'approve', resource: 'queue' },
        { action: 'publish', resource: 'queue' },
        { action: 'delete', resource: 'queue' }
      ],
      moderator: [
        { action: 'view', resource: 'queue' },
        { action: 'edit', resource: 'queue' },
        { action: 'approve', resource: 'queue' }
      ],
      editor: [
        { action: 'view', resource: 'queue' },
        { action: 'edit', resource: 'queue' }
      ],
      viewer: [
        { action: 'view', resource: 'queue' }
      ]
    };

    return basePermissions[role] || [];
  };

  const getActionIcon = (action: QueueActivity['action']) => {
    switch (action) {
      case 'created': return <Plus className="h-3 w-3 text-blue-500" />;
      case 'edited': return <Edit className="h-3 w-3 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'published': return <Share2 className="h-3 w-3 text-purple-500" />;
      case 'commented': return <MessageSquare className="h-3 w-3 text-blue-500" />;
      case 'assigned': return <UserPlus className="h-3 w-3 text-green-500" />;
      case 'removed': return <AlertTriangle className="h-3 w-3 text-red-500" />;
    }
  };

  const getRoleBadgeColor = (role: CollaborationUser['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-blue-100 text-blue-800';
      case 'editor': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionActionColor = (action: ActiveSession['action']) => {
    switch (action) {
      case 'editing': return 'text-yellow-600 bg-yellow-50';
      case 'reviewing': return 'text-blue-600 bg-blue-50';
      case 'viewing': return 'text-green-600 bg-green-50';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (activityFilter === 'all') return true;
    return activity.action === activityFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading collaboration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-3xl font-bold">Queue Collaboration</h1>
          <p className="text-muted-foreground">
            Multi-user editing, real-time updates, and team coordination
          </p>
        </div>
        
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Add a new team member to collaborate on queue management
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={inviteUser} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Online Users', 
            value: activeUsers.filter(u => u.isOnline).length, 
            icon: Users,
            color: 'text-green-500'
          },
          { 
            label: 'Active Sessions', 
            value: activeSessions.length, 
            icon: Activity,
            color: 'text-blue-500'
          },
          { 
            label: 'Recent Comments', 
            value: comments.filter(c => !c.resolved).length, 
            icon: MessageSquare,
            color: 'text-yellow-500'
          },
          { 
            label: 'Today\'s Activities', 
            value: activities.filter(a => 
              new Date(a.timestamp).toDateString() === new Date().toDateString()
            ).length, 
            icon: Clock,
            color: 'text-purple-500'
          }
        ].map((stat, index) => (
          <InteractiveCard key={stat.label} hoverScale={1.03}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </InteractiveCard>
        ))}
      </div>

      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="users">Team Members</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search activities..." className="pl-9" />
              </div>
            </div>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="edited">Edited</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="commented">Commented</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Team actions and queue modifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{activity.userName}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {activity.queueName}
                        </Badge>
                        {activity.metadata && (
                          <span className="text-xs text-muted-foreground">
                            {Object.entries(activity.metadata).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage team access and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Activity</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-sm">{user.isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.currentQueue ? (
                          <Badge variant="outline" className="text-xs">
                            {user.currentQueue.replace('queue_', '').replace(/_/g, '/')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {user.isOnline ? 'Now' : user.lastSeen ? 
                            formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true }) : 
                            'Never'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Editing Sessions</CardTitle>
              <CardDescription>Real-time collaboration and editing status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{session.userName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{session.userName}</span>
                          <Badge className={`text-xs ${getSessionActionColor(session.action)}`}>
                            {session.action}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{session.queueName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Started {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
                      </p>
                      {session.cursor && (
                        <p className="text-xs text-muted-foreground">
                          Position: {session.cursor.position}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {activeSessions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No active editing sessions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Queue Comments</CardTitle>
                <CardDescription>Team discussions and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.userAvatar} />
                          <AvatarFallback>{comment.userName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                            </span>
                            {comment.resolved && (
                              <Badge variant="outline" className="text-xs">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          {comment.parentId && (
                            <div className="mt-2 pl-3 border-l-2 border-muted">
                              <p className="text-xs text-muted-foreground">Reply to previous comment</p>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Comment</CardTitle>
                <CardDescription>Share feedback or ask questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="queue-select">Queue</Label>
                  <Select value={selectedQueue} onValueChange={setSelectedQueue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select queue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="queue_2024_01_20">Queue - Jan 20, 2024</SelectItem>
                      <SelectItem value="queue_2024_01_19">Queue - Jan 19, 2024</SelectItem>
                      <SelectItem value="queue_2024_01_18">Queue - Jan 18, 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="comment-text">Comment</Label>
                  <Textarea
                    id="comment-text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts or feedback..."
                    rows={4}
                  />
                </div>
                
                <Button onClick={addComment} className="w-full" disabled={!newComment.trim() || !selectedQueue}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Post Comment
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
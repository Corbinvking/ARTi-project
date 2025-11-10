"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Wifi,
  WifiOff,
  Users,
  Tag
} from 'lucide-react';

interface HealthMetrics {
  totalMembers: number;
  activeConnections: number;
  disconnectedMembers: number;
  untaggedMembers: number;
  overallHealth: number;
}

export const HealthPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealthMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch member data to calculate metrics
      const { data: members, error } = await supabase
        .from('members')
        .select('status, families');

      if (error) throw error;

      const totalMembers = members?.length || 0;
      const activeConnections = members?.filter(m => m.status === 'active').length || 0;
      const disconnectedMembers = members?.filter(m => m.status === 'needs_reconnect').length || 0;
      const untaggedMembers = members?.filter(m => !m.families || m.families.length === 0).length || 0;
      
      // Calculate overall health percentage
      const healthScore = totalMembers > 0 
        ? Math.round(((activeConnections / totalMembers) * 100))
        : 100;

      setMetrics({
        totalMembers,
        activeConnections,
        disconnectedMembers,
        untaggedMembers,
        overallHealth: healthScore
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch health metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();
  }, []);

  const handleCardClick = (filterType: string) => {
    switch (filterType) {
      case 'connections':
        router.push('/soundcloud/dashboard/members?status=connected');
        break;
      case 'untagged':
        router.push('/soundcloud/dashboard/members?genre=untagged');
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Health</h1>
          <p className="text-muted-foreground">
            Connection status, untagged members, and capacity warnings
          </p>
        </div>
        <Button onClick={fetchHealthMetrics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Overall Health Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {loading ? "..." : `${metrics?.overallHealth || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              System operational
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => handleCardClick('connections')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : metrics?.activeConnections || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "..." : `${metrics?.disconnectedMembers || 0} disconnected`}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => handleCardClick('untagged')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Untagged Members</CardTitle>
            <Tag className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? "..." : metrics?.untaggedMembers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Need genre classification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Capacity</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">85%</div>
            <p className="text-xs text-muted-foreground">
              Consider expanding
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Active Alerts
          </CardTitle>
          <CardDescription>
            Issues requiring immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>3 SoundCloud connections have failed - affecting member reach capacity</span>
              <Button size="sm" variant="secondary">Fix Now</Button>
            </AlertDescription>
          </Alert>
          
            <Alert>
            <Tag className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{loading ? "..." : metrics?.untaggedMembers || 0} members need genre classification - impacting targeting accuracy</span>
              <Button size="sm" variant="secondary" onClick={() => handleCardClick('untagged')}>Classify</Button>
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Queue capacity at 85% - may cause scheduling delays</span>
              <Button size="sm" variant="secondary">Expand</Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-green-500" />
              Connection Status
            </CardTitle>
            <CardDescription>
              Real-time status of member integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">SoundCloud API</p>
                    <p className="text-sm text-muted-foreground">{loading ? "..." : metrics?.activeConnections || 0} connections active</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Online</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="font-medium">Failed Connections</p>
                    <p className="text-sm text-muted-foreground">{loading ? "..." : metrics?.disconnectedMembers || 0} members disconnected</p>
                  </div>
                </div>
                <Badge variant="destructive">Issues</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="font-medium">Spotify Integration</p>
                    <p className="text-sm text-muted-foreground">Rate limiting active</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Limited</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Member Classifications
            </CardTitle>
            <CardDescription>
              Genre tagging and member categorization status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Properly Tagged</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                  <span className="text-sm text-muted-foreground">{loading ? "..." : (metrics?.totalMembers || 0) - (metrics?.untaggedMembers || 0)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Partially Tagged</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                  </div>
                  <span className="text-sm text-muted-foreground">27</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Untagged</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                  </div>
                  <span className="text-sm text-muted-foreground">{loading ? "..." : metrics?.untaggedMembers || 0}</span>
                </div>
              </div>
            </div>
            
            <Button className="w-full" variant="outline" onClick={() => handleCardClick('untagged')}>
              <Tag className="h-4 w-4 mr-2" />
              Bulk Classify Members
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
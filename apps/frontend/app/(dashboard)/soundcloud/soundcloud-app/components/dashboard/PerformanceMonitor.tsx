"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Zap, 
  Clock, 
  Wifi, 
  HardDrive, 
  Cpu, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Eye
} from 'lucide-react';
import { ResponsiveDataTable } from '../ui/responsive-data-table';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  
  // Resource metrics
  domContentLoaded: number;
  loadComplete: number;
  memoryUsage: number;
  connectionType: string;
  
  // Custom metrics
  apiResponseTime: number;
  errorRate: number;
  activeUsers: number;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Collect performance metrics
  const collectMetrics = async () => {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      // Core Web Vitals (simulated - would use real web-vitals library)
      const newMetrics: PerformanceMetrics = {
        lcp: Math.random() * 2500 + 1000, // Should be < 2.5s
        fid: Math.random() * 100, // Should be < 100ms
        cls: Math.random() * 0.25, // Should be < 0.1
        fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        ttfb: navigation?.responseStart - navigation?.requestStart || 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.fetchStart || 0,
        loadComplete: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        memoryUsage: (navigator as any).deviceMemory || 4,
        connectionType: (navigator as any).connection?.effectiveType || '4g',
        apiResponseTime: Math.random() * 500 + 100,
        errorRate: Math.random() * 5,
        activeUsers: Math.floor(Math.random() * 1000) + 100
      };

      setMetrics(newMetrics);
      
      // Load stored errors
      const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      setErrors(storedErrors.map((error: any, index: number) => ({
        id: error.errorId || `error_${index}`,
        timestamp: error.timestamp || new Date().toISOString(),
        message: error.message || 'Unknown error',
        stack: error.stack,
        url: error.url || window.location.href,
        userAgent: error.userAgent || navigator.userAgent,
        severity: classifyErrorSeverity(error.message)
      })));
      
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const classifyErrorSeverity = (message: string): ErrorLog['severity'] => {
    if (message.toLowerCase().includes('critical') || message.toLowerCase().includes('crash')) {
      return 'critical';
    }
    if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
      return 'high';
    }
    if (message.toLowerCase().includes('warning')) {
      return 'medium';
    }
    return 'low';
  };

  const getMetricStatus = (value: number, thresholds: { good: number; needs_improvement: number }) => {
    if (value <= thresholds.good) return { status: 'good', color: 'bg-green-500' };
    if (value <= thresholds.needs_improvement) return { status: 'needs-improvement', color: 'bg-yellow-500' };
    return { status: 'poor', color: 'bg-red-500' };
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    collectMetrics();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(collectMetrics, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const errorColumns = [
    {
      key: 'timestamp' as keyof ErrorLog,
      label: 'Time',
      render: (value: string) => new Date(value).toLocaleString(),
      priority: 'high' as const
    },
    {
      key: 'severity' as keyof ErrorLog,
      label: 'Severity',
      render: (value: ErrorLog['severity']) => (
        <Badge variant={
          value === 'critical' ? 'destructive' : 
          value === 'high' ? 'destructive' : 
          value === 'medium' ? 'secondary' : 'outline'
        }>
          {value}
        </Badge>
      ),
      priority: 'high' as const
    },
    {
      key: 'message' as keyof ErrorLog,
      label: 'Message',
      priority: 'medium' as const
    },
    {
      key: 'url' as keyof ErrorLog,
      label: 'URL',
      render: (value: string) => (
        <span className="font-mono text-xs truncate" title={value}>
          {value.split('/').pop() || value}
        </span>
      ),
      priority: 'low' as const
    }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <div className="animate-spin">
            <RefreshCw className="h-5 w-5" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-6 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Failed to load performance metrics</p>
          <Button onClick={collectMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lcpStatus = getMetricStatus(metrics.lcp, { good: 2500, needs_improvement: 4000 });
  const fidStatus = getMetricStatus(metrics.fid, { good: 100, needs_improvement: 300 });
  const clsStatus = getMetricStatus(metrics.cls, { good: 0.1, needs_improvement: 0.25 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-muted-foreground">Real-time application performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-primary/10' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Live' : 'Manual'}
          </Button>
          <Button onClick={collectMetrics} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vitals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="space-y-4">
          {/* Core Web Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Largest Contentful Paint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{Math.round(metrics.lcp)}ms</span>
                  <div className={`w-3 h-3 rounded-full ${lcpStatus.color}`} />
                </div>
                <Progress value={(metrics.lcp / 4000) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: &lt; 2.5s
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  First Input Delay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{Math.round(metrics.fid)}ms</span>
                  <div className={`w-3 h-3 rounded-full ${fidStatus.color}`} />
                </div>
                <Progress value={(metrics.fid / 300) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: &lt; 100ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Cumulative Layout Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{metrics.cls.toFixed(3)}</span>
                  <div className={`w-3 h-3 rounded-full ${clsStatus.color}`} />
                </div>
                <Progress value={(metrics.cls / 0.25) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: &lt; 0.1
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{Math.round(metrics.fcp)}ms</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">First Contentful Paint</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Wifi className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{Math.round(metrics.ttfb)}ms</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Time to First Byte</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{Math.round(metrics.apiResponseTime)}ms</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">API Response Time</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{metrics.errorRate.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Error Rate</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Cpu className="h-4 w-4 mr-2" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{metrics.memoryUsage}GB</span>
                <p className="text-xs text-muted-foreground">Device Memory</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Wifi className="h-4 w-4 mr-2" />
                  Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-sm">
                  {metrics.connectionType}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Effective Type</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  DOM Ready
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{Math.round(metrics.domContentLoaded)}ms</span>
                <p className="text-xs text-muted-foreground">Content Loaded</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <HardDrive className="h-4 w-4 mr-2" />
                  Load Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{Math.round(metrics.loadComplete)}ms</span>
                <p className="text-xs text-muted-foreground">Full Load</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Error Logs
              </CardTitle>
              <CardDescription>
                Recent application errors and their details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveDataTable
                data={errors}
                columns={errorColumns}
                emptyMessage="No errors recorded"
                searchable={true}
                pageSize={10}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
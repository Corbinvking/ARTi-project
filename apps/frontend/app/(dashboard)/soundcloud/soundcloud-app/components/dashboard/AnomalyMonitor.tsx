"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  Zap, 
  Settings,
  Play,
  Pause,
  RefreshCw,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAnomalyDetection } from '../../hooks/useAnomalyDetection';
import { useToast } from '../../hooks/use-toast';

export const AnomalyMonitor = () => {
  const { toast } = useToast();
  const {
    thresholds,
    anomalies,
    anomalyStats,
    loading,
    runAnomalyDetection,
    updateAnomalyStatus,
    updateThreshold,
    removeThreshold
  } = useAnomalyDetection();

  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [autoDetection, setAutoDetection] = useState(true);

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: { variant: 'destructive' as const, icon: AlertTriangle },
      high: { variant: 'destructive' as const, icon: TrendingDown },
      medium: { variant: 'default' as const, icon: Clock },
      low: { variant: 'secondary' as const, icon: CheckCircle }
    };
    
    const config = variants[severity as keyof typeof variants] || variants.low;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'acknowledged': return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ignored': return <EyeOff className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const filteredAnomalies = anomalies.filter(anomaly => {
    const severityMatch = selectedSeverity === 'all' || anomaly.severity === selectedSeverity;
    const statusMatch = selectedStatus === 'all' || anomaly.status === selectedStatus;
    return severityMatch && statusMatch;
  });

  const handleRunDetection = async () => {
    toast({
      title: "Running Anomaly Detection",
      description: "Analyzing metrics for unusual patterns...",
    });
    
    await runAnomalyDetection();
    
    toast({
      title: "Detection Complete",
      description: `Found ${anomalyStats.byStatus.new} new anomalies`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Anomaly Monitor</h2>
          <p className="text-muted-foreground">
            Automated detection and alerting for unusual system behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Switch 
              checked={autoDetection} 
              onCheckedChange={setAutoDetection}
            />
            <Label>Auto Detection</Label>
          </div>
          <Button onClick={handleRunDetection} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Detection
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Anomalies</p>
                <p className="text-2xl font-bold">
                  {(anomalyStats.total).toLocaleString()}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-500">
                  {(anomalyStats.bySeverity.critical).toLocaleString()}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Alerts</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {(anomalyStats.byStatus.new).toLocaleString()}
                </p>
              </div>
              <Bell className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-500">
                  {(anomalyStats.byStatus.resolved).toLocaleString()}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="anomalies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="anomalies">Active Anomalies</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="anomalies" className="space-y-4">
          {/* Critical Anomalies Alert */}
          {anomalyStats.bySeverity.critical > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Anomalies Detected</AlertTitle>
              <AlertDescription>
                {anomalyStats.bySeverity.critical} critical anomalies require immediate attention
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label>Severity:</Label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Anomaly List */}
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredAnomalies.map((anomaly) => (
                <Card key={anomaly.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(anomaly.status)}
                          <h4 className="font-medium">{anomaly.metric_name.replace(/_/g, ' ').toUpperCase()}</h4>
                          {getSeverityBadge(anomaly.severity)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span>Current: <strong>{anomaly.current_value.toFixed(2)}</strong></span>
                          <span>Expected: <strong>{anomaly.expected_value.toFixed(2)}</strong></span>
                          <span>Deviation: <strong className="text-red-500">{anomaly.deviation_percentage.toFixed(1)}%</strong></span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Detected {formatTimestamp(anomaly.detected_at)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {anomaly.status === 'new' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateAnomalyStatus(anomaly.id, 'acknowledged')}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {anomaly.status === 'acknowledged' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => updateAnomalyStatus(anomaly.id, 'resolved')}
                          >
                            Resolve
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => updateAnomalyStatus(anomaly.id, 'ignored')}
                        >
                          Ignore
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredAnomalies.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No anomalies detected</h3>
                  <p className="text-muted-foreground">All metrics are within normal ranges</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Detection Thresholds
              </CardTitle>
              <CardDescription>
                Configure automatic anomaly detection rules and sensitivity levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {thresholds.map((threshold) => (
                  <div key={threshold.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{threshold.metric_name.replace(/_/g, ' ').toUpperCase()}</h4>
                        <p className="text-sm text-muted-foreground">{threshold.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={threshold.enabled}
                          onCheckedChange={(enabled) => 
                            updateThreshold({ ...threshold, enabled })
                          }
                        />
                        {getSeverityBadge(threshold.severity)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <p className="font-medium">{threshold.threshold_type.replace('_', ' ').toUpperCase()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Threshold</Label>
                        <p className="font-medium">{threshold.threshold_value}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Period</Label>
                        <p className="font-medium">{threshold.comparison_period}</p>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeThreshold(threshold.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Detection History</CardTitle>
              <CardDescription>
                Historical view of all anomaly detections and resolutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">History Coming Soon</h3>
                <p className="text-muted-foreground">
                  Detailed anomaly history and trend analysis will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
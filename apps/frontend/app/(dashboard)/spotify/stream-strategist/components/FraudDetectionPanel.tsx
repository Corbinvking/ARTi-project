"use client"

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  Activity,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { 
  useFraudDetectionAlerts, 
  useAnalyzeStreamPatterns,
  useResolveFraudAlert,
  FraudDetectionAlert 
} from "../hooks/useFraudDetection";
import { Skeleton } from "./ui/skeleton";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Textarea } from "./ui/textarea";

interface FraudDetectionPanelProps {
  campaignId?: string;
  vendorId?: string;
  playlistId?: string;
}

const FraudDetectionPanel: React.FC<FraudDetectionPanelProps> = ({
  campaignId,
  vendorId,
  playlistId,
}) => {
  const { data: alerts, isLoading } = useFraudDetectionAlerts('open');
  const analyzePatterns = useAnalyzeStreamPatterns();
  const resolveAlert = useResolveFraudAlert();
  const [selectedAlert, setSelectedAlert] = React.useState<FraudDetectionAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = React.useState('');

  const getSeverityColor = (severity: FraudDetectionAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityBadge = (severity: FraudDetectionAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getAlertTypeIcon = (alertType: FraudDetectionAlert['alert_type']) => {
    switch (alertType) {
      case 'suspicious_streams':
        return <AlertTriangle className="h-4 w-4" />;
      case 'velocity_anomaly':
        return <TrendingUp className="h-4 w-4" />;
      case 'pattern_irregularity':
        return <Activity className="h-4 w-4" />;
      case 'vendor_behavior':
        return <Shield className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleAnalyzePatterns = async () => {
    await analyzePatterns.mutateAsync({
      campaignId,
      vendorId,
      playlistId,
    });
  };

  const handleResolveAlert = async (status: 'resolved' | 'false_positive') => {
    if (!selectedAlert) return;
    
    await resolveAlert.mutateAsync({
      id: selectedAlert.id,
      status,
      resolution_notes: resolutionNotes,
    });
    
    setSelectedAlert(null);
    setResolutionNotes('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Fraud Detection</span>
        </CardTitle>
        <CardDescription>
          Monitor and analyze suspicious stream patterns and vendor behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyzePatterns}
            disabled={analyzePatterns.isPending}
          >
            <Activity className="h-4 w-4 mr-2" />
            Analyze Patterns
          </Button>
        </div>

        {alerts && alerts.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-medium">Active Fraud Alerts</h4>
            {alerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getAlertTypeIcon(alert.alert_type)}
                    <span className="font-medium capitalize">
                      {alert.alert_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getSeverityBadge(alert.severity)}
                    {alert.confidence_score && (
                      <Badge variant="outline">
                        {Math.round(alert.confidence_score * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mb-3">
                  <p>Detected on {format(new Date(alert.created_at), 'MMM d, yyyy')}</p>
                </div>

                {alert.detection_data && (
                  <div className="mb-3 p-3 bg-background rounded-md">
                    <p className="text-sm font-medium mb-2">Detection Details:</p>
                    <div className="text-xs space-y-1">
                      {alert.detection_data.pattern_indicators && Object.entries(alert.detection_data.pattern_indicators).map(([key, value]: [string, any]) => (
                        value && (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace('_', ' ')}:</span>
                            <span>{typeof value === 'number' ? Math.round(value * 100) + '%' : value}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Review Fraud Alert</DialogTitle>
                        <DialogDescription>
                          Review and resolve this fraud detection alert
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Alert Details</h4>
                          <div className="text-sm space-y-1">
                            <p><strong>Type:</strong> {alert.alert_type.replace('_', ' ')}</p>
                            <p><strong>Severity:</strong> {alert.severity}</p>
                            <p><strong>Confidence:</strong> {alert.confidence_score ? Math.round(alert.confidence_score * 100) + '%' : 'N/A'}</p>
                            <p><strong>Detected:</strong> {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}</p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Resolution Notes</label>
                          <Textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Add notes about your investigation and resolution..."
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleResolveAlert('resolved')}
                            disabled={resolveAlert.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Resolved
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleResolveAlert('false_positive')}
                            disabled={resolveAlert.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            False Positive
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Shield className="mx-auto h-12 w-12 mb-4" />
            <p>No active fraud alerts</p>
            <p className="text-sm">All systems appear to be running normally</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FraudDetectionPanel;









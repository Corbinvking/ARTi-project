import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSystemHealth } from "../../hooks/useSystemHealth";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Mail, 
  PlayCircle, 
  RefreshCw, 
  Server,
  Loader2 
} from "lucide-react";

export function SystemHealthDashboard() {
  const { healthStatus, isLoading, checkSystemHealth, runDataQualityCheck } = useSystemHealth();
  const [runningDataCheck, setRunningDataCheck] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'down':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'degraded':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'down':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getServiceIcon = (functionName: string) => {
    switch (functionName) {
      case 'database_connection':
        return <Database className="w-4 h-4" />;
      case 'youtube_api':
        return <PlayCircle className="w-4 h-4" />;
      case 'email_service':
        return <Mail className="w-4 h-4" />;
      default:
        return <Server className="w-4 h-4" />;
    }
  };

  const handleDataQualityCheck = async () => {
    setRunningDataCheck(true);
    try {
      await runDataQualityCheck();
    } finally {
      setRunningDataCheck(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">System Health</h2>
          <p className="text-muted-foreground">
            Monitor system performance and data integrity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDataQualityCheck}
            disabled={runningDataCheck}
            variant="outline"
          >
            {runningDataCheck ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Activity className="w-4 h-4 mr-2" />
            )}
            Data Quality Check
          </Button>
          <Button
            onClick={checkSystemHealth}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(healthStatus.overall_status)}
              System Status
              <Badge className={getStatusColor(healthStatus.overall_status)}>
                {healthStatus.overall_status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {healthStatus.summary.healthy}
                </div>
                <div className="text-sm text-muted-foreground">Healthy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {healthStatus.summary.degraded}
                </div>
                <div className="text-sm text-muted-foreground">Degraded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {healthStatus.summary.down}
                </div>
                <div className="text-sm text-muted-foreground">Down</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {healthStatus.summary.total_services}
                </div>
                <div className="text-sm text-muted-foreground">Total Services</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Last checked: {new Date(healthStatus.timestamp).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Status Details */}
      {healthStatus && healthStatus.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthStatus.results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getServiceIcon(result.function_name)}
                    <div>
                      <div className="font-medium">
                        {result.function_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      {result.error_message && (
                        <div className="text-sm text-red-600">{result.error_message}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {result.response_time_ms}ms
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">YouTube URL Validation</h4>
              <p className="text-sm text-muted-foreground">
                ✅ Automatic URL format validation<br/>
                ✅ Video ID extraction and verification<br/>
                ✅ Duplicate campaign prevention
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Pricing Tier Validation</h4>
              <p className="text-sm text-muted-foreground">
                ✅ Gap detection in view ranges<br/>
                ✅ Overlap prevention<br/>
                ✅ Logical tier ordering
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monitoring Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Health Monitoring</h4>
              <p className="text-sm text-muted-foreground">
                ✅ Database connectivity checks<br/>
                ✅ Edge function health monitoring<br/>
                ✅ External API status (YouTube, Resend)
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Data Quality Checks</h4>
              <p className="text-sm text-muted-foreground">
                ✅ Orphaned record detection<br/>
                ✅ Data completeness validation<br/>
                ✅ Date consistency checks
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && !healthStatus && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Running system health check...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
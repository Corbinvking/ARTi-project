import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { usePerformanceAlerts } from "../hooks/usePerformanceAlerts";
import { AlertTriangle, CheckCircle, Clock, Bell, Settings, ExternalLink } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

interface AlertsCenterProps {
  onCampaignClick?: (campaignId: string) => void;
}

export const AlertsCenter = ({ onCampaignClick }: AlertsCenterProps) => {
  const { data, isLoading, error } = usePerformanceAlerts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load alerts data</p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.summary.critical}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data.summary.high}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.summary.resolved}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Alerts</CardTitle>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Alert Settings
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {data.alerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="mt-1">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{alert.message}</p>
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Campaign: {alert.campaignName} • {alert.timeAgo}
                  </p>
                  {alert.threshold && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Threshold: {alert.threshold} • Current: {alert.currentValue}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  {onCampaignClick && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onCampaignClick(alert.campaignId)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {data.alerts.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No active alerts</p>
                <p className="text-sm text-muted-foreground">All campaigns are performing well</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {data.alertRules.map((rule) => (
              <div key={rule.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{rule.name}</h4>
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{rule.condition}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Triggered: {rule.triggeredCount} times
                  </span>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};








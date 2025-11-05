import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWorkflowOrchestration, type DeadlineAlert } from '../hooks/useWorkflowOrchestration';
import { format } from 'date-fns';

export const WorkflowAlerts = () => {
  const { checkDeadlineAlerts } = useWorkflowOrchestration();
  const [alerts, setAlerts] = useState<DeadlineAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlerts();
    // Refresh alerts every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const deadlineAlerts = await checkDeadlineAlerts();
      setAlerts(deadlineAlerts);
    } catch (error) {
      console.error('Error loading workflow alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: DeadlineAlert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: DeadlineAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const criticalAlerts = alerts.filter(a => a.type === 'critical' || a.type === 'overdue');

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative"
          onClick={() => !isOpen && loadAlerts()}
        >
          <Bell className="h-4 w-4" />
          {criticalAlerts.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {criticalAlerts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Workflow Alerts</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadAlerts}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground">No urgent deadlines</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {alerts.map(alert => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between space-x-2">
                      <div className="flex items-start space-x-2 flex-1">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {alert.creatorHandle}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {alert.campaignName}
                          </div>
                          <div className="text-xs font-medium mt-1">
                            {alert.message}
                          </div>
                        </div>
                      </div>
                      <Badge variant={getBadgeVariant(alert.type)} className="text-xs">
                        {alert.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {alerts.length > 0 && (
            <div className="border-t pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to workflow page - you might want to use useNavigate here
                  window.location.href = '/workflow';
                }}
              >
                View All in Workflow Dashboard
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
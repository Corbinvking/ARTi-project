import { useState, useEffect } from 'react';
import { supabase } from "../integrations/supabase/client";
import { useToast } from './use-toast';

interface HealthCheckResult {
  function_name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  error_message?: string;
}

interface SystemHealthStatus {
  overall_status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  results: HealthCheckResult[];
  summary: {
    total_services: number;
    healthy: number;
    degraded: number;
    down: number;
  };
}

export function useSystemHealth() {
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const checkSystemHealth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('system_health_check');
      
      if (error) {
        throw new Error(error.message || 'Failed to check system health');
      }
      
      setHealthStatus(data);
      
      // Show toast for critical issues
      if (data.overall_status === 'down') {
        toast({
          variant: "destructive",
          title: "System Health Critical",
          description: `${data.summary.down} service(s) are down. Check the dashboard for details.`,
        });
      } else if (data.overall_status === 'degraded') {
        toast({
          variant: "destructive", 
          title: "System Performance Degraded",
          description: `${data.summary.degraded} service(s) are experiencing issues.`,
        });
      }
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to check system health';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Health Check Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runDataQualityCheck = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('data_quality_check');
      
      if (error) {
        throw new Error(error.message || 'Failed to run data quality check');
      }
      
      toast({
        title: "Data Quality Check Complete",
        description: `Found ${data.summary.invalid} issues and ${data.summary.warnings} warnings.`,
      });
      
      return data;
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to run data quality check';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Data Quality Check Failed",
        description: errorMessage,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh health status every 5 minutes
  useEffect(() => {
    checkSystemHealth();
    
    const interval = setInterval(checkSystemHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    healthStatus,
    isLoading,
    error,
    checkSystemHealth,
    runDataQualityCheck
  };
}
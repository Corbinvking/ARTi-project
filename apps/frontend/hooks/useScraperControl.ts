import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.artistinfluence.com';

interface ScraperStatus {
  isRunning: boolean;
  lastRun: {
    timestamp: string;
    status: string;
  } | null;
  cronScheduled: boolean;
  cronSchedule: string | null;
  lastHealthCheck: {
    overall_status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: Record<string, string>;
    errors: string[];
  } | null;
  timestamp: string;
}

interface HealthCheckResult {
  timestamp: string;
  checks: Record<string, string>;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  errors: string[];
}

export function useScraperStatus() {
  return useQuery<ScraperStatus>({
    queryKey: ['scraper-status'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/scraper/status`);
      if (!response.ok) throw new Error('Failed to fetch scraper status');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useScraperHealth() {
  return useQuery<HealthCheckResult>({
    queryKey: ['scraper-health'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/scraper/health`);
      if (!response.ok) {
        const data = await response.json();
        throw data; // Throw the health data even if unhealthy
      }
      return response.json();
    },
    enabled: false, // Only fetch when manually triggered
    retry: false, // Don't retry health checks
  });
}

export function useTriggerScraper() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/scraper/trigger`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger scraper');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraper-status'] });
    },
  });
}

export function useScraperLogs(logType: 'production' | 'errors' | 'cron' = 'production', lines: number = 100) {
  return useQuery({
    queryKey: ['scraper-logs', logType, lines],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/scraper/logs?type=${logType}&lines=${lines}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
    enabled: false, // Only fetch when manually triggered
  });
}


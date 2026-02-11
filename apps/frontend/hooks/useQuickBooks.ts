import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.artistinfluence.com';

// ---- Types ----

export interface QBOStatusResponse {
  connected: boolean;
  connection: {
    id: string;
    realm_id: string;
    company_name: string | null;
    environment: string;
    status: string;
    connected_at: string;
  } | null;
  token_health: {
    access_expires_at: string;
    last_refreshed_at: string | null;
    is_expired: boolean;
    expires_in_minutes: number;
  } | null;
  sync_status: Array<{
    id: string;
    connection_id: string;
    entity_type: string;
    last_cdc_since: string | null;
    last_full_sync_at: string | null;
    last_webhook_ts: string | null;
    record_count: number;
  }>;
  entity_counts: Record<string, number>;
  api_quota: {
    requests_this_minute: number;
    max_per_minute: number;
    requests_this_second: number;
    max_per_second: number;
  };
}

export interface QBOMetricsResponse {
  connected: boolean;
  connection_id?: string;
  api_calls_24h: {
    total: number;
    success: number;
    errors: number;
    throttled: number;
    avg_duration_ms: number;
    throttle_rate: string;
  };
  token_refresh_24h: {
    success: number;
    failed: number;
  };
  webhooks_24h: {
    total: number;
    processed: number;
    invalid_signature: number;
    lag_p95_ms: number | null;
  };
  sync_freshness: Array<{
    entity_type: string;
    last_cdc_since: string | null;
    last_full_sync_at: string | null;
    last_webhook_ts: string | null;
    record_count: number;
  }>;
}

export interface QBOWebhookEvent {
  id: string;
  realm_id: string;
  signature_valid: boolean;
  payload: any;
  processed: boolean;
  processed_at: string | null;
  received_at: string;
}

export interface QBORequestLogEntry {
  id: string;
  connection_id: string;
  method: string;
  path: string;
  status_code: number | null;
  duration_ms: number | null;
  intuit_tid: string | null;
  request_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface QBOTestConnectionResult {
  ok: boolean;
  status?: number;
  company_name?: string;
  intuit_tid?: string;
  latency_ms?: number;
  error?: string;
}

// ---- Hooks ----

/** Connection status + token health + sync cursors */
export function useQBOStatus() {
  return useQuery<QBOStatusResponse>({
    queryKey: ['qbo-status'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/status`);
      if (!res.ok) throw new Error('Failed to fetch QBO status');
      return res.json();
    },
    refetchInterval: 30000, // Every 30s
  });
}

/** Aggregated health metrics (API calls, token refreshes, webhooks, lag) */
export function useQBOMetrics() {
  return useQuery<QBOMetricsResponse>({
    queryKey: ['qbo-metrics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/metrics`);
      if (!res.ok) throw new Error('Failed to fetch QBO metrics');
      return res.json();
    },
    refetchInterval: 30000,
  });
}

/** Recent webhook events */
export function useQBOWebhookEvents(limit = 20) {
  return useQuery<{ events: QBOWebhookEvent[] }>({
    queryKey: ['qbo-webhook-events', limit],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/webhook-events?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch webhook events');
      return res.json();
    },
    enabled: false, // Manual fetch
  });
}

/** Filtered request log */
export function useQBORequestLog(limit = 50, errorsOnly = false) {
  return useQuery<{ logs: QBORequestLogEntry[] }>({
    queryKey: ['qbo-request-log', limit, errorsOnly],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (errorsOnly) params.set('errors_only', 'true');
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/request-log?${params}`);
      if (!res.ok) throw new Error('Failed to fetch request log');
      return res.json();
    },
    enabled: false, // Manual fetch
  });
}

/** Trigger a full sync (optionally for a single entity type) */
export function useTriggerQBOSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityType?: string) => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/sync/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: entityType ? JSON.stringify({ entity_type: entityType }) : '{}',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sync failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbo-status'] });
      queryClient.invalidateQueries({ queryKey: ['qbo-metrics'] });
    },
  });
}

/** Trigger incremental CDC sync */
export function useTriggerQBOIncrementalSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/sync/incremental`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Incremental sync failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbo-status'] });
      queryClient.invalidateQueries({ queryKey: ['qbo-metrics'] });
    },
  });
}

/** Get the OAuth connect URL */
export function useQBOConnect() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/connect`);
      if (!res.ok) throw new Error('Failed to get connect URL');
      return res.json() as Promise<{ auth_url: string; state: string }>;
    },
  });
}

/** Disconnect from QuickBooks */
export function useQBODisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId?: string) => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: connectionId ? JSON.stringify({ connection_id: connectionId }) : '{}',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Disconnect failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbo-status'] });
      queryClient.invalidateQueries({ queryKey: ['qbo-metrics'] });
    },
  });
}

/** Test QBO API connection */
export function useQBOTestConnection() {
  return useQuery<QBOTestConnectionResult>({
    queryKey: ['qbo-test-connection'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/test-connection`);
      if (!res.ok) throw new Error('Test connection failed');
      return res.json();
    },
    enabled: false, // Manual trigger
  });
}

/** Manual token refresh */
export function useQBORefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/quickbooks/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error('Token refresh failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbo-status'] });
    },
  });
}

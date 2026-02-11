// ============================================================================
// QuickBooks Online — Rate-limited API client with logging
// ============================================================================

import { randomUUID } from 'crypto';
import { supabase } from '../supabase.js';
import { redis } from '../redis.js';
import { logger } from '../logger.js';
import { getValidAccessToken } from './oauth.js';

// Rate limit constants (per Intuit docs)
const MAX_REQUESTS_PER_SECOND = 10;
const MAX_REQUESTS_PER_MINUTE = 500;
const THROTTLE_WAIT_MS = 60_000; // Wait 60s on HTTP 429

interface QBOApiOptions {
  connectionId: string;
  realmId: string;
  method?: 'GET' | 'POST';
  path: string;
  body?: any;
  /** Whether this is a write operation (adds requestid for idempotency) */
  isWrite?: boolean;
  /** Content type override */
  contentType?: string;
}

interface QBOApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  intuitTid: string | null;
  durationMs: number;
}

function getBaseUrl(): string {
  return process.env.INTUIT_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

// ---- Redis-backed token bucket rate limiter ----

async function checkRateLimit(realmId: string): Promise<boolean> {
  if (!redis) return true; // No Redis → no enforcement

  const now = Math.floor(Date.now() / 1000);
  const secKey = `qbo:rl:sec:${realmId}:${now}`;
  const minKey = `qbo:rl:min:${realmId}:${Math.floor(now / 60)}`;

  const pipeline = redis.pipeline();
  pipeline.incr(secKey);
  pipeline.expire(secKey, 2);
  pipeline.incr(minKey);
  pipeline.expire(minKey, 61);
  const results = await pipeline.exec();

  const perSec = (results?.[0]?.[1] as number) || 0;
  const perMin = (results?.[2]?.[1] as number) || 0;

  if (perSec > MAX_REQUESTS_PER_SECOND || perMin > MAX_REQUESTS_PER_MINUTE) {
    return false; // Rate limit would be exceeded
  }
  return true;
}

/** Get current request counts for a realm (for metrics/observability) */
export async function getRequestCounts(realmId: string): Promise<{ perSecond: number; perMinute: number }> {
  if (!redis) return { perSecond: 0, perMinute: 0 };

  const now = Math.floor(Date.now() / 1000);
  const secKey = `qbo:rl:sec:${realmId}:${now}`;
  const minKey = `qbo:rl:min:${realmId}:${Math.floor(now / 60)}`;

  const [secCount, minCount] = await Promise.all([
    redis.get(secKey),
    redis.get(minKey),
  ]);

  return {
    perSecond: parseInt(secCount || '0', 10),
    perMinute: parseInt(minCount || '0', 10),
  };
}

/** Log an API request to qbo_request_log */
async function logRequest(
  connectionId: string,
  method: string,
  path: string,
  statusCode: number | null,
  durationMs: number,
  intuitTid: string | null,
  requestId: string | null,
  errorMessage: string | null
): Promise<void> {
  try {
    await supabase.from('qbo_request_log').insert({
      connection_id: connectionId,
      method,
      path,
      status_code: statusCode,
      duration_ms: durationMs,
      intuit_tid: intuitTid,
      request_id: requestId,
      error_message: errorMessage,
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to log QBO API request (non-fatal)');
  }
}

/**
 * Make a rate-limited, logged request to the QBO Accounting API.
 */
export async function qboRequest<T = any>(opts: QBOApiOptions): Promise<QBOApiResponse<T>> {
  const { connectionId, realmId, method = 'GET', path, body, isWrite, contentType } = opts;

  // 1. Rate limit check
  const allowed = await checkRateLimit(realmId);
  if (!allowed) {
    logger.warn({ realmId, path }, 'QBO rate limit would be exceeded, waiting 1s');
    await new Promise((r) => setTimeout(r, 1000));
    // Retry check
    const retryAllowed = await checkRateLimit(realmId);
    if (!retryAllowed) {
      await logRequest(connectionId, method, path, 429, 0, null, null, 'Client-side rate limit');
      throw new Error(`QBO rate limit exceeded for realm ${realmId}`);
    }
  }

  // 2. Get valid access token (auto-refreshes if needed)
  const accessToken = await getValidAccessToken(connectionId);

  // 3. Build URL
  const baseUrl = getBaseUrl();
  let url = `${baseUrl}/v3/company/${realmId}${path}`;

  // Add requestid for write operations (idempotency)
  const requestId = isWrite ? randomUUID() : null;
  if (requestId) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}requestid=${requestId}`;
  }

  // 4. Make request
  const start = performance.now();
  let status = 0;
  let intuitTid: string | null = null;
  let errorMessage: string | null = null;
  let responseData: any = null;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };
    if (body) {
      headers['Content-Type'] = contentType || 'application/json';
    }

    const fetchOpts: RequestInit = { method, headers };
    if (body) {
      fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    status = res.status;
    intuitTid = res.headers.get('intuit_tid') || null;

    if (status === 429) {
      // Throttled — wait and throw
      errorMessage = `HTTP 429 — throttled by Intuit, retry after ${THROTTLE_WAIT_MS / 1000}s`;
      logger.warn({ realmId, path, intuitTid }, errorMessage);
      throw new Error(errorMessage);
    }

    responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const fault = responseData?.Fault;
      errorMessage = fault
        ? `QBO Error: ${JSON.stringify(fault.Error || fault)}`
        : `HTTP ${status}`;
    }

    const durationMs = Math.round(performance.now() - start);

    // 5. Log
    await logRequest(connectionId, method, path, status, durationMs, intuitTid, requestId, errorMessage);

    return {
      ok: res.ok,
      status,
      data: responseData as T,
      intuitTid,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    if (!errorMessage) errorMessage = err.message;
    await logRequest(connectionId, method, path, status || 0, durationMs, intuitTid, requestId, errorMessage);
    throw err;
  }
}

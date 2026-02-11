// ============================================================================
// QuickBooks Online — Fastify routes
// Covers: OAuth connect/callback/disconnect, sync, webhooks, metrics
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID, createHmac } from 'crypto';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import {
  getAuthorizationUrl,
  handleCallback,
  disconnect,
  getValidAccessToken,
} from '../lib/quickbooks/oauth.js';
import { qboRequest, getRequestCounts } from '../lib/quickbooks/api-client.js';
import {
  fullSyncEntity,
  fullSyncAll,
  incrementalSync,
  fetchAndUpsertEntity,
  getActiveConnection,
  getSyncStatus,
} from '../lib/quickbooks/sync.js';
import type { QBOEntityType, QBOWebhookPayload } from '../lib/quickbooks/types.js';
import { QBO_ENTITY_TYPES } from '../lib/quickbooks/types.js';
import { pushInvoiceToQBO, pushAllPendingInvoices } from '../lib/quickbooks/writeback.js';

// Default org for single-tenant (matches existing pattern in the codebase)
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export async function quickbooksRoutes(server: FastifyInstance) {
  // ========================================================================
  // OAuth — Connect
  // ========================================================================

  server.get('/quickbooks/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const state = randomUUID(); // CSRF protection
    // Optionally store state in a short-lived cookie/session for validation on callback
    const authUrl = getAuthorizationUrl(state);
    return reply.send({ auth_url: authUrl, state });
  });

  // ========================================================================
  // OAuth — Callback
  // ========================================================================

  server.get('/quickbooks/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as Record<string, string>;
      const fullUrl = `${request.protocol}://${request.hostname}${request.url}`;

      // Extract realmId from query params as a sanity check
      if (!query.code || !query.realmId) {
        return reply.code(400).send({ error: 'Missing code or realmId in callback' });
      }

      // TODO: validate `state` against stored value for CSRF protection
      const orgId = DEFAULT_ORG_ID; // In multi-tenant, extract from state
      const userId = query.state || 'system'; // Would come from session in production

      const result = await handleCallback(fullUrl, orgId, userId);

      // Redirect to admin panel with success indicator
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(
        `${frontendUrl}/admin?qbo_connected=true&realm_id=${result.realmId}`
      );
    } catch (err: any) {
      logger.error({ err }, 'QBO OAuth callback failed');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(
        `${frontendUrl}/admin?qbo_error=${encodeURIComponent(err.message)}`
      );
    }
  });

  // ========================================================================
  // OAuth — Disconnect
  // ========================================================================

  server.post('/quickbooks/disconnect', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { connection_id?: string } | undefined;
      let connectionId = body?.connection_id;

      if (!connectionId) {
        const conn = await getActiveConnection(DEFAULT_ORG_ID);
        if (!conn) return reply.code(404).send({ error: 'No active QBO connection' });
        connectionId = conn.id;
      }

      await disconnect(connectionId);
      return reply.send({ ok: true, message: 'QuickBooks disconnected' });
    } catch (err: any) {
      logger.error({ err }, 'QBO disconnect failed');
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Connection Status
  // ========================================================================

  server.get('/quickbooks/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) {
        return reply.send({
          connected: false,
          connection: null,
          token_health: null,
          sync_status: [],
        });
      }

      // Token health
      const { data: tokenRow } = await supabase
        .from('qbo_tokens')
        .select('access_expires_at, last_refreshed_at')
        .eq('connection_id', conn.id)
        .single();

      const tokenHealth = tokenRow ? {
        access_expires_at: tokenRow.access_expires_at,
        last_refreshed_at: tokenRow.last_refreshed_at,
        is_expired: new Date(tokenRow.access_expires_at) < new Date(),
        expires_in_minutes: Math.max(
          0,
          Math.round((new Date(tokenRow.access_expires_at).getTime() - Date.now()) / 60000)
        ),
      } : null;

      // Sync status
      const syncStatus = await getSyncStatus(conn.id);

      // Entity counts
      const entityCounts: Record<string, number> = {};
      for (const entityType of QBO_ENTITY_TYPES) {
        const tableName = `qbo_${entityType.toLowerCase()}s`;
        const { count } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true })
          .eq('connection_id', conn.id);
        entityCounts[entityType] = count || 0;
      }

      // API quota
      const requestCounts = await getRequestCounts(conn.realm_id);

      return reply.send({
        connected: true,
        connection: {
          id: conn.id,
          realm_id: conn.realm_id,
          company_name: conn.company_name,
          environment: conn.environment,
          status: conn.status,
          connected_at: conn.connected_at,
        },
        token_health: tokenHealth,
        sync_status: syncStatus,
        entity_counts: entityCounts,
        api_quota: {
          requests_this_minute: requestCounts.perMinute,
          max_per_minute: 500,
          requests_this_second: requestCounts.perSecond,
          max_per_second: 10,
        },
      });
    } catch (err: any) {
      logger.error({ err }, 'QBO status check failed');
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Manual Token Refresh
  // ========================================================================

  server.post('/quickbooks/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.code(404).send({ error: 'No active QBO connection' });

      await getValidAccessToken(conn.id);
      return reply.send({ ok: true, message: 'Token refreshed' });
    } catch (err: any) {
      logger.error({ err }, 'Manual token refresh failed');
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Sync — Full
  // ========================================================================

  server.post('/quickbooks/sync/full', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.code(404).send({ error: 'No active QBO connection' });

      const body = request.body as { entity_type?: QBOEntityType } | undefined;

      if (body?.entity_type) {
        const count = await fullSyncEntity(conn.id, conn.realm_id, body.entity_type);
        return reply.send({ ok: true, entity_type: body.entity_type, count });
      }

      const results = await fullSyncAll(conn.id, conn.realm_id);
      return reply.send({ ok: true, results });
    } catch (err: any) {
      logger.error({ err }, 'Full sync failed');
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Sync — Incremental (CDC)
  // ========================================================================

  server.post('/quickbooks/sync/incremental', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.code(404).send({ error: 'No active QBO connection' });

      const results = await incrementalSync(conn.id, conn.realm_id);
      return reply.send({ ok: true, results });
    } catch (err: any) {
      logger.error({ err }, 'Incremental sync failed');
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Sync — Status
  // ========================================================================

  server.get('/quickbooks/sync/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.code(404).send({ error: 'No active QBO connection' });

      const status = await getSyncStatus(conn.id);
      return reply.send({ connection_id: conn.id, cursors: status });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Webhooks — Intuit event notifications
  // ========================================================================

  server.post('/quickbooks/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    try {
      // 1. Verify HMAC signature
      const signature = request.headers['intuit-signature'] as string;
      const verifierToken = process.env.INTUIT_WEBHOOK_VERIFIER_TOKEN;
      const rawBody = JSON.stringify(request.body);

      let signatureValid = false;
      if (signature && verifierToken) {
        const hash = createHmac('sha256', verifierToken)
          .update(rawBody)
          .digest('base64');
        signatureValid = hash === signature;
      }

      if (!signatureValid) {
        logger.warn('QBO webhook signature verification failed');
        // Still return 200 to prevent Intuit from retrying, but log the failure
      }

      const payload = request.body as QBOWebhookPayload;

      // 2. Respond immediately (must be within 3 seconds)
      reply.send({ ok: true });

      // 3. Process asynchronously
      setImmediate(async () => {
        try {
          if (!payload.eventNotifications) return;

          for (const notification of payload.eventNotifications) {
            const realmId = notification.realmId;

            // Store raw event
            await supabase.from('qbo_webhook_events').insert({
              realm_id: realmId,
              signature_valid: signatureValid,
              payload: notification,
              processed: false,
            });

            if (!signatureValid) continue;

            // Find connection for this realm
            const { data: conn } = await supabase
              .from('qbo_connections')
              .select('id, realm_id')
              .eq('realm_id', realmId)
              .eq('status', 'active')
              .single();

            if (!conn) {
              logger.warn({ realmId }, 'Webhook for unknown/inactive realm');
              continue;
            }

            // Process each entity change
            const entities = notification.dataChangeEvent?.entities || [];
            for (const entity of entities) {
              const entityType = entity.name as QBOEntityType;
              if (!QBO_ENTITY_TYPES.includes(entityType)) continue;

              if (entity.operation === 'Delete') {
                // Remove from mirror table
                const tableName = `qbo_${entityType.toLowerCase()}s`;
                await supabase
                  .from(tableName)
                  .delete()
                  .eq('connection_id', conn.id)
                  .eq('qbo_id', entity.id);
              } else {
                // Fetch latest and upsert
                try {
                  await fetchAndUpsertEntity(conn.id, realmId, entityType, entity.id);
                } catch (fetchErr) {
                  logger.error({ fetchErr, entityType, entityId: entity.id }, 'Webhook entity fetch failed');
                }
              }

              // Update sync cursor
              await supabase.from('qbo_sync_cursors').upsert({
                connection_id: conn.id,
                entity_type: entityType,
                last_webhook_ts: entity.lastUpdated,
              }, { onConflict: 'connection_id,entity_type' });
            }

            // Mark event as processed
            // (find by realm_id + most recent unprocessed)
            const { data: event } = await supabase
              .from('qbo_webhook_events')
              .select('id')
              .eq('realm_id', realmId)
              .eq('processed', false)
              .order('received_at', { ascending: false })
              .limit(1)
              .single();

            if (event) {
              await supabase
                .from('qbo_webhook_events')
                .update({ processed: true, processed_at: new Date().toISOString() })
                .eq('id', event.id);
            }
          }
        } catch (asyncErr) {
          logger.error({ asyncErr }, 'Webhook async processing failed');
        }
      });
    } catch (err: any) {
      logger.error({ err }, 'QBO webhook handler error');
      // Always return 200 to prevent Intuit retries
      return reply.code(200).send({ ok: false });
    }
  });

  // ========================================================================
  // Metrics — Aggregated health data for observability card
  // ========================================================================

  server.get('/quickbooks/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.send({ connected: false });

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // API call stats (last 24h)
      const { data: requestLogs } = await supabase
        .from('qbo_request_log')
        .select('status_code, duration_ms')
        .eq('connection_id', conn.id)
        .gte('created_at', since24h);

      const logs = requestLogs || [];
      const totalCalls = logs.length;
      const successCalls = logs.filter((l: any) => l.status_code >= 200 && l.status_code < 300).length;
      const errorCalls = logs.filter((l: any) => l.status_code >= 400).length;
      const throttledCalls = logs.filter((l: any) => l.status_code === 429).length;
      const avgDuration = logs.length > 0
        ? Math.round(logs.reduce((sum: number, l: any) => sum + (l.duration_ms || 0), 0) / logs.length)
        : 0;

      // Token refresh stats (last 24h) — count refresh-related request log entries
      const { data: refreshLogs } = await supabase
        .from('qbo_request_log')
        .select('status_code')
        .eq('connection_id', conn.id)
        .gte('created_at', since24h)
        .like('path', '%/tokens/bearer%');

      const refreshSuccess = (refreshLogs || []).filter((l: any) => l.status_code === 200).length;
      const refreshFailed = (refreshLogs || []).filter((l: any) => l.status_code !== 200).length;

      // Webhook stats (last 24h)
      const { data: webhookEvents } = await supabase
        .from('qbo_webhook_events')
        .select('signature_valid, processed, received_at, processed_at')
        .eq('realm_id', conn.realm_id)
        .gte('received_at', since24h);

      const events = webhookEvents || [];
      const webhookTotal = events.length;
      const webhookProcessed = events.filter((e: any) => e.processed).length;
      const webhookInvalid = events.filter((e: any) => !e.signature_valid).length;

      // Calculate webhook lag (p95)
      const lags = events
        .filter((e: any) => e.processed && e.processed_at)
        .map((e: any) => new Date(e.processed_at).getTime() - new Date(e.received_at).getTime())
        .sort((a: number, b: number) => a - b);

      const webhookLagP95 = lags.length > 0
        ? lags[Math.floor(lags.length * 0.95)]
        : null;

      // Sync freshness
      const syncStatus = await getSyncStatus(conn.id);

      return reply.send({
        connected: true,
        connection_id: conn.id,
        api_calls_24h: {
          total: totalCalls,
          success: successCalls,
          errors: errorCalls,
          throttled: throttledCalls,
          avg_duration_ms: avgDuration,
          throttle_rate: totalCalls > 0 ? (throttledCalls / totalCalls * 100).toFixed(2) + '%' : '0%',
        },
        token_refresh_24h: {
          success: refreshSuccess,
          failed: refreshFailed,
        },
        webhooks_24h: {
          total: webhookTotal,
          processed: webhookProcessed,
          invalid_signature: webhookInvalid,
          lag_p95_ms: webhookLagP95,
        },
        sync_freshness: syncStatus,
      });
    } catch (err: any) {
      logger.error({ err }, 'QBO metrics fetch failed');
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Webhook Events — Recent events list for observability
  // ========================================================================

  server.get('/quickbooks/webhook-events', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { limit?: string };
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);

      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.send({ events: [] });

      const { data, error } = await supabase
        .from('qbo_webhook_events')
        .select('*')
        .eq('realm_id', conn.realm_id)
        .order('received_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return reply.send({ events: data || [] });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Request Log — Recent API calls for observability
  // ========================================================================

  server.get('/quickbooks/request-log', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { limit?: string; status?: string; errors_only?: string };
      const limit = Math.min(parseInt(query.limit || '50', 10), 200);

      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.send({ logs: [] });

      let dbQuery = supabase
        .from('qbo_request_log')
        .select('*')
        .eq('connection_id', conn.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (query.errors_only === 'true') {
        dbQuery = dbQuery.gte('status_code', 400);
      } else if (query.status) {
        dbQuery = dbQuery.eq('status_code', parseInt(query.status, 10));
      }

      const { data, error } = await dbQuery;
      if (error) throw error;
      return reply.send({ logs: data || [] });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ========================================================================
  // Test Connection — Probe QBO API for health check
  // ========================================================================

  server.get('/quickbooks/test-connection', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.send({ ok: false, error: 'No active connection' });

      const res = await qboRequest({
        connectionId: conn.id,
        realmId: conn.realm_id,
        method: 'GET',
        path: `/companyinfo/${conn.realm_id}`,
      });

      return reply.send({
        ok: res.ok,
        status: res.status,
        company_name: res.data?.CompanyInfo?.CompanyName,
        intuit_tid: res.intuitTid,
        latency_ms: res.durationMs,
      });
    } catch (err: any) {
      return reply.send({ ok: false, error: err.message });
    }
  });

  // ========================================================================
  // Write-Back — Push campaign invoices to QBO
  // ========================================================================

  /** Push a single campaign invoice to QBO */
  server.post('/quickbooks/invoices/push', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.code(404).send({ error: 'No active QBO connection' });

      const body = request.body as { invoice_id: string };
      if (!body?.invoice_id) {
        return reply.code(400).send({ error: 'Missing invoice_id' });
      }

      const result = await pushInvoiceToQBO(conn, body.invoice_id);
      return reply.send({ ok: true, qbo_invoice_id: result.qboInvoiceId });
    } catch (err: any) {
      logger.error({ err }, 'Push invoice to QBO failed');
      return reply.code(500).send({ error: err.message });
    }
  });

  /** Push all pending campaign invoices to QBO */
  server.post('/quickbooks/invoices/push-all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const conn = await getActiveConnection(DEFAULT_ORG_ID);
      if (!conn) return reply.code(404).send({ error: 'No active QBO connection' });

      const result = await pushAllPendingInvoices(conn);
      return reply.send({ ok: true, ...result });
    } catch (err: any) {
      logger.error({ err }, 'Push all invoices to QBO failed');
      return reply.code(500).send({ error: err.message });
    }
  });

  /** Get QBO sync status for campaign invoices */
  server.get('/quickbooks/invoices/sync-status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { data, error } = await supabase
        .from('campaign_invoices')
        .select('id, invoice_number, amount, status, qbo_invoice_id, qbo_sync_status, qbo_last_synced_at, qbo_error_message')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return reply.send({ invoices: data || [] });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });
}

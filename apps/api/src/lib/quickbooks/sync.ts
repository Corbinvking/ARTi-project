// ============================================================================
// QuickBooks Online — Sync engine (full sync + incremental CDC)
// ============================================================================

import { supabase } from '../supabase.js';
import { logger } from '../logger.js';
import { qboRequest } from './api-client.js';
import { getMapper } from './mappers/index.js';
import type { QBOEntityType, QBOConnection } from './types.js';
import { QBO_TABLE_MAP, QBO_ENTITY_TYPES } from './types.js';

const PAGE_SIZE = 1000; // QBO max per query response

// ---- Full Sync ----

/**
 * Full sync for a single entity type: paginated query, upsert all records.
 * Returns the count of records synced.
 */
export async function fullSyncEntity(
  connectionId: string,
  realmId: string,
  entityType: QBOEntityType
): Promise<number> {
  const table = QBO_TABLE_MAP[entityType];
  const mapper = getMapper(entityType);

  let startPosition = 1;
  let totalSynced = 0;

  logger.info({ connectionId, entityType }, `Starting full sync for ${entityType}`);

  while (true) {
    const query = `SELECT * FROM ${entityType} STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;

    const res = await qboRequest({
      connectionId,
      realmId,
      method: 'GET',
      path: `/query?query=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      logger.error({ entityType, status: res.status, data: res.data }, 'Full sync query failed');
      throw new Error(`Full sync query failed for ${entityType}: HTTP ${res.status}`);
    }

    const queryResponse = res.data?.QueryResponse;
    const entities = queryResponse?.[entityType] || [];

    if (entities.length === 0) break;

    // Map and upsert
    const rows = entities.map((e: any) => mapper(e, connectionId));

    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: 'connection_id,qbo_id' });

    if (error) {
      logger.error({ error, entityType }, 'Upsert failed during full sync');
      throw error;
    }

    totalSynced += entities.length;

    // If we got fewer than PAGE_SIZE, we've reached the end
    if (entities.length < PAGE_SIZE) break;
    startPosition += PAGE_SIZE;
  }

  // Update sync cursor
  await supabase.from('qbo_sync_cursors').upsert({
    connection_id: connectionId,
    entity_type: entityType,
    last_full_sync_at: new Date().toISOString(),
    record_count: totalSynced,
  }, { onConflict: 'connection_id,entity_type' });

  logger.info({ connectionId, entityType, totalSynced }, `Full sync complete for ${entityType}`);
  return totalSynced;
}

/**
 * Full sync for all entity types for a connection.
 */
export async function fullSyncAll(connectionId: string, realmId: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const entityType of QBO_ENTITY_TYPES) {
    try {
      results[entityType] = await fullSyncEntity(connectionId, realmId, entityType);
    } catch (err: any) {
      logger.error({ err, entityType }, `Full sync failed for ${entityType}`);
      results[entityType] = -1; // Indicate failure
    }
  }

  return results;
}

// ---- Incremental Sync (CDC) ----

/**
 * Incremental sync using Change Data Capture endpoint.
 * Pulls changes since the last cursor timestamp for all entity types.
 */
export async function incrementalSync(
  connectionId: string,
  realmId: string,
  entityTypes?: QBOEntityType[]
): Promise<Record<string, number>> {
  const types = entityTypes || QBO_ENTITY_TYPES;
  const results: Record<string, number> = {};

  // Get cursors for all entity types
  const { data: cursors } = await supabase
    .from('qbo_sync_cursors')
    .select('*')
    .eq('connection_id', connectionId)
    .in('entity_type', types);

  // Determine changedSince — use the earliest cursor, or 24h ago if none
  let changedSince: Date;
  if (cursors && cursors.length > 0) {
    const timestamps = cursors
      .map((c: any) => c.last_cdc_since || c.last_full_sync_at)
      .filter(Boolean)
      .map((t: string) => new Date(t).getTime());

    changedSince = timestamps.length > 0
      ? new Date(Math.min(...timestamps))
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
  } else {
    changedSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  // CDC endpoint supports max 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (changedSince < thirtyDaysAgo) {
    changedSince = thirtyDaysAgo;
  }

  const entitiesParam = types.join(',');
  const sinceParam = changedSince.toISOString();

  logger.info({ connectionId, entitiesParam, sinceParam }, 'Starting CDC incremental sync');

  const res = await qboRequest({
    connectionId,
    realmId,
    method: 'GET',
    path: `/cdc?entities=${entitiesParam}&changedSince=${sinceParam}`,
  });

  if (!res.ok) {
    logger.error({ status: res.status, data: res.data }, 'CDC query failed');
    throw new Error(`CDC query failed: HTTP ${res.status}`);
  }

  const cdcResponse = res.data?.CDCResponse;
  if (!cdcResponse || !Array.isArray(cdcResponse)) {
    logger.info('CDC response empty, no changes');
    return results;
  }

  // Process each entity type in the response
  for (const cdcEntry of cdcResponse) {
    const queryResponses = cdcEntry.QueryResponse;
    if (!Array.isArray(queryResponses)) continue;

    for (const qr of queryResponses) {
      for (const entityType of types) {
        const entities = qr[entityType];
        if (!entities || !Array.isArray(entities) || entities.length === 0) continue;

        const table = QBO_TABLE_MAP[entityType];
        const mapper = getMapper(entityType);

        // Handle deleted entities
        const active = entities.filter((e: any) => e.status !== 'Deleted');
        const deleted = entities.filter((e: any) => e.status === 'Deleted');

        if (active.length > 0) {
          const rows = active.map((e: any) => mapper(e, connectionId));
          const { error } = await supabase
            .from(table)
            .upsert(rows, { onConflict: 'connection_id,qbo_id' });

          if (error) {
            logger.error({ error, entityType }, 'CDC upsert failed');
          }
        }

        if (deleted.length > 0) {
          const deletedIds = deleted.map((e: any) => e.Id);
          // Soft-delete: remove from our mirror table
          await supabase
            .from(table)
            .delete()
            .eq('connection_id', connectionId)
            .in('qbo_id', deletedIds);
        }

        results[entityType] = (results[entityType] || 0) + entities.length;
      }
    }
  }

  // Update cursors
  const now = new Date().toISOString();
  for (const entityType of types) {
    await supabase.from('qbo_sync_cursors').upsert({
      connection_id: connectionId,
      entity_type: entityType,
      last_cdc_since: now,
    }, { onConflict: 'connection_id,entity_type' });
  }

  logger.info({ connectionId, results }, 'CDC incremental sync complete');
  return results;
}

// ---- Single Entity Fetch (for webhook processing) ----

/**
 * Fetch a single entity by ID from QBO and upsert into the mirror table.
 */
export async function fetchAndUpsertEntity(
  connectionId: string,
  realmId: string,
  entityType: QBOEntityType,
  entityId: string
): Promise<void> {
  const table = QBO_TABLE_MAP[entityType];
  const mapper = getMapper(entityType);

  const res = await qboRequest({
    connectionId,
    realmId,
    method: 'GET',
    path: `/${entityType.toLowerCase()}/${entityId}`,
  });

  if (!res.ok) {
    logger.error({ entityType, entityId, status: res.status }, 'Failed to fetch single entity');
    throw new Error(`Failed to fetch ${entityType}/${entityId}: HTTP ${res.status}`);
  }

  const entity = res.data?.[entityType];
  if (!entity) {
    logger.warn({ entityType, entityId }, 'Entity not found in response');
    return;
  }

  const row = mapper(entity, connectionId);
  const { error } = await supabase
    .from(table)
    .upsert(row, { onConflict: 'connection_id,qbo_id' });

  if (error) {
    logger.error({ error, entityType, entityId }, 'Single entity upsert failed');
    throw error;
  }
}

// ---- Helpers ----

/** Get the active QBO connection for an org */
export async function getActiveConnection(orgId: string): Promise<QBOConnection | null> {
  const { data, error } = await supabase
    .from('qbo_connections')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('connected_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as QBOConnection;
}

/** Get sync cursor status for all entity types for a connection */
export async function getSyncStatus(connectionId: string) {
  const { data, error } = await supabase
    .from('qbo_sync_cursors')
    .select('*')
    .eq('connection_id', connectionId)
    .order('entity_type');

  if (error) {
    logger.error({ error }, 'Failed to get sync status');
    return [];
  }
  return data || [];
}

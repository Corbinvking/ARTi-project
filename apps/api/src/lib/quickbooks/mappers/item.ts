import type { QBOItemResponse } from '../types.js';

/** Map a QBO Item JSON object to our local table columns */
export function mapItem(raw: QBOItemResponse, connectionId: string) {
  return {
    connection_id: connectionId,
    qbo_id: raw.Id,
    sync_token: raw.SyncToken,
    name: raw.Name ?? null,
    description: raw.Description ?? null,
    item_type: raw.Type ?? null,
    active: raw.Active ?? true,
    unit_price: raw.UnitPrice ?? null,
    raw_json: raw,
    qbo_created_at: raw.MetaData?.CreateTime ?? null,
    qbo_updated_at: raw.MetaData?.LastUpdatedTime ?? null,
    synced_at: new Date().toISOString(),
  };
}

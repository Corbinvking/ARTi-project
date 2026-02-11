import type { QBOVendorResponse } from '../types.js';

/** Map a QBO Vendor JSON object to our local table columns */
export function mapVendor(raw: QBOVendorResponse, connectionId: string) {
  return {
    connection_id: connectionId,
    qbo_id: raw.Id,
    sync_token: raw.SyncToken,
    display_name: raw.DisplayName ?? null,
    company_name: raw.CompanyName ?? null,
    given_name: raw.GivenName ?? null,
    family_name: raw.FamilyName ?? null,
    email: raw.PrimaryEmailAddr?.Address ?? null,
    phone: raw.PrimaryPhone?.FreeFormNumber ?? null,
    active: raw.Active ?? true,
    balance: raw.Balance ?? null,
    raw_json: raw,
    qbo_created_at: raw.MetaData?.CreateTime ?? null,
    qbo_updated_at: raw.MetaData?.LastUpdatedTime ?? null,
    synced_at: new Date().toISOString(),
  };
}

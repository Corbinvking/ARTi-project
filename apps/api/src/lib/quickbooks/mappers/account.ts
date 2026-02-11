import type { QBOAccountResponse } from '../types.js';

/** Map a QBO Account JSON object to our local table columns */
export function mapAccount(raw: QBOAccountResponse, connectionId: string) {
  return {
    connection_id: connectionId,
    qbo_id: raw.Id,
    sync_token: raw.SyncToken,
    name: raw.Name ?? null,
    account_type: raw.AccountType ?? null,
    account_sub_type: raw.AccountSubType ?? null,
    active: raw.Active ?? true,
    current_balance: raw.CurrentBalance ?? null,
    currency_code: raw.CurrencyRef?.value ?? 'USD',
    raw_json: raw,
    qbo_created_at: raw.MetaData?.CreateTime ?? null,
    qbo_updated_at: raw.MetaData?.LastUpdatedTime ?? null,
    synced_at: new Date().toISOString(),
  };
}

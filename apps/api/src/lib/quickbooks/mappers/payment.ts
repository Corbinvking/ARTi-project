import type { QBOPaymentResponse } from '../types.js';

/** Map a QBO Payment JSON object to our local table columns */
export function mapPayment(raw: QBOPaymentResponse, connectionId: string) {
  return {
    connection_id: connectionId,
    qbo_id: raw.Id,
    sync_token: raw.SyncToken,
    customer_qbo_id: raw.CustomerRef?.value ?? null,
    txn_date: raw.TxnDate ?? null,
    total_amt: raw.TotalAmt ?? null,
    unapplied_amt: raw.UnappliedAmt ?? null,
    currency_code: raw.CurrencyRef?.value ?? 'USD',
    raw_json: raw,
    qbo_created_at: raw.MetaData?.CreateTime ?? null,
    qbo_updated_at: raw.MetaData?.LastUpdatedTime ?? null,
    synced_at: new Date().toISOString(),
  };
}

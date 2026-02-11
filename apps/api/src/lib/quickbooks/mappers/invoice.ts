import type { QBOInvoiceResponse } from '../types.js';

/** Map a QBO Invoice JSON object to our local table columns */
export function mapInvoice(raw: QBOInvoiceResponse, connectionId: string) {
  return {
    connection_id: connectionId,
    qbo_id: raw.Id,
    sync_token: raw.SyncToken,
    customer_qbo_id: raw.CustomerRef?.value ?? null,
    doc_number: raw.DocNumber ?? null,
    txn_date: raw.TxnDate ?? null,
    due_date: raw.DueDate ?? null,
    total_amt: raw.TotalAmt ?? null,
    balance: raw.Balance ?? null,
    currency_code: raw.CurrencyRef?.value ?? 'USD',
    email_status: raw.EmailStatus ?? null,
    raw_json: raw,
    qbo_created_at: raw.MetaData?.CreateTime ?? null,
    qbo_updated_at: raw.MetaData?.LastUpdatedTime ?? null,
    synced_at: new Date().toISOString(),
  };
}

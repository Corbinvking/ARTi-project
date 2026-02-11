// ============================================================================
// QuickBooks Online — TypeScript types
// ============================================================================

/** QBO entity types we sync */
export type QBOEntityType = 'Customer' | 'Invoice' | 'Payment' | 'Vendor' | 'Item' | 'Account';

export const QBO_ENTITY_TYPES: QBOEntityType[] = [
  'Customer', 'Invoice', 'Payment', 'Vendor', 'Item', 'Account',
];

/** Table name for each entity type */
export const QBO_TABLE_MAP: Record<QBOEntityType, string> = {
  Customer: 'qbo_customers',
  Invoice: 'qbo_invoices',
  Payment: 'qbo_payments',
  Vendor: 'qbo_vendors',
  Item: 'qbo_items',
  Account: 'qbo_accounts',
};

/** Stored connection row */
export interface QBOConnection {
  id: string;
  org_id: string;
  realm_id: string;
  company_name: string | null;
  environment: 'sandbox' | 'production';
  status: 'active' | 'disconnected' | 'error' | 'pending';
  scopes: string[];
  connected_by: string | null;
  connected_at: string;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Stored token row */
export interface QBOToken {
  id: string;
  connection_id: string;
  access_token_enc: string;
  access_expires_at: string;
  refresh_token_enc: string;
  refresh_expires_at: string | null;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Sync cursor row */
export interface QBOSyncCursor {
  id: string;
  connection_id: string;
  entity_type: string;
  last_cdc_since: string | null;
  last_full_sync_at: string | null;
  last_webhook_ts: string | null;
  record_count: number;
  created_at: string;
  updated_at: string;
}

/** Webhook event row */
export interface QBOWebhookEvent {
  id: string;
  realm_id: string;
  signature_valid: boolean;
  payload: any;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  received_at: string;
}

/** Request log row */
export interface QBORequestLog {
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

// ------------------------------------------------------------------
// Intuit API response shapes (partial — only fields we extract)
// ------------------------------------------------------------------

export interface QBOMetaData {
  CreateTime: string;
  LastUpdatedTime: string;
}

export interface QBOCustomerResponse {
  Id: string;
  SyncToken: string;
  MetaData: QBOMetaData;
  DisplayName?: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Active?: boolean;
  Balance?: number;
}

export interface QBOInvoiceResponse {
  Id: string;
  SyncToken: string;
  MetaData: QBOMetaData;
  CustomerRef?: { value: string; name?: string };
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  TotalAmt?: number;
  Balance?: number;
  CurrencyRef?: { value: string };
  EmailStatus?: string;
  Line?: any[];
}

export interface QBOPaymentResponse {
  Id: string;
  SyncToken: string;
  MetaData: QBOMetaData;
  CustomerRef?: { value: string; name?: string };
  TxnDate?: string;
  TotalAmt?: number;
  UnappliedAmt?: number;
  CurrencyRef?: { value: string };
  Line?: any[];
}

export interface QBOVendorResponse {
  Id: string;
  SyncToken: string;
  MetaData: QBOMetaData;
  DisplayName?: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Active?: boolean;
  Balance?: number;
}

export interface QBOItemResponse {
  Id: string;
  SyncToken: string;
  MetaData: QBOMetaData;
  Name?: string;
  Description?: string;
  Type?: string;
  Active?: boolean;
  UnitPrice?: number;
}

export interface QBOAccountResponse {
  Id: string;
  SyncToken: string;
  MetaData: QBOMetaData;
  Name?: string;
  AccountType?: string;
  AccountSubType?: string;
  Active?: boolean;
  CurrentBalance?: number;
  CurrencyRef?: { value: string };
}

/** CDC response wrapper */
export interface QBOCDCResponse {
  CDCResponse: Array<{
    QueryResponse: Array<{
      [entityName: string]: any[];
      startPosition?: any;
      maxResults?: any;
      totalCount?: any;
    }>;
  }>;
}

/** Webhook payload from Intuit */
export interface QBOWebhookPayload {
  eventNotifications: Array<{
    realmId: string;
    dataChangeEvent: {
      entities: Array<{
        name: string;
        id: string;
        operation: 'Create' | 'Update' | 'Delete' | 'Merge' | 'Void';
        lastUpdated: string;
      }>;
    };
  }>;
}

/** Query response wrapper */
export interface QBOQueryResponse<T = any> {
  QueryResponse: {
    [key: string]: T[];
    startPosition?: any;
    maxResults?: any;
    totalCount?: any;
  };
}

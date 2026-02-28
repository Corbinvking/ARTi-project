-- ============================================================================
-- QuickBooks Online Integration Schema
-- Migration: 20260211_quickbooks_integration.sql
-- ============================================================================

-- 1. qbo_connections — one row per authorized QBO company (realm)
CREATE TABLE IF NOT EXISTS qbo_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  realm_id      TEXT NOT NULL,
  company_name  TEXT,
  environment   TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error', 'pending')),
  scopes        TEXT[] NOT NULL DEFAULT ARRAY['com.intuit.quickbooks.accounting'],
  connected_by  UUID REFERENCES auth.users(id),
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, realm_id)
);

-- 2. qbo_tokens — encrypted token store per connection
CREATE TABLE IF NOT EXISTS qbo_tokens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id         UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE UNIQUE,
  access_token_enc      TEXT NOT NULL,
  access_expires_at     TIMESTAMPTZ NOT NULL,
  refresh_token_enc     TEXT NOT NULL,
  refresh_expires_at    TIMESTAMPTZ,
  last_refreshed_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. qbo_request_log — API call audit trail
CREATE TABLE IF NOT EXISTS qbo_request_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE,
  method        TEXT NOT NULL,
  path          TEXT NOT NULL,
  status_code   INTEGER,
  duration_ms   INTEGER,
  intuit_tid    TEXT,
  request_id    TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for metrics queries (last 24h lookups)
CREATE INDEX IF NOT EXISTS idx_qbo_request_log_created_at ON qbo_request_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qbo_request_log_connection ON qbo_request_log(connection_id, created_at DESC);

-- 4. qbo_webhook_events — raw webhook payloads
CREATE TABLE IF NOT EXISTS qbo_webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id        TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  payload         JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT false,
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qbo_webhook_events_realm ON qbo_webhook_events(realm_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_qbo_webhook_events_unprocessed ON qbo_webhook_events(processed) WHERE processed = false;

-- 5. qbo_sync_cursors — per-entity sync state
CREATE TABLE IF NOT EXISTS qbo_sync_cursors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id    UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE,
  entity_type      TEXT NOT NULL,
  last_cdc_since   TIMESTAMPTZ,
  last_full_sync_at TIMESTAMPTZ,
  last_webhook_ts  TIMESTAMPTZ,
  record_count     INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, entity_type)
);

-- 6. qbo_customers — customer mirror
CREATE TABLE IF NOT EXISTS qbo_customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE,
  qbo_id          TEXT NOT NULL,
  sync_token      TEXT NOT NULL,
  display_name    TEXT,
  company_name    TEXT,
  given_name      TEXT,
  family_name     TEXT,
  email           TEXT,
  phone           TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  balance         NUMERIC(15,2),
  raw_json        JSONB NOT NULL,
  qbo_created_at  TIMESTAMPTZ,
  qbo_updated_at  TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_qbo_customers_connection ON qbo_customers(connection_id);

-- 7. qbo_invoices — invoice mirror
CREATE TABLE IF NOT EXISTS qbo_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE,
  qbo_id          TEXT NOT NULL,
  sync_token      TEXT NOT NULL,
  customer_qbo_id TEXT,
  doc_number      TEXT,
  txn_date        DATE,
  due_date        DATE,
  total_amt       NUMERIC(15,2),
  balance         NUMERIC(15,2),
  currency_code   TEXT DEFAULT 'USD',
  email_status    TEXT,
  raw_json        JSONB NOT NULL,
  -- Link back to internal campaign_invoices (populated during two-way sync)
  campaign_invoice_id UUID,
  qbo_created_at  TIMESTAMPTZ,
  qbo_updated_at  TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_qbo_invoices_connection ON qbo_invoices(connection_id);
CREATE INDEX IF NOT EXISTS idx_qbo_invoices_customer ON qbo_invoices(connection_id, customer_qbo_id);

-- 8. qbo_payments — payment mirror
CREATE TABLE IF NOT EXISTS qbo_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE,
  qbo_id          TEXT NOT NULL,
  sync_token      TEXT NOT NULL,
  customer_qbo_id TEXT,
  txn_date        DATE,
  total_amt       NUMERIC(15,2),
  unapplied_amt   NUMERIC(15,2),
  currency_code   TEXT DEFAULT 'USD',
  raw_json        JSONB NOT NULL,
  qbo_created_at  TIMESTAMPTZ,
  qbo_updated_at  TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_qbo_payments_connection ON qbo_payments(connection_id);

-- 9. qbo_vendors — vendor mirror
CREATE TABLE IF NOT EXISTS qbo_vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE,
  qbo_id          TEXT NOT NULL,
  sync_token      TEXT NOT NULL,
  display_name    TEXT,
  company_name    TEXT,
  given_name      TEXT,
  family_name     TEXT,
  email           TEXT,
  phone           TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  balance         NUMERIC(15,2),
  raw_json        JSONB NOT NULL,
  qbo_created_at  TIMESTAMPTZ,
  qbo_updated_at  TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_qbo_vendors_connection ON qbo_vendors(connection_id);

-- 10. qbo_items — product/service mirror
CREATE TABLE IF NOT EXISTS qbo_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE,
  qbo_id          TEXT NOT NULL,
  sync_token      TEXT NOT NULL,
  name            TEXT,
  description     TEXT,
  item_type       TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  unit_price      NUMERIC(15,2),
  raw_json        JSONB NOT NULL,
  qbo_created_at  TIMESTAMPTZ,
  qbo_updated_at  TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_qbo_items_connection ON qbo_items(connection_id);

-- 11. qbo_accounts — chart of accounts mirror
CREATE TABLE IF NOT EXISTS qbo_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES qbo_connections(id) ON DELETE CASCADE,
  qbo_id          TEXT NOT NULL,
  sync_token      TEXT NOT NULL,
  name            TEXT,
  account_type    TEXT,
  account_sub_type TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  current_balance NUMERIC(15,2),
  currency_code   TEXT DEFAULT 'USD',
  raw_json        JSONB NOT NULL,
  qbo_created_at  TIMESTAMPTZ,
  qbo_updated_at  TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, qbo_id)
);

CREATE INDEX IF NOT EXISTS idx_qbo_accounts_connection ON qbo_accounts(connection_id);

-- ============================================================================
-- Row-Level Security Policies
-- ============================================================================

ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_accounts ENABLE ROW LEVEL SECURITY;

-- Service role (backend) can do everything
CREATE POLICY "Service role full access on qbo_connections"
  ON qbo_connections FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_tokens"
  ON qbo_tokens FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_request_log"
  ON qbo_request_log FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_webhook_events"
  ON qbo_webhook_events FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_sync_cursors"
  ON qbo_sync_cursors FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_customers"
  ON qbo_customers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_invoices"
  ON qbo_invoices FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_payments"
  ON qbo_payments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_vendors"
  ON qbo_vendors FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_items"
  ON qbo_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on qbo_accounts"
  ON qbo_accounts FOR ALL USING (true) WITH CHECK (true);

-- Updated-at trigger function (reuse if exists, else create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_qbo_connections_updated_at
  BEFORE UPDATE ON qbo_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_qbo_tokens_updated_at
  BEFORE UPDATE ON qbo_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_qbo_sync_cursors_updated_at
  BEFORE UPDATE ON qbo_sync_cursors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

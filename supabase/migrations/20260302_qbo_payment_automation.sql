-- ============================================================================
-- QBO Payment Automation: audit log + campaign eligibility columns
-- Migration: 20260302_qbo_payment_automation.sql
-- ============================================================================

-- 1. Automation audit log — tracks every automated action triggered by QBO events
CREATE TABLE IF NOT EXISTS qbo_automation_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id       UUID REFERENCES qbo_connections(id) ON DELETE SET NULL,
  event_type          TEXT NOT NULL CHECK (event_type IN (
    'invoice_paid',
    'invoice_matched',
    'campaign_activated',
    'commission_unlocked',
    'payout_unlocked'
  )),
  qbo_invoice_id      TEXT,
  campaign_invoice_id UUID,
  campaign_group_id   UUID,
  details             JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qbo_automation_log_created
  ON qbo_automation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qbo_automation_log_connection
  ON qbo_automation_log(connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qbo_automation_log_event_type
  ON qbo_automation_log(event_type);

ALTER TABLE qbo_automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on qbo_automation_log"
  ON qbo_automation_log FOR ALL USING (true) WITH CHECK (true);

-- 2. Commission and vendor payout eligibility on campaign_groups
ALTER TABLE campaign_groups
  ADD COLUMN IF NOT EXISTS commission_eligible       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_eligible_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vendor_payout_eligible    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vendor_payout_eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_verified_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_verified_source   TEXT;

-- 3. Index for financial dashboard queries on qbo_invoices
CREATE INDEX IF NOT EXISTS idx_qbo_invoices_balance
  ON qbo_invoices(connection_id, balance);
CREATE INDEX IF NOT EXISTS idx_qbo_invoices_campaign_link
  ON qbo_invoices(campaign_invoice_id) WHERE campaign_invoice_id IS NOT NULL;

-- 4. Index for payment date lookups
CREATE INDEX IF NOT EXISTS idx_qbo_payments_txn_date
  ON qbo_payments(connection_id, txn_date DESC);

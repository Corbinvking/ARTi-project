-- ============================================================================
-- QuickBooks Invoice Write-Back: link campaign_invoices to QBO invoices
-- ============================================================================

-- Add QBO tracking columns to campaign_invoices
ALTER TABLE IF EXISTS campaign_invoices
  ADD COLUMN IF NOT EXISTS qbo_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS qbo_sync_status TEXT DEFAULT 'not_synced'
    CHECK (qbo_sync_status IN ('not_synced', 'synced', 'error', 'pending')),
  ADD COLUMN IF NOT EXISTS qbo_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qbo_error_message TEXT;

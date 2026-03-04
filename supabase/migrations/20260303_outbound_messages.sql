-- ============================================================================
-- Outbound Messages: notification delivery audit trail
-- Migration: 20260303_outbound_messages.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS outbound_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel             TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient           TEXT NOT NULL,
  template_key        TEXT NOT NULL,
  provider            TEXT NOT NULL CHECK (provider IN ('sendgrid', 'twilio')),
  provider_message_id TEXT,
  status              TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sent', 'delivered', 'opened', 'bounced', 'failed'
  )),
  idempotency_key     TEXT UNIQUE NOT NULL,
  payload_json        JSONB DEFAULT '{}',
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_idempotency
  ON outbound_messages(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_provider_msg
  ON outbound_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outbound_messages_status
  ON outbound_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_recipient
  ON outbound_messages(recipient, created_at DESC);

ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on outbound_messages"
  ON outbound_messages FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_outbound_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_outbound_messages_updated_at
  BEFORE UPDATE ON outbound_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_outbound_messages_updated_at();

COMMENT ON TABLE outbound_messages IS 'Audit trail for all outbound email and WhatsApp notifications';
COMMENT ON COLUMN outbound_messages.idempotency_key IS 'Client-supplied key to prevent duplicate sends';
COMMENT ON COLUMN outbound_messages.provider_message_id IS 'ID returned by SendGrid or Twilio after successful send';

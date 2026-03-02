-- Invoice intake linkage and source invoice references

-- Make campaign_id optional on campaign_invoices for multi-service intake
alter table if exists campaign_invoices
  alter column campaign_id drop not null;

alter table if exists campaign_invoices
  add column if not exists services_selected text[],
  add column if not exists intake_payload jsonb,
  add column if not exists client_name text,
  add column if not exists client_email text;

-- Link campaigns/submissions back to invoice intake
alter table if exists campaign_submissions
  add column if not exists source_invoice_id uuid references campaign_invoices(id) on delete set null,
  add column if not exists invoice_status text default 'pending';

alter table if exists soundcloud_submissions
  add column if not exists source_invoice_id uuid references campaign_invoices(id) on delete set null,
  add column if not exists invoice_status text default 'pending';

alter table if exists youtube_campaigns
  add column if not exists source_invoice_id uuid references campaign_invoices(id) on delete set null;

alter table if exists campaigns
  add column if not exists source_invoice_id uuid references campaign_invoices(id) on delete set null,
  add column if not exists invoice_status text default 'pending';

alter table if exists instagram_campaigns
  add column if not exists source_invoice_id uuid references campaign_invoices(id) on delete set null,
  add column if not exists invoice_status text default 'pending';

alter table if exists campaign_groups
  add column if not exists source_invoice_id uuid references campaign_invoices(id) on delete set null;

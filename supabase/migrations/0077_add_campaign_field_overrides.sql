-- Manual overrides for auto-filled fields

create table if not exists campaign_field_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  service text not null,
  campaign_id text not null,
  field_key text not null,
  original_value text,
  override_value text,
  override_reason text,
  overridden_by uuid,
  overridden_at timestamptz not null default now(),
  reverted_at timestamptz
);

create index if not exists idx_campaign_field_overrides_service_campaign
  on campaign_field_overrides (service, campaign_id);

create index if not exists idx_campaign_field_overrides_lookup
  on campaign_field_overrides (service, campaign_id, field_key);

-- Notes system: internal/client notes + history

-- Spotify
alter table if exists campaign_submissions
  add column if not exists internal_notes text,
  add column if not exists client_notes text;

alter table if exists campaign_groups
  add column if not exists internal_notes text,
  add column if not exists client_notes text;

alter table if exists spotify_campaigns
  add column if not exists internal_notes text,
  add column if not exists client_notes text;

-- SoundCloud
alter table if exists soundcloud_submissions
  add column if not exists internal_notes text,
  add column if not exists client_notes text;

alter table if exists soundcloud_campaigns
  add column if not exists internal_notes text,
  add column if not exists client_notes text;

-- YouTube
alter table if exists youtube_campaigns
  add column if not exists internal_notes text,
  add column if not exists client_notes text;

-- Instagram seedstorm campaigns (public client portal)
alter table if exists campaigns
  add column if not exists internal_notes text,
  add column if not exists client_notes text;

-- History table
create table if not exists campaign_note_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  service text not null,
  campaign_id text not null,
  note_type text not null check (note_type in ('internal', 'client')),
  content text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_note_history_service_campaign
  on campaign_note_history (service, campaign_id);

create index if not exists idx_campaign_note_history_created_at
  on campaign_note_history (created_at desc);

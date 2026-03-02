-- Unify campaign status model across services

-- Expand SoundCloud submission status enum
alter type public.soundcloud_submission_status add value if not exists 'pending';
alter type public.soundcloud_submission_status add value if not exists 'ready';
alter type public.soundcloud_submission_status add value if not exists 'active';
alter type public.soundcloud_submission_status add value if not exists 'on_hold';

-- Expand YouTube campaign status enum
alter type public.youtube_campaign_status add value if not exists 'ready';
alter type public.youtube_campaign_status add value if not exists 'on_hold';

-- Normalize Spotify submissions
update public.campaign_submissions
set status = case
  when status in ('pending_approval', 'pending') then 'pending'
  when status = 'approved' then 'ready'
  when status = 'rejected' then 'on_hold'
  else status
end
where status in ('pending_approval', 'pending', 'approved', 'rejected');

alter table public.campaign_submissions
  alter column status set default 'pending';

-- Normalize Spotify campaign groups
update public.campaign_groups
set status = case
  when lower(status) in ('draft', 'pending') then 'pending'
  when lower(status) = 'active' then 'active'
  when lower(status) = 'complete' then 'complete'
  when lower(status) in ('cancelled', 'unreleased') then 'on_hold'
  else status
end
where status is not null;

alter table public.campaign_groups
  alter column status set default 'pending';

-- Normalize SoundCloud submissions
update public.soundcloud_submissions
set status = case
  when status = 'new' then 'pending'
  when status = 'approved' then 'active'
  when status = 'rejected' then 'on_hold'
  when status = 'complete' then 'complete'
  else status
end
where status in ('new', 'approved', 'rejected', 'complete');

alter table public.soundcloud_submissions
  alter column status set default 'pending';

-- Normalize YouTube campaigns
update public.youtube_campaigns
set status = case
  when status = 'paused' then 'on_hold'
  when status = 'pending' then 'pending'
  when status = 'active' then 'active'
  when status = 'complete' then 'complete'
  else status
end
where status in ('paused', 'pending', 'active', 'complete');

-- Normalize Instagram campaigns
update public.instagram_campaigns
set status = case
  when lower(status) = 'draft' then 'pending'
  when lower(status) = 'active' then 'active'
  when lower(status) in ('completed', 'complete') then 'complete'
  when lower(status) in ('paused', 'cancelled', 'unreleased') then 'on_hold'
  else status
end
where status is not null;

alter table public.instagram_campaigns
  alter column status set default 'pending';

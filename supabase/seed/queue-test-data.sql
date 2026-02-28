-- ============================================================================
-- Queue Test Data Seed
-- ============================================================================
-- Run via Supabase SQL editor or psql to populate the Queue page with sample
-- members and submissions across every status.
--
-- Safe to re-run: uses ON CONFLICT DO NOTHING so duplicates are skipped.
-- ============================================================================

-- Fixed UUIDs so the script is idempotent
DO $$
DECLARE
  org  UUID := '00000000-0000-0000-0000-000000000001';
  m1   UUID := 'a0000000-0000-0000-0000-000000000001';
  m2   UUID := 'a0000000-0000-0000-0000-000000000002';
  m3   UUID := 'a0000000-0000-0000-0000-000000000003';
  m4   UUID := 'a0000000-0000-0000-0000-000000000004';
  m5   UUID := 'a0000000-0000-0000-0000-000000000005';
  m6   UUID := 'a0000000-0000-0000-0000-000000000006';
BEGIN

  -- ========================================================================
  -- TEST MEMBERS
  -- ========================================================================
  INSERT INTO public.soundcloud_members
    (id, org_id, name, followers, size_tier, families, primary_email, status,
     monthly_submission_limit, monthly_credit_limit, net_credits, reach_factor)
  VALUES
    (m1, org, 'Alex Rivera',    45000, 'T3', ARRAY['Electronic','House'],       'alex@example.com',   'active', 4, 1000, 500,  0.060),
    (m2, org, 'Jordan Blake',   12000, 'T2', ARRAY['Dubstep','Trap'],           'jordan@example.com', 'active', 4, 800,  350,  0.055),
    (m3, org, 'Sam Chen',       78000, 'T3', ARRAY['Techno','Ambient'],         'sam@example.com',    'active', 4, 1200, 800,  0.065),
    (m4, org, 'Morgan Taylor',   5000, 'T1', ARRAY['Hip-Hop','R&B'],            'morgan@example.com', 'active', 4, 600,  200,  0.050),
    (m5, org, 'Casey Park',   120000, 'T4', ARRAY['House','Techno'],            'casey@example.com',  'active', 4, 1500, 1200, 0.070),
    (m6, org, 'Riley Quinn',    28000, 'T2', ARRAY['Drum & Bass','Electronic'], 'riley@example.com',  'active', 4, 900,  400,  0.058)
  ON CONFLICT (id) DO NOTHING;

  -- ========================================================================
  -- TEST SUBMISSIONS — spread across statuses
  -- ========================================================================

  -- 4 × pending
  INSERT INTO public.soundcloud_submissions
    (id, org_id, member_id, track_url, artist_name, track_name, family, subgenres, status, support_date, submitted_at)
  VALUES
    ('b0000000-0000-0000-0000-000000000001', org, m1,
     'https://soundcloud.com/axriv/midnight-drive', 'AXRIV', 'Midnight Drive',
     'House', ARRAY['Deep House'], 'pending',
     CURRENT_DATE + INTERVAL '14 days', now() - INTERVAL '2 hours'),

    ('b0000000-0000-0000-0000-000000000002', org, m2,
     'https://soundcloud.com/jblake/bassquake', 'JBLAKE', 'Bassquake',
     'Dubstep', ARRAY['Riddim'], 'pending',
     CURRENT_DATE + INTERVAL '10 days', now() - INTERVAL '5 hours'),

    ('b0000000-0000-0000-0000-000000000003', org, m4,
     'https://soundcloud.com/mtaylor/summer-nights', 'MTAYLOR', 'Summer Nights',
     'Hip-Hop', ARRAY['Lofi Hip-Hop'], 'pending',
     CURRENT_DATE + INTERVAL '18 days', now() - INTERVAL '1 day'),

    ('b0000000-0000-0000-0000-000000000004', org, m6,
     'https://soundcloud.com/rquinn/neurofunk-session', 'RQUINN', 'Neurofunk Session',
     'Drum & Bass', ARRAY['Neurofunk'], 'pending',
     CURRENT_DATE + INTERVAL '12 days', now() - INTERVAL '30 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- 3 × ready
  INSERT INTO public.soundcloud_submissions
    (id, org_id, member_id, track_url, artist_name, track_name, family, subgenres, status, support_date, submitted_at)
  VALUES
    ('b0000000-0000-0000-0000-000000000005', org, m3,
     'https://soundcloud.com/samchn/dawn-patrol', 'SAMCHN', 'Dawn Patrol',
     'Techno', ARRAY['Melodic Techno'], 'ready',
     CURRENT_DATE + INTERVAL '7 days', now() - INTERVAL '3 days'),

    ('b0000000-0000-0000-0000-000000000006', org, m5,
     'https://soundcloud.com/cpark/warehouse-001', 'CPARK', 'Warehouse 001',
     'Techno', ARRAY['Industrial Techno'], 'ready',
     CURRENT_DATE + INTERVAL '5 days', now() - INTERVAL '4 days'),

    ('b0000000-0000-0000-0000-000000000007', org, m1,
     'https://soundcloud.com/axriv/golden-hour', 'AXRIV', 'Golden Hour',
     'House', ARRAY['Progressive House'], 'ready',
     CURRENT_DATE + INTERVAL '9 days', now() - INTERVAL '2 days')
  ON CONFLICT (id) DO NOTHING;

  -- 3 × active
  INSERT INTO public.soundcloud_submissions
    (id, org_id, member_id, track_url, artist_name, track_name, family, subgenres, status, support_date, submitted_at)
  VALUES
    ('b0000000-0000-0000-0000-000000000008', org, m3,
     'https://soundcloud.com/samchn/afterglow', 'SAMCHN', 'Afterglow',
     'Ambient', ARRAY['Dark Ambient'], 'active',
     CURRENT_DATE + INTERVAL '2 days', now() - INTERVAL '6 days'),

    ('b0000000-0000-0000-0000-000000000009', org, m5,
     'https://soundcloud.com/cpark/peak-time', 'CPARK', 'Peak Time',
     'House', ARRAY['Tech House'], 'active',
     CURRENT_DATE + INTERVAL '1 day', now() - INTERVAL '5 days'),

    ('b0000000-0000-0000-0000-000000000010', org, m6,
     'https://soundcloud.com/rquinn/liquid-dreams', 'RQUINN', 'Liquid Dreams',
     'Drum & Bass', ARRAY['Liquid DnB'], 'active',
     CURRENT_DATE, now() - INTERVAL '7 days')
  ON CONFLICT (id) DO NOTHING;

  -- 3 × on_hold
  INSERT INTO public.soundcloud_submissions
    (id, org_id, member_id, track_url, artist_name, track_name, family, subgenres, status, notes, submitted_at)
  VALUES
    ('b0000000-0000-0000-0000-000000000011', org, m2,
     'https://soundcloud.com/jblake/drop-zone', 'JBLAKE', 'Drop Zone',
     'Trap', ARRAY['Festival Trap'], 'on_hold',
     'Track exceeds 30 minute limit', now() - INTERVAL '10 days'),

    ('b0000000-0000-0000-0000-000000000012', org, m4,
     'https://soundcloud.com/mtaylor/chill-vibes', 'MTAYLOR', 'Chill Vibes',
     'R&B', ARRAY['R&B'], 'on_hold',
     'Duplicate submission — same track submitted last month', now() - INTERVAL '8 days'),

    ('b0000000-0000-0000-0000-000000000013', org, m1,
     'https://soundcloud.com/axriv/old-school-mix', 'AXRIV', 'Old School Mix',
     'Electronic', ARRAY['Electro'], 'on_hold',
     'Back-catalog submission not accepted', now() - INTERVAL '12 days')
  ON CONFLICT (id) DO NOTHING;

END $$;

-- Quick verification
SELECT status, count(*) FROM public.soundcloud_submissions GROUP BY status ORDER BY status;

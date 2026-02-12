-- Seed soundcloud_genre_families with default genres when empty (so Repost Channel Genres dropdown has options)
INSERT INTO public.soundcloud_genre_families (org_id, name, active)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, name, true
FROM (VALUES
  ('Electronic'),
  ('Hip-Hop'),
  ('R&B'),
  ('Pop'),
  ('Rock'),
  ('Dubstep'),
  ('House'),
  ('Techno'),
  ('Trap'),
  ('Drum & Bass'),
  ('Indie'),
  ('Metal'),
  ('Jazz'),
  ('Ambient'),
  ('Other')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM public.soundcloud_genre_families LIMIT 1);

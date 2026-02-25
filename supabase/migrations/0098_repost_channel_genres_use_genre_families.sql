-- Allow soundcloud_repost_channel_genres to reference genre_families (used by app) so dropdown options populate.
-- Only when genre_families exists: drop FK to soundcloud_genre_families and add FK to genre_families.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'genre_families') THEN
    ALTER TABLE public.soundcloud_repost_channel_genres
      DROP CONSTRAINT IF EXISTS soundcloud_repost_channel_genres_genre_family_id_fkey;
    ALTER TABLE public.soundcloud_repost_channel_genres
      ADD CONSTRAINT soundcloud_repost_channel_genres_genre_family_id_fkey
      FOREIGN KEY (genre_family_id) REFERENCES public.genre_families(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Repost channel genre tags: store operator-assigned genre per Influence Planner network member
-- Run with: psql "$DATABASE_URL" -f scripts/apply-repost-channel-genres.sql
-- Or after SSH: psql "postgresql://user:pass@host:5432/postgres" -f apply-repost-channel-genres.sql

CREATE TABLE IF NOT EXISTS public.soundcloud_repost_channel_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_user_id TEXT NOT NULL UNIQUE,
  genre_family_id UUID NOT NULL REFERENCES public.soundcloud_genre_families(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soundcloud_repost_channel_genres_ip_user_id
  ON public.soundcloud_repost_channel_genres(ip_user_id);

CREATE INDEX IF NOT EXISTS idx_soundcloud_repost_channel_genres_genre_family_id
  ON public.soundcloud_repost_channel_genres(genre_family_id);

ALTER TABLE public.soundcloud_repost_channel_genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soundcloud_repost_channel_genres_authenticated" ON public.soundcloud_repost_channel_genres;
CREATE POLICY "soundcloud_repost_channel_genres_authenticated"
  ON public.soundcloud_repost_channel_genres
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_soundcloud_repost_channel_genres_updated_at ON public.soundcloud_repost_channel_genres;
CREATE TRIGGER update_soundcloud_repost_channel_genres_updated_at
  BEFORE UPDATE ON public.soundcloud_repost_channel_genres
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

COMMENT ON TABLE public.soundcloud_repost_channel_genres IS 'Operator-assigned genre per Influence Planner repost channel (ip_user_id from network/members API)';

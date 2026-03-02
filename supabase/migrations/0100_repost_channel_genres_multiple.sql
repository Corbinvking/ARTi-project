-- Allow multiple genre tags per channel: drop single-channel unique, add (ip_user_id, genre_family_id) unique
ALTER TABLE public.soundcloud_repost_channel_genres
  DROP CONSTRAINT IF EXISTS soundcloud_repost_channel_genres_ip_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_repost_channel_genres_ip_user_genre
  ON public.soundcloud_repost_channel_genres(ip_user_id, genre_family_id);

COMMENT ON TABLE public.soundcloud_repost_channel_genres IS 'Operator-assigned genre tags per Influence Planner repost channel (multiple genres per channel)';

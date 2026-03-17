-- Notification audit fixes:
-- 1) Move followed title snapshots to user scope to avoid cross-user state coupling.
-- 2) Allow authenticated users to insert their own notifications (for guest->account sync path).

CREATE TABLE IF NOT EXISTS public.followed_title_state_user (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  release_date DATE,
  status TEXT,
  number_of_seasons INTEGER,
  last_episode_air_date DATE,
  last_episode_season_number INTEGER,
  last_episode_number INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT followed_title_state_user_pkey PRIMARY KEY (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_followed_title_state_user_user_id
  ON public.followed_title_state_user (user_id);

CREATE INDEX IF NOT EXISTS idx_followed_title_state_user_movie_id
  ON public.followed_title_state_user (movie_id);

ALTER TABLE public.followed_title_state_user ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'followed_title_state_user'
      AND policyname = 'followed_title_state_user_select_own'
  ) THEN
    CREATE POLICY followed_title_state_user_select_own
      ON public.followed_title_state_user FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'followed_title_state_user'
      AND policyname = 'followed_title_state_user_insert_own'
  ) THEN
    CREATE POLICY followed_title_state_user_insert_own
      ON public.followed_title_state_user FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'followed_title_state_user'
      AND policyname = 'followed_title_state_user_update_own'
  ) THEN
    CREATE POLICY followed_title_state_user_update_own
      ON public.followed_title_state_user FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'followed_title_state_user'
      AND policyname = 'followed_title_state_user_delete_own'
  ) THEN
    CREATE POLICY followed_title_state_user_delete_own
      ON public.followed_title_state_user FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Backfill user-scoped snapshot rows from the old global snapshot when possible.
INSERT INTO public.followed_title_state_user (
  user_id,
  movie_id,
  media_type,
  tmdb_id,
  release_date,
  status,
  number_of_seasons,
  last_episode_air_date,
  last_episode_season_number,
  last_episode_number,
  updated_at
)
SELECT
  mf.user_id,
  fs.movie_id,
  fs.media_type,
  fs.tmdb_id,
  fs.release_date,
  fs.status,
  fs.number_of_seasons,
  fs.last_episode_air_date,
  fs.last_episode_season_number,
  fs.last_episode_number,
  now()
FROM public.followed_title_state fs
JOIN public.movie_followers mf ON mf.movie_id = fs.movie_id
ON CONFLICT (user_id, movie_id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_insert_own'
  ) THEN
    CREATE POLICY notifications_insert_own
      ON public.notifications FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
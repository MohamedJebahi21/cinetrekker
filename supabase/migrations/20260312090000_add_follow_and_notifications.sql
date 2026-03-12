-- ============================================================
-- Migration: add_follow_and_notifications
-- Adds movie_followers and notifications tables to support
-- the "follow movie / series" feature and notification system.
-- ============================================================

-- ------------------------------------------------------------
-- Table: movie_followers
-- Tracks which users are following which movies / series.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movie_followers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id    TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- A user can only follow a given movie once.
  CONSTRAINT movie_followers_user_movie_unique UNIQUE (user_id, movie_id)
);

-- Indexes for fast look-ups by user and by movie.
CREATE INDEX IF NOT EXISTS idx_movie_followers_user_id
  ON public.movie_followers (user_id);

CREATE INDEX IF NOT EXISTS idx_movie_followers_movie_id
  ON public.movie_followers (movie_id);

-- Row-Level Security
ALTER TABLE public.movie_followers ENABLE ROW LEVEL SECURITY;

-- Users can read only their own follow records.
CREATE POLICY "movie_followers_select_own"
  ON public.movie_followers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can follow movies for themselves only.
CREATE POLICY "movie_followers_insert_own"
  ON public.movie_followers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow (delete) only their own records.
CREATE POLICY "movie_followers_delete_own"
  ON public.movie_followers
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Table: notifications
-- Stores per-user notifications triggered by followed movies.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id    TEXT NOT NULL,
  type        TEXT NOT NULL,           -- e.g. 'new_episode', 'release', 'price_drop'
  message     TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for fast look-ups by user and by movie.
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_movie_id
  ON public.notifications (movie_id);

-- Composite index to efficiently fetch unread notifications for a user.
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read
  ON public.notifications (user_id, is_read);

-- Row-Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read only their own notifications.
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read (UPDATE).
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications.
CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Only trusted server-side callers (service role) can insert notifications.
-- Application code inserts via the service-role key; regular users cannot.
CREATE POLICY "notifications_insert_service_role"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);   -- service role sets no JWT uid

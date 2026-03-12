-- ============================================================
-- Migration: add_followed_title_state_and_notification_event_key
-- Adds state snapshot table and dedupe key for notifications.
-- ============================================================

-- Snapshot state for followed titles so cron jobs can detect changes.
CREATE TABLE IF NOT EXISTS public.followed_title_state (
  movie_id TEXT PRIMARY KEY,
  media_type TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  release_date DATE,
  status TEXT,
  number_of_seasons INTEGER,
  last_episode_air_date DATE,
  last_episode_season_number INTEGER,
  last_episode_number INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followed_title_state_media_type
  ON public.followed_title_state (media_type);

-- Add optional event key to notifications for dedupe-safe upserts.
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS event_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_event_key_unique
  ON public.notifications (user_id, event_key)
  WHERE event_key IS NOT NULL;

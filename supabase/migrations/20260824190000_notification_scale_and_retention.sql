-- ============================================================
-- Notification scale, grouping, and retention foundations
--
-- This migration is additive and idempotent. It never deletes or rewrites
-- existing user notifications. New worker metadata allows bounded, resumable
-- scheduled processing; new inbox metadata only applies to future deliveries
-- unless an operator explicitly opts into a separate archival task.
-- ============================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS group_key TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_active_user_created
  ON public.notifications (user_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_expiry
  ON public.notifications (expires_at)
  WHERE expires_at IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_group_active
  ON public.notifications (user_id, group_key, created_at DESC)
  WHERE group_key IS NOT NULL AND archived_at IS NULL;

-- One durable state row per deterministic scheduled worker. The service role
-- owns this table; no user policy is granted.
CREATE TABLE IF NOT EXISTS public.notification_worker_state (
  worker_name TEXT PRIMARY KEY,
  cursor_movie_id TEXT,
  last_started_at TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_worker_state ENABLE ROW LEVEL SECURITY;

INSERT INTO public.notification_worker_state (worker_name)
VALUES ('followed-title-updates')
ON CONFLICT (worker_name) DO NOTHING;

-- Fetch one deterministic page of unique followed titles. The function is
-- intentionally not granted to clients; the server job invokes it through the
-- service-role client. Cursor pagination prevents full-table fan-out.
CREATE OR REPLACE FUNCTION public.notification_followed_title_batch(
  after_movie_id TEXT DEFAULT NULL,
  batch_size INTEGER DEFAULT 25
)
RETURNS TABLE(movie_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mf.movie_id
  FROM public.movie_followers AS mf
  WHERE after_movie_id IS NULL OR mf.movie_id > after_movie_id
  GROUP BY mf.movie_id
  ORDER BY mf.movie_id ASC
  LIMIT LEAST(GREATEST(batch_size, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.notification_followed_title_batch(TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;

-- Read only the preference values the scheduled delivery worker needs. Missing
-- rows deliberately fall back to release_updates=true in worker code so a user
-- is never silently opted out because a legacy row has not been created yet.
CREATE INDEX IF NOT EXISTS idx_notification_preferences_release_updates
  ON public.notification_preferences (user_id)
  WHERE release_updates = TRUE;

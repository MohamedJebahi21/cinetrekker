-- Supports the authenticated notifications API query:
-- WHERE user_id = ? ORDER BY created_at DESC LIMIT/OFFSET.
-- The existing user_id index filters ownership but still requires a sort.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications (user_id, created_at DESC);

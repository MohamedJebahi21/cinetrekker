-- Add performance indexes for high-frequency user-scoped queries
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id ON public.user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watched_user_id ON public.user_watched(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_episodes_user_id ON public.watched_episodes(user_id);

-- Add unique constraint for upsert operations on user_watchlist
ALTER TABLE public.user_watchlist
ADD CONSTRAINT user_watchlist_user_media_unique UNIQUE (user_id, media_id, media_type);

-- Add unique constraint for upsert operations on user_watched
ALTER TABLE public.user_watched
ADD CONSTRAINT user_watched_user_media_unique UNIQUE (user_id, media_id, media_type);
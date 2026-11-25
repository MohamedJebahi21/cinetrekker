-- 1. Pin search_path on mutable trigger/helper functions
ALTER FUNCTION public.handle_new_follower_notification() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_comment_reply_notification() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_comment_likes_count() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog;

-- 2. Restrict direct RPC execution on internal trigger and service-only functions
REVOKE EXECUTE ON FUNCTION public.enforce_followed_show_episode_cursor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_comment_reply_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_follower_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_followed_show_episode_cursor_after_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notification_followed_title_batch(text, integer) FROM PUBLIC, anon, authenticated;

-- Authenticated-only episode progress RPCs should not be callable by anon
REVOKE EXECUTE ON FUNCTION public.mark_tv_episode_watched(integer, integer, integer, text, date, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_tv_episode_watched(integer, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_tv_episodes_batch(integer, jsonb, text, text, integer, integer, text) FROM PUBLIC, anon;

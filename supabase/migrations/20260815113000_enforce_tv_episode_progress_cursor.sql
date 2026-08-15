-- Enforce the denormalized followed_shows cursor from persisted episode rows.
-- This protects every existing episode RPC, including concurrent or out-of-order
-- actions, without relying on a client-provided cursor.

CREATE OR REPLACE FUNCTION public.sync_followed_show_episode_cursor(
  p_user_id UUID,
  p_show_id INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_season INTEGER;
  v_last_episode INTEGER;
BEGIN
  SELECT season_number, episode_number
  INTO v_last_season, v_last_episode
  FROM public.watched_episodes
  WHERE user_id = p_user_id AND show_id = p_show_id
  ORDER BY season_number DESC, episode_number DESC
  LIMIT 1;

  UPDATE public.followed_shows
  SET
    last_watched_season = COALESCE(v_last_season, 0),
    last_watched_episode = COALESCE(v_last_episode, 0)
  WHERE user_id = p_user_id AND show_id = p_show_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_followed_show_episode_cursor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_season INTEGER;
  v_last_episode INTEGER;
BEGIN
  SELECT season_number, episode_number
  INTO v_last_season, v_last_episode
  FROM public.watched_episodes
  WHERE user_id = NEW.user_id AND show_id = NEW.show_id
  ORDER BY season_number DESC, episode_number DESC
  LIMIT 1;

  NEW.last_watched_season := COALESCE(v_last_season, 0);
  NEW.last_watched_episode := COALESCE(v_last_episode, 0);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_followed_show_episode_cursor_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_followed_show_episode_cursor(OLD.user_id, OLD.show_id);
    RETURN OLD;
  END IF;

  PERFORM public.sync_followed_show_episode_cursor(NEW.user_id, NEW.show_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_followed_show_episode_cursor ON public.followed_shows;
CREATE TRIGGER enforce_followed_show_episode_cursor
BEFORE INSERT OR UPDATE OF last_watched_season, last_watched_episode
ON public.followed_shows
FOR EACH ROW
EXECUTE FUNCTION public.enforce_followed_show_episode_cursor();

DROP TRIGGER IF EXISTS sync_followed_show_episode_cursor_after_change ON public.watched_episodes;
CREATE TRIGGER sync_followed_show_episode_cursor_after_change
AFTER INSERT OR DELETE
ON public.watched_episodes
FOR EACH ROW
EXECUTE FUNCTION public.sync_followed_show_episode_cursor_after_change();

REVOKE ALL ON FUNCTION public.sync_followed_show_episode_cursor(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_followed_show_episode_cursor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_followed_show_episode_cursor_after_change() FROM PUBLIC;

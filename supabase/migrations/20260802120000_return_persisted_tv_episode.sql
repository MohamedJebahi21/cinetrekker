-- Return the committed episode row so the client can replace its optimistic
-- cache entry without issuing a competing post-mutation read.

DROP FUNCTION IF EXISTS public.mark_tv_episode_watched(
  INTEGER, INTEGER, INTEGER, TEXT, DATE, TEXT, TEXT
);

CREATE FUNCTION public.mark_tv_episode_watched(
  p_show_id INTEGER,
  p_season_number INTEGER,
  p_episode_number INTEGER,
  p_episode_name TEXT DEFAULT NULL,
  p_air_date DATE DEFAULT NULL,
  p_show_name TEXT DEFAULT NULL,
  p_poster_path TEXT DEFAULT NULL
)
RETURNS SETOF public.watched_episodes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.watched_episodes (
    user_id, show_id, season_number, episode_number, episode_name, air_date
  )
  VALUES (
    v_user_id, p_show_id, p_season_number, p_episode_number,
    p_episode_name, p_air_date
  )
  ON CONFLICT (user_id, show_id, season_number, episode_number)
  DO UPDATE SET
    episode_name = EXCLUDED.episode_name,
    air_date = EXCLUDED.air_date,
    watched_at = now();

  IF p_show_name IS NOT NULL THEN
    INSERT INTO public.followed_shows (
      user_id, show_id, show_name, poster_path,
      last_watched_season, last_watched_episode
    )
    VALUES (
      v_user_id, p_show_id, p_show_name, p_poster_path,
      p_season_number, p_episode_number
    )
    ON CONFLICT (user_id, show_id)
    DO UPDATE SET
      show_name = EXCLUDED.show_name,
      poster_path = EXCLUDED.poster_path,
      last_watched_season = p_season_number,
      last_watched_episode = p_episode_number;
  ELSE
    UPDATE public.followed_shows
    SET
      last_watched_season = p_season_number,
      last_watched_episode = p_episode_number
    WHERE user_id = v_user_id AND show_id = p_show_id;
  END IF;

  INSERT INTO public.user_watched (
    user_id, media_id, media_type, status, watched_at
  )
  VALUES (v_user_id, p_show_id, 'tv', 'watching', now())
  ON CONFLICT (user_id, media_id, media_type)
  DO UPDATE SET
    status = 'watching',
    watched_at = now();

  RETURN QUERY
  SELECT *
  FROM public.watched_episodes
  WHERE user_id = v_user_id
    AND show_id = p_show_id
    AND season_number = p_season_number
    AND episode_number = p_episode_number;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_tv_episode_watched(
  INTEGER, INTEGER, INTEGER, TEXT, DATE, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_tv_episode_watched(
  INTEGER, INTEGER, INTEGER, TEXT, DATE, TEXT, TEXT
) TO authenticated;

-- Keep the denormalized followed_shows cursor aligned with the furthest
-- persisted watched_episodes row. A user may mark episodes in any order, so
-- recording an older episode must never move the cursor backwards.

CREATE OR REPLACE FUNCTION public.mark_tv_episode_watched(
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
      last_watched_season = CASE
        WHEN (EXCLUDED.last_watched_season, EXCLUDED.last_watched_episode) >
             (public.followed_shows.last_watched_season, public.followed_shows.last_watched_episode)
          THEN EXCLUDED.last_watched_season
        ELSE public.followed_shows.last_watched_season
      END,
      last_watched_episode = CASE
        WHEN (EXCLUDED.last_watched_season, EXCLUDED.last_watched_episode) >
             (public.followed_shows.last_watched_season, public.followed_shows.last_watched_episode)
          THEN EXCLUDED.last_watched_episode
        ELSE public.followed_shows.last_watched_episode
      END;
  ELSE
    UPDATE public.followed_shows
    SET
      last_watched_season = CASE
        WHEN (p_season_number, p_episode_number) > (last_watched_season, last_watched_episode)
          THEN p_season_number
        ELSE last_watched_season
      END,
      last_watched_episode = CASE
        WHEN (p_season_number, p_episode_number) > (last_watched_season, last_watched_episode)
          THEN p_episode_number
        ELSE last_watched_episode
      END
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

CREATE OR REPLACE FUNCTION public.remove_tv_episode_watched(
  p_show_id INTEGER,
  p_season_number INTEGER,
  p_episode_number INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_season INTEGER;
  v_last_episode INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.watched_episodes
  WHERE user_id = v_user_id
    AND show_id = p_show_id
    AND season_number = p_season_number
    AND episode_number = p_episode_number;

  SELECT season_number, episode_number
  INTO v_last_season, v_last_episode
  FROM public.watched_episodes
  WHERE user_id = v_user_id AND show_id = p_show_id
  ORDER BY season_number DESC, episode_number DESC
  LIMIT 1;

  UPDATE public.followed_shows
  SET
    last_watched_season = COALESCE(v_last_season, 0),
    last_watched_episode = COALESCE(v_last_episode, 0)
  WHERE user_id = v_user_id AND show_id = p_show_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_tv_episodes_batch(
  p_show_id INTEGER,
  p_episodes JSONB,
  p_show_name TEXT DEFAULT NULL,
  p_poster_path TEXT DEFAULT NULL,
  p_last_watched_season INTEGER DEFAULT NULL,
  p_last_watched_episode INTEGER DEFAULT NULL,
  p_watched_status TEXT DEFAULT 'watching'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_episode JSONB;
  v_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_episodes IS NULL OR jsonb_typeof(p_episodes) <> 'array' THEN
    RAISE EXCEPTION 'p_episodes must be a JSON array';
  END IF;

  v_status := COALESCE(p_watched_status, 'watching');
  IF v_status NOT IN ('watching', 'completed', 'dropped', 'plan_to_watch') THEN
    RAISE EXCEPTION 'Invalid watched status';
  END IF;

  FOR v_episode IN SELECT value FROM jsonb_array_elements(p_episodes)
  LOOP
    INSERT INTO public.watched_episodes (
      user_id, show_id, season_number, episode_number, episode_name, air_date
    )
    VALUES (
      v_user_id,
      p_show_id,
      (v_episode->>'season_number')::INTEGER,
      (v_episode->>'episode_number')::INTEGER,
      v_episode->>'episode_name',
      NULLIF(v_episode->>'air_date', '')::DATE
    )
    ON CONFLICT (user_id, show_id, season_number, episode_number)
    DO UPDATE SET
      episode_name = EXCLUDED.episode_name,
      air_date = EXCLUDED.air_date,
      watched_at = now();
  END LOOP;

  IF p_last_watched_season IS NOT NULL AND p_last_watched_episode IS NOT NULL THEN
    IF p_show_name IS NOT NULL THEN
      INSERT INTO public.followed_shows (
        user_id, show_id, show_name, poster_path,
        last_watched_season, last_watched_episode
      )
      VALUES (
        v_user_id, p_show_id, p_show_name, p_poster_path,
        p_last_watched_season, p_last_watched_episode
      )
      ON CONFLICT (user_id, show_id)
      DO UPDATE SET
        show_name = EXCLUDED.show_name,
        poster_path = EXCLUDED.poster_path,
        last_watched_season = CASE
          WHEN (EXCLUDED.last_watched_season, EXCLUDED.last_watched_episode) >
               (public.followed_shows.last_watched_season, public.followed_shows.last_watched_episode)
            THEN EXCLUDED.last_watched_season
          ELSE public.followed_shows.last_watched_season
        END,
        last_watched_episode = CASE
          WHEN (EXCLUDED.last_watched_season, EXCLUDED.last_watched_episode) >
               (public.followed_shows.last_watched_season, public.followed_shows.last_watched_episode)
            THEN EXCLUDED.last_watched_episode
          ELSE public.followed_shows.last_watched_episode
        END;
    ELSE
      UPDATE public.followed_shows
      SET
        last_watched_season = CASE
          WHEN (p_last_watched_season, p_last_watched_episode) > (last_watched_season, last_watched_episode)
            THEN p_last_watched_season
          ELSE last_watched_season
        END,
        last_watched_episode = CASE
          WHEN (p_last_watched_season, p_last_watched_episode) > (last_watched_season, last_watched_episode)
            THEN p_last_watched_episode
          ELSE last_watched_episode
        END
      WHERE user_id = v_user_id AND show_id = p_show_id;
    END IF;
  END IF;

  INSERT INTO public.user_watched (
    user_id, media_id, media_type, status, watched_at
  )
  VALUES (v_user_id, p_show_id, 'tv', v_status, now())
  ON CONFLICT (user_id, media_id, media_type)
  DO UPDATE SET
    status = v_status,
    watched_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_tv_episode_watched(
  INTEGER, INTEGER, INTEGER, TEXT, DATE, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_tv_episode_watched(
  INTEGER, INTEGER, INTEGER
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_tv_episodes_batch(
  INTEGER, JSONB, TEXT, TEXT, INTEGER, INTEGER, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_tv_episode_watched(
  INTEGER, INTEGER, INTEGER, TEXT, DATE, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_tv_episode_watched(
  INTEGER, INTEGER, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_tv_episodes_batch(
  INTEGER, JSONB, TEXT, TEXT, INTEGER, INTEGER, TEXT
) TO authenticated;

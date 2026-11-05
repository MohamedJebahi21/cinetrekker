-- Suggest public members with overlapping watched titles without exposing
-- either member's watch history to the client.
CREATE OR REPLACE FUNCTION public.get_suggested_profiles_by_watched(
  result_limit integer DEFAULT 24
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  favorite_titles text[],
  created_at timestamptz,
  followers_count bigint,
  comments_count bigint,
  common_watches bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target.user_id,
    target.display_name,
    target.bio,
    COALESCE(target.avatar_url, target.profile_photo) AS avatar_url,
    target.favorite_titles,
    target.created_at,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = target.user_id) AS followers_count,
    (SELECT count(*) FROM public.comments c WHERE c.user_id = target.user_id) AS comments_count,
    count(DISTINCT (viewer_watched.media_id, viewer_watched.media_type)) AS common_watches
  FROM public.user_watched viewer_watched
  JOIN public.user_watched target_watched
    ON target_watched.media_id = viewer_watched.media_id
    AND target_watched.media_type = viewer_watched.media_type
    AND target_watched.user_id <> viewer_watched.user_id
  JOIN public.profiles target
    ON target.user_id = target_watched.user_id
    AND target.is_public = true
  WHERE auth.uid() IS NOT NULL
    AND viewer_watched.user_id = auth.uid()
    AND viewer_watched.status IS DISTINCT FROM 'plan_to_watch'
    AND target_watched.status IS DISTINCT FROM 'plan_to_watch'
  GROUP BY target.user_id, target.display_name, target.bio, target.avatar_url,
    target.profile_photo, target.favorite_titles, target.created_at
  ORDER BY common_watches DESC, target.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 24), 1), 48);
$$;

REVOKE ALL ON FUNCTION public.get_suggested_profiles_by_watched(integer) FROM public;
REVOKE ALL ON FUNCTION public.get_suggested_profiles_by_watched(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_suggested_profiles_by_watched(integer) TO authenticated;

COMMENT ON FUNCTION public.get_suggested_profiles_by_watched(integer)
  IS 'Returns public profiles ranked by overlap with the authenticated caller’s watched titles. Watch histories remain server-side; only an aggregate overlap count is returned.';

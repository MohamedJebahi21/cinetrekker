-- ============================================================
-- Migration: add_discoverable_private_profile_rpc
--
-- Members may be found by display name even when their profile is private.
-- Private results expose only a routeable identity (user_id, display_name)
-- and the privacy flag. They deliberately omit avatar, bio, favourites,
-- join date, tracking totals, social counts, activity, and all sensitive
-- profile preferences. Direct table reads remain owner-only under RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_discoverable_profiles(
  search_term text,
  result_limit integer DEFAULT 24
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  favorite_titles text[],
  is_public boolean,
  created_at timestamptz,
  followers_count bigint,
  comments_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized_search AS (
    SELECT NULLIF(btrim(search_term), '') AS term
  )
  SELECT
    p.user_id,
    p.display_name,
    CASE WHEN p.is_public OR p.user_id = auth.uid() THEN p.bio ELSE NULL END AS bio,
    CASE
      WHEN p.is_public OR p.user_id = auth.uid()
        THEN COALESCE(p.avatar_url, p.profile_photo)
      ELSE NULL
    END AS avatar_url,
    CASE WHEN p.is_public OR p.user_id = auth.uid() THEN p.favorite_titles ELSE NULL END AS favorite_titles,
    p.is_public,
    CASE WHEN p.is_public OR p.user_id = auth.uid() THEN p.created_at ELSE NULL END AS created_at,
    CASE
      WHEN p.is_public OR p.user_id = auth.uid()
        THEN (SELECT count(*) FROM public.follows f WHERE f.following_id = p.user_id)
      ELSE 0
    END AS followers_count,
    CASE
      WHEN p.is_public OR p.user_id = auth.uid()
        THEN (SELECT count(*) FROM public.comments c WHERE c.user_id = p.user_id)
      ELSE 0
    END AS comments_count
  FROM public.profiles p
  CROSS JOIN normalized_search search
  WHERE search.term IS NOT NULL
    AND lower(COALESCE(p.display_name, '')) LIKE '%' || lower(search.term) || '%'
  ORDER BY
    (p.is_public = true) DESC,
    CASE
      WHEN lower(COALESCE(p.display_name, '')) = lower(search.term) THEN 0
      ELSE 1
    END,
    p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 24), 1), 48);
$$;

CREATE OR REPLACE FUNCTION public.get_discoverable_profile_summary(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  favorite_genres integer[],
  favorite_titles text[],
  is_public boolean,
  created_at timestamptz,
  followers_count bigint,
  following_count bigint,
  comments_count bigint,
  movies_count bigint,
  episodes_count bigint,
  shows_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    CASE WHEN p.is_public OR p.user_id = auth.uid() THEN p.bio ELSE NULL END AS bio,
    CASE
      WHEN p.is_public OR p.user_id = auth.uid()
        THEN COALESCE(p.avatar_url, p.profile_photo)
      ELSE NULL
    END AS avatar_url,
    CASE WHEN p.is_public OR p.user_id = auth.uid() THEN p.favorite_genres ELSE NULL END AS favorite_genres,
    CASE WHEN p.is_public OR p.user_id = auth.uid() THEN p.favorite_titles ELSE NULL END AS favorite_titles,
    p.is_public,
    CASE WHEN p.is_public OR p.user_id = auth.uid() THEN p.created_at ELSE NULL END AS created_at,
    CASE
      WHEN p.is_public OR p.user_id = auth.uid()
        THEN (SELECT count(*) FROM public.follows f WHERE f.following_id = p.user_id)
      ELSE 0
    END AS followers_count,
    CASE
      WHEN p.is_public OR p.user_id = auth.uid()
        THEN (SELECT count(*) FROM public.follows f WHERE f.follower_id = p.user_id)
      ELSE 0
    END AS following_count,
    CASE
      WHEN p.is_public OR p.user_id = auth.uid()
        THEN (SELECT count(*) FROM public.comments c WHERE c.user_id = p.user_id)
      ELSE 0
    END AS comments_count,
    0::bigint AS movies_count,
    0::bigint AS episodes_count,
    0::bigint AS shows_count
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

REVOKE ALL ON FUNCTION public.search_discoverable_profiles(text, integer) FROM public;
REVOKE ALL ON FUNCTION public.get_discoverable_profile_summary(uuid) FROM public;

GRANT EXECUTE ON FUNCTION public.search_discoverable_profiles(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_discoverable_profile_summary(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.search_discoverable_profiles(text, integer)
  IS 'Searches member display names. Private matches expose only user_id, display_name, and is_public; all profile, social, and activity fields are null or zero.';
COMMENT ON FUNCTION public.get_discoverable_profile_summary(uuid)
  IS 'Returns public profile details for public or owned profiles, or a minimal identity-only shell for private profiles.';

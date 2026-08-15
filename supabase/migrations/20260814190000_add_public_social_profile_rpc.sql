-- ============================================================
-- Migration: add_public_social_profile_rpc
--
-- Provides curated, read-only social data for CineTrekker public profiles.
-- The profiles table contains private preference and age-related columns, so
-- the application must never grant direct broad SELECT access to it.
--
-- Every function below returns only an explicitly listed public slice, and
-- exposes a target profile only when it is public or belongs to the caller.
-- ============================================================

-- The existing production comments table predates spoiler support. Add the
-- non-null, default-false flag before exposing it through the public comment RPC.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS contains_spoiler boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_public_profile_summary(target_user_id uuid)
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
  comments_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.bio,
    COALESCE(p.avatar_url, p.profile_photo) AS avatar_url,
    p.favorite_genres,
    p.favorite_titles,
    p.is_public,
    p.created_at,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.user_id) AS followers_count,
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = p.user_id) AS following_count,
    (SELECT count(*) FROM public.comments c WHERE c.user_id = p.user_id) AS comments_count
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND (p.is_public = true OR p.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.list_public_profiles(
  search_term text DEFAULT NULL,
  result_limit integer DEFAULT 24
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  favorite_genres integer[],
  favorite_titles text[],
  created_at timestamptz,
  followers_count bigint,
  comments_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.bio,
    COALESCE(p.avatar_url, p.profile_photo) AS avatar_url,
    p.favorite_genres,
    p.favorite_titles,
    p.created_at,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.user_id) AS followers_count,
    (SELECT count(*) FROM public.comments c WHERE c.user_id = p.user_id) AS comments_count
  FROM public.profiles p
  WHERE p.is_public = true
    AND (
      NULLIF(btrim(search_term), '') IS NULL
      OR lower(COALESCE(p.display_name, '')) LIKE '%' || lower(btrim(search_term)) || '%'
    )
  ORDER BY
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.user_id) DESC,
    p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 24), 1), 48);
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_connections(
  target_user_id uuid,
  connection_kind text DEFAULT 'followers',
  result_limit integer DEFAULT 24
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  favorite_genres integer[],
  favorite_titles text[],
  created_at timestamptz,
  followers_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    related.user_id,
    related.display_name,
    related.bio,
    COALESCE(related.avatar_url, related.profile_photo) AS avatar_url,
    related.favorite_genres,
    related.favorite_titles,
    related.created_at,
    (SELECT count(*) FROM public.follows f_count WHERE f_count.following_id = related.user_id) AS followers_count
  FROM public.profiles target
  JOIN public.follows f
    ON (
      (connection_kind = 'followers' AND f.following_id = target.user_id)
      OR (connection_kind = 'following' AND f.follower_id = target.user_id)
    )
  JOIN public.profiles related
    ON related.user_id = CASE
      WHEN connection_kind = 'followers' THEN f.follower_id
      WHEN connection_kind = 'following' THEN f.following_id
      ELSE NULL
    END
  WHERE target.user_id = target_user_id
    AND (target.is_public = true OR target.user_id = auth.uid())
    AND related.is_public = true
    AND connection_kind IN ('followers', 'following')
  ORDER BY f.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 24), 1), 48);
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_comments(
  target_user_id uuid,
  result_limit integer DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  media_id integer,
  media_type text,
  content text,
  parent_id uuid,
  contains_spoiler boolean,
  likes_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.media_id,
    c.media_type,
    c.content,
    c.parent_id,
    c.contains_spoiler,
    c.likes_count,
    c.created_at,
    c.updated_at
  FROM public.comments c
  JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.user_id = target_user_id
    AND (p.is_public = true OR p.user_id = auth.uid())
  ORDER BY c.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 12), 1), 24);
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_summaries(target_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.bio,
    COALESCE(p.avatar_url, p.profile_photo) AS avatar_url
  FROM public.profiles p
  WHERE p.user_id = ANY(target_user_ids)
    AND (p.is_public = true OR p.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_summary(uuid) FROM public;
REVOKE ALL ON FUNCTION public.list_public_profiles(text, integer) FROM public;
REVOKE ALL ON FUNCTION public.get_public_profile_connections(uuid, text, integer) FROM public;
REVOKE ALL ON FUNCTION public.get_public_profile_comments(uuid, integer) FROM public;
REVOKE ALL ON FUNCTION public.get_public_profile_summaries(uuid[]) FROM public;

GRANT EXECUTE ON FUNCTION public.get_public_profile_summary(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profiles(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_connections(uuid, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_comments(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_summaries(uuid[]) TO anon, authenticated;

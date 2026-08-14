-- ============================================================
-- Migration: add_public_profile_rpc
-- Adds a curated, security-definer read for public profiles.
--
-- The profiles table has owner-only RLS (auth.uid() = user_id) and
-- holds sensitive columns (date_of_birth, content-safety / maturity
-- / filtering flags, and show_* preference toggles). A blanket
-- "USING (is_public = true)" SELECT policy would leak those columns.
--
-- Instead, this function returns ONLY the non-sensitive columns and
-- ONLY when the target profile is public, or the caller is its owner.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE (
  user_id         uuid,
  display_name    text,
  bio             text,
  profile_photo   text,
  favorite_genres integer[],
  favorite_titles text[],
  is_public       boolean,
  created_at      timestamptz
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
    p.profile_photo,
    p.favorite_genres,
    p.favorite_titles,
    p.is_public,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND (p.is_public = true OR p.user_id = auth.uid());
$$;

-- Lock down the default grant, then allow both anonymous (logged-out
-- visitors) and authenticated callers to execute. For anon, auth.uid()
-- is NULL, so only rows with is_public = true are ever returned.
REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;

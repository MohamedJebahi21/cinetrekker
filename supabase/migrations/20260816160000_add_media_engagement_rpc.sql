-- ============================================================
-- Migration: add_media_engagement_rpc
--
-- Provides aggregate, public social proof for media cards without
-- exposing individual users, watchlists, or comment contents.
-- This migration is intentionally local until the provider change is
-- explicitly approved and applied through the normal Supabase workflow.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_media_engagement(
  p_media_ids integer[],
  p_media_types text[]
)
RETURNS TABLE (
  media_id integer,
  media_type text,
  comment_count bigint,
  tracking_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input_media AS (
    SELECT
      requested.media_id,
      requested.media_type
    FROM unnest(p_media_ids, p_media_types) AS requested(media_id, media_type)
    WHERE requested.media_id IS NOT NULL
      AND requested.media_type IN ('movie', 'tv')
  ),
  comment_counts AS (
    SELECT
      c.media_id,
      c.media_type,
      count(*)::bigint AS comment_count
    FROM public.comments c
    JOIN input_media requested
      ON requested.media_id = c.media_id
     AND requested.media_type = c.media_type
    GROUP BY c.media_id, c.media_type
  ),
  tracked_by_user AS (
    SELECT uw.user_id, uw.media_id, uw.media_type
    FROM public.user_watchlist uw
    JOIN input_media requested
      ON requested.media_id = uw.media_id
     AND requested.media_type = uw.media_type
    UNION
    SELECT watched.user_id, watched.media_id, watched.media_type
    FROM public.user_watched watched
    JOIN input_media requested
      ON requested.media_id = watched.media_id
     AND requested.media_type = watched.media_type
  ),
  tracking_counts AS (
    SELECT
      tracked.media_id,
      tracked.media_type,
      count(*)::bigint AS tracking_count
    FROM tracked_by_user tracked
    GROUP BY tracked.media_id, tracked.media_type
  )
  SELECT
    requested.media_id,
    requested.media_type,
    COALESCE(comments.comment_count, 0)::bigint AS comment_count,
    COALESCE(tracking.tracking_count, 0)::bigint AS tracking_count
  FROM input_media requested
  LEFT JOIN comment_counts comments
    ON comments.media_id = requested.media_id
   AND comments.media_type = requested.media_type
  LEFT JOIN tracking_counts tracking
    ON tracking.media_id = requested.media_id
   AND tracking.media_type = requested.media_type;
$$;

REVOKE ALL ON FUNCTION public.get_media_engagement(integer[], text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_media_engagement(integer[], text[]) TO anon, authenticated;

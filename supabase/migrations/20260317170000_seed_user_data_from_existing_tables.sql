-- Backfill content for newly added tables using existing real user data.
-- Safe to re-run.

-- 1) Ensure every auth user has a profile row.
INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 2) Backfill follow table from followed_shows.
INSERT INTO public.movie_followers (user_id, movie_id, created_at)
SELECT
  fs.user_id,
  fs.show_id::text,
  COALESCE(fs.followed_at, now())
FROM public.followed_shows fs
ON CONFLICT (user_id, movie_id) DO NOTHING;

-- 3) Backfill followed title state from followed_shows.
INSERT INTO public.followed_title_state (
  movie_id,
  media_type,
  tmdb_id,
  status,
  last_episode_season_number,
  last_episode_number,
  updated_at
)
SELECT
  fs.show_id::text,
  'tv',
  fs.show_id,
  'following',
  fs.last_watched_season,
  fs.last_watched_episode,
  now()
FROM public.followed_shows fs
ON CONFLICT (movie_id) DO UPDATE
SET
  media_type = EXCLUDED.media_type,
  tmdb_id = EXCLUDED.tmdb_id,
  status = EXCLUDED.status,
  last_episode_season_number = EXCLUDED.last_episode_season_number,
  last_episode_number = EXCLUDED.last_episode_number,
  updated_at = now();

-- 4) Backfill profile favorites from highest-rated watched content.
WITH ranked AS (
  SELECT
    uw.user_id,
    uw.media_type,
    uw.media_id,
    ROW_NUMBER() OVER (
      PARTITION BY uw.user_id, uw.media_type
      ORDER BY COALESCE(uw.rating, 0) DESC, COALESCE(uw.watched_at, now()) DESC
    ) AS rn
  FROM public.user_watched uw
),
selected AS (
  SELECT
    user_id,
    (media_type || '-' || media_id::text) AS fav_key,
    media_type,
    rn
  FROM ranked
  WHERE rn <= 4
),
aggregated AS (
  SELECT
    user_id,
    ARRAY_AGG(fav_key ORDER BY media_type, rn) AS fav_keys
  FROM selected
  GROUP BY user_id
)
UPDATE public.profiles p
SET
  favorite_titles = a.fav_keys,
  updated_at = now()
FROM aggregated a
WHERE p.user_id = a.user_id
  AND (p.favorite_titles IS NULL OR cardinality(p.favorite_titles) = 0);

-- 5) Backfill cache rows for users with followed shows.
INSERT INTO public.new_episodes_cache (user_id, episodes, updated_at, created_at)
SELECT
  fs.user_id,
  '[]'::jsonb,
  now(),
  now()
FROM public.followed_shows fs
GROUP BY fs.user_id
ON CONFLICT (user_id) DO NOTHING;

-- 6) Create default collections for each user if missing.
INSERT INTO public.collections (user_id, name, description, items, created_at, updated_at)
SELECT
  p.user_id,
  seed.name,
  seed.description,
  '[]'::jsonb,
  now(),
  now()
FROM public.profiles p
CROSS JOIN (
  VALUES
    ('Favorites', 'Pinned favorite titles'),
    ('Watchlist', 'Imported from your watchlist'),
    ('Watched', 'Imported from your watched history')
) AS seed(name, description)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.collections c
  WHERE c.user_id = p.user_id AND c.name = seed.name
);

-- 7) Fill Watchlist collection items from user_watchlist.
INSERT INTO public.collection_items (collection_id, media_id, media_type, added_at)
SELECT
  c.id,
  uw.media_id,
  uw.media_type,
  COALESCE(uw.added_at, now())
FROM public.collections c
JOIN public.user_watchlist uw ON uw.user_id = c.user_id
WHERE c.name = 'Watchlist'
ON CONFLICT (collection_id, media_id, media_type) DO NOTHING;

-- 8) Fill Watched collection items from user_watched.
INSERT INTO public.collection_items (collection_id, media_id, media_type, added_at)
SELECT
  c.id,
  uw.media_id,
  uw.media_type,
  COALESCE(uw.watched_at, now())
FROM public.collections c
JOIN public.user_watched uw ON uw.user_id = c.user_id
WHERE c.name = 'Watched'
ON CONFLICT (collection_id, media_id, media_type) DO NOTHING;

-- 9) Fill Favorites collection from profile.favorite_titles.
INSERT INTO public.collection_items (collection_id, media_id, media_type, added_at)
SELECT
  c.id,
  split_part(fav_key, '-', 2)::bigint AS media_id,
  split_part(fav_key, '-', 1) AS media_type,
  now()
FROM public.collections c
JOIN public.profiles p ON p.user_id = c.user_id
CROSS JOIN LATERAL unnest(COALESCE(p.favorite_titles, '{}'::text[])) AS fav_key
WHERE c.name = 'Favorites'
  AND split_part(fav_key, '-', 1) IN ('movie', 'tv')
  AND split_part(fav_key, '-', 2) ~ '^[0-9]+$'
ON CONFLICT (collection_id, media_id, media_type) DO NOTHING;

-- 10) Seed one welcome notification per user if notifications are empty for them.
INSERT INTO public.notifications (user_id, movie_id, type, message, is_read, created_at, event_key)
SELECT
  p.user_id,
  'system',
  'system',
  'Your notifications are ready. Follow titles to receive updates.',
  FALSE,
  now(),
  'seed-welcome-v1'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications n
  WHERE n.user_id = p.user_id
);

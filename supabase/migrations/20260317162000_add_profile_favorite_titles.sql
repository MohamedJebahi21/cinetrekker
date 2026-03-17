-- Persist user-pinned favorite movies/series directly on profiles.
-- Uses text keys like: movie-123, tv-456

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS favorite_titles TEXT[] NOT NULL DEFAULT '{}';

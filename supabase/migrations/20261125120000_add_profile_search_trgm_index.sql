-- Additive, non-destructive trigram index to accelerate public profile search
-- in public.list_public_profiles() without full-table sequential scans.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_public_display_name_trgm
  ON public.profiles
  USING gin (lower(COALESCE(display_name, '')) gin_trgm_ops)
  WHERE is_public = true;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS maturity_rating TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS content_policy_confirmed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_maturity_rating_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_maturity_rating_check
CHECK (maturity_rating IN ('strict', 'moderate', 'none'));

UPDATE public.profiles
SET maturity_rating = CASE
  WHEN strict_filtering_enabled = TRUE THEN 'strict'
  WHEN moderate_filtering_enabled = TRUE THEN 'moderate'
  WHEN age_verified IS NOT NULL AND age_verified < 18 THEN 'strict'
  WHEN adult_content_enabled = TRUE THEN 'none'
  ELSE 'none'
END
WHERE maturity_rating IS NULL OR maturity_rating NOT IN ('strict', 'moderate', 'none');

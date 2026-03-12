-- Add age verification and adult-content preference fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age_verified SMALLINT,
ADD COLUMN IF NOT EXISTS adult_content_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_age_verified_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_age_verified_check
CHECK (age_verified IS NULL OR (age_verified >= 0 AND age_verified <= 120));

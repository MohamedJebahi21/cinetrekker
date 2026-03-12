ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS strict_filtering_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS moderate_filtering_enabled BOOLEAN NOT NULL DEFAULT false;

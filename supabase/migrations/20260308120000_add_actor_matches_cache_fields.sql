-- Add actor matches cache fields to profiles for cross-device sync
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS actor_matches JSONB,
ADD COLUMN IF NOT EXISTS actor_matches_context JSONB,
ADD COLUMN IF NOT EXISTS actor_matches_updated_at TIMESTAMP WITH TIME ZONE;

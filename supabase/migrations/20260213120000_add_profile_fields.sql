-- Add missing profile fields to support profile synchronization across devices
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS profile_photo TEXT,
ADD COLUMN IF NOT EXISTS favorite_genres INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_watchlist BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_stats BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_recommendations BOOLEAN DEFAULT true;

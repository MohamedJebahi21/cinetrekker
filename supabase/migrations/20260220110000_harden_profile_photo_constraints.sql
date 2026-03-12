-- Harden profile photo validation at database layer
-- Enforces image data URL format and size limits for profile_photo

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_profile_photo_format_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_profile_photo_format_check
CHECK (
  profile_photo IS NULL OR (
    profile_photo ~ '^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$'
    AND char_length(profile_photo) <= 3000000
  )
);

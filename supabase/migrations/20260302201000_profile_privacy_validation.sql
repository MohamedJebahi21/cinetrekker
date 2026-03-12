ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_age boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_profile_text_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.display_name IS NOT NULL THEN
    NEW.display_name := btrim(NEW.display_name);

    IF char_length(NEW.display_name) > 100 THEN
      RAISE EXCEPTION 'display_name too long';
    END IF;

    IF NEW.display_name ~* '[<>]|javascript:|data:text/html' THEN
      RAISE EXCEPTION 'display_name contains unsafe content';
    END IF;
  END IF;

  IF NEW.bio IS NOT NULL THEN
    NEW.bio := btrim(NEW.bio);

    IF char_length(NEW.bio) > 500 THEN
      RAISE EXCEPTION 'bio too long';
    END IF;

    IF NEW.bio ~* '<[^>]*>|javascript:|data:text/html|onerror\s*=|onload\s*=' THEN
      RAISE EXCEPTION 'bio contains unsafe content';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_text_fields ON public.profiles;

CREATE TRIGGER trg_validate_profile_text_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_text_fields();

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_display_name_safe_chk;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_display_name_safe_chk
CHECK (
  display_name IS NULL
  OR (
    char_length(display_name) <= 100
    AND display_name !~* '[<>]|javascript:|data:text/html'
  )
);

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_bio_safe_chk;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_bio_safe_chk
CHECK (
  bio IS NULL
  OR (
    char_length(bio) <= 500
    AND bio !~* '<[^>]*>|javascript:|data:text/html|onerror\s*=|onload\s*='
  )
);

-- Fix handle_new_user trigger to populate user_id and synchronize id
-- This migration fixes the critical signup bug where profiles.user_id was not being populated.
-- It also ensures that profiles.id and profiles.user_id are synchronized with auth.users.id.
-- Finally, it correctly extracts the username from raw_user_meta_data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, display_name)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- The trigger 'on_auth_user_created' already exists and points to this function,
-- so we only need to update the function definition.

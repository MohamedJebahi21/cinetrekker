-- CineTrekker: Automated reply notifications
-- Delivers a notification when a user replies to another user's comment.

CREATE OR REPLACE FUNCTION public.handle_comment_reply_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_user_id uuid;
  v_replier_name text;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_parent_user_id
  FROM public.comments
  WHERE id = NEW.parent_id;

  -- Do not notify if replying to own comment or parent not found
  IF v_parent_user_id IS NULL OR v_parent_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Look up replier name from profiles
  SELECT COALESCE(display_name, 'Someone') INTO v_replier_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_replier_name IS NULL OR v_replier_name = '' THEN
    v_replier_name := 'Someone';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    movie_id,
    event_key,
    type,
    message,
    is_read
  ) VALUES (
    v_parent_user_id,
    NEW.media_type || '-' || NEW.media_id,
    'reply:' || NEW.id,
    'reply',
    v_replier_name || ' replied to your comment.',
    false
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail comment creation if notification delivery hits any error
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_reply_notification ON public.comments;

CREATE TRIGGER trg_comment_reply_notification
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_comment_reply_notification();

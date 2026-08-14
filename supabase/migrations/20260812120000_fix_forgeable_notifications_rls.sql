-- Security fix: remove the forgeable-notifications INSERT policy.
--
-- The policy `notifications_insert_service_role` used
--   WITH CHECK (auth.uid() IS NULL)
-- intending to permit "only the service role" (which sets no JWT uid). That
-- reasoning is wrong on both sides:
--
--   * The service role BYPASSES RLS entirely, so this policy granted it nothing
--     it did not already have.
--   * The `anon` role ALSO has auth.uid() = NULL. Since INSERT policies are
--     permissive (OR-combined) and this one had no `TO` clause, any
--     unauthenticated client using the public anon key (shipped in the frontend
--     bundle) satisfied the check and could INSERT arbitrary notification rows
--     for ANY user_id, with any message/type. That allows forged/phishing
--     notifications in any user's feed.
--
-- Legitimate insert paths are preserved after this change:
--   * authenticated users -> `notifications_insert_own` (auth.uid() = user_id),
--     which only permits notifications addressed to the caller themselves.
--   * trusted server-side callers -> the service role, which bypasses RLS.
--
-- (Cross-user notifications, e.g. "X liked your comment", should be created by a
--  service-role / SECURITY DEFINER server path rather than the client. That is a
--  separate change and is intentionally out of scope here.)

-- Ensure the legitimate authenticated self-insert policy exists before we drop
-- the forgeable one, so this migration is self-sufficient on any environment.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_insert_own'
  ) THEN
    CREATE POLICY notifications_insert_own
      ON public.notifications FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Drop the forgeable policy wherever it still exists.
DROP POLICY IF EXISTS "notifications_insert_service_role" ON public.notifications;

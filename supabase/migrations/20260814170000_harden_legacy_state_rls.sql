-- Apply All security hardening
--
-- The active follow-notification path uses followed_title_state_user, which is
-- user-scoped and already protected by owner policies. The older global
-- followed_title_state table is no longer read by the frontend or API handlers.
-- Some environments already removed it through
-- 20260613170000_drop_legacy_followed_title_state.sql, so keep this hardening
-- step conditional and do not block later migrations when it is absent.

DO $$
BEGIN
  IF to_regclass('public.followed_title_state') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.followed_title_state ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.followed_title_state FROM anon, authenticated';
  END IF;
END
$$;

-- Make the cache policies explicit about which JWT roles they target. The
-- service role bypasses RLS in Supabase, but an explicit policy documents and
-- preserves the intended background-job contract for environments that inspect
-- policy definitions directly.
DROP POLICY IF EXISTS "Users can read own episode cache"
  ON public.new_episodes_cache;
CREATE POLICY "Users can read own episode cache"
  ON public.new_episodes_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage cache"
  ON public.new_episodes_cache;
CREATE POLICY "Service role can manage cache"
  ON public.new_episodes_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

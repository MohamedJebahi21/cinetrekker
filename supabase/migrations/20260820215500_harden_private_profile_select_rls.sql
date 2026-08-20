-- ============================================================
-- Migration: harden_private_profile_select_rls
--
-- Direct SELECT access to public.profiles must be owner-only. Public social
-- views are served exclusively by curated SECURITY DEFINER RPCs
-- (get_public_profile*, list_public_profiles) so sensitive preference and
-- personal columns can never be exposed through a direct table query.
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- This historical permissive policy grants table-row reads to every caller.
-- Remove it explicitly; do not add another public table policy because RLS
-- combines permissive policies with OR semantics.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Make this migration idempotent while retaining any separate owner-only
-- policies that may already exist from earlier schema versions.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Public profiles remain available only through the curated public-profile
-- RPCs, which explicitly select non-sensitive fields.

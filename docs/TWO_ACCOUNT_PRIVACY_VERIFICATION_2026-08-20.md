# Two-Account Privacy Verification

**Date:** 20 August 2026  
**Environment:** CineTrekker production Supabase project  
**Method:** Two newly created, clearly labelled disposable accounts. No existing user account or social record was read, changed, or deleted.

## Outcome

The authorised privacy gate is **completed after remediation**. The initial run exposed a real access-control defect: a signed-in non-owner could read a private profile through a direct `public.profiles` query. The exposure included 19 fields, including `date_of_birth`, `email`, preference flags, and recommendation-cache fields.

The cause was the permissive `Profiles are viewable by everyone` policy. It was removed from production, and the owner-only `profiles_select_own` direct-read policy was retained. Public profile pages continue to use the pre-existing curated public-profile RPCs rather than direct table reads.

| Check | Final result | Evidence |
|---|---|---|
| Private profile hidden through public profile RPC | **Pass** | A non-owner received zero rows when the disposable target was private. |
| Direct private profile table read blocked | **Pass after remediation** | A non-owner received HTTP 200 with zero rows and no field names. |
| Cross-account profile modification blocked | **Pass** | An attempted non-owner update left the test owner’s display name unchanged. |
| Authorized follow and public connection rendering | **Pass** | The disposable follower appeared through the curated public connection RPC. |
| Cross-account comment deletion blocked | **Pass** | The comment remained visible to its owner after the non-owner deletion attempt. |
| Authorized comment like | **Pass** | The disposable account could like the authorised public test comment. |
| Cross-account notification read blocked | **Pass** | The non-owner received no rows for the target account’s notification. |
| Cross-account notification forgery blocked | **Pass** | The attempt was rejected with HTTP 403. |
| Owner direct profile access | **Pass** | The owner read exactly one own profile row. |
| Curated public profile access | **Pass** | A public disposable profile remained visible through `get_public_profile_summary`. |
| Direct public profile table read | **Pass after remediation** | A non-owner received zero rows even while the test profile was public. |

## Production remediation

The production change removed only the identified permissive policy:

```sql
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
```

The direct table access model is now owner-only:

```sql
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);
```

The repository includes the equivalent durable migration at `supabase/migrations/20260820215500_harden_private_profile_select_rls.sql` and a static regression contract at `tests/profile-privacy-rls.test.mjs`.

## Test-data cleanup

All test-created follow, comment, comment-like, and marker notification rows were removed. Both disposable profiles were restored to a private, inactive state. The disposable authentication identities remain only because the available project credential does not have authority to delete auth users; they contain no public bio and no test social content.

> The disposable accounts were retained solely as private inactive identities so the final access-control verification remains reproducible. They must not be used for product activity.

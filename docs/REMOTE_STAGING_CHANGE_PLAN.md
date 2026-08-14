# CineTrekker Remote Staging Change Plan

**Current state:** Safe local preparation is complete. The target Supabase migration history and Vercel staging configuration cannot be read from the currently available connections. The Vercel connector is disabled; the enabled Supabase API connection does not expose migration metadata with the available credential.

## Authorization bundle A: Supabase migration comparison and application

| Item | Planned action | Mutation status | Acceptance criterion | Rollback/precaution |
| --- | --- | --- | --- | --- |
| A1 | Connect to the user-designated **staging** Supabase project and read its applied migration history. | Read-only | A local-vs-remote missing-migration list is produced. | No mutation. Stop if the target cannot be identified as staging. |
| A2 | Apply only the missing local migrations in timestamp order, using the generated manifest and no database reset. | Remote database mutation | Migration execution completes without error. | Take/confirm a backup under the project’s operational process first; stop on the first error. |
| A3 | Perform read-only post-apply checks for the signup trigger, user/profile alignment, RLS policies, notification indexes, and expected RPCs. | Read-only | All expected objects and policies are present. | Do not create test users in this bundle. |

## Authorization bundle B: Staging platform and Auth configuration

| Item | Planned action | Mutation status | Acceptance criterion | Rollback/precaution |
| --- | --- | --- | --- | --- |
| B1 | Configure the staging Vercel project with the required variable names and user-provided values. | Remote platform mutation | Vercel reports the expected names at the staging scope. | Never print values; do not configure any production scope. |
| B2 | Set the Supabase staging Site URL and exact Redirect URLs for `/auth/callback` and `/auth`. Decide and set email-confirmation behavior. | Remote Auth mutation | Auth configuration matches the staging domain and product decision. | Keep production URLs/settings unchanged. |
| B3 | Configure and enable the Google provider with the user’s Google OAuth client credentials and approved origin/callback URLs. | Remote Auth/Google mutation | The provider appears enabled in staging and initiates OAuth successfully. | Stop if credentials or staging domain are unavailable; do not invent values. |
| B4 | Deploy the current local commit/build to the user-designated staging Vercel project. | Remote deployment | Staging deployment becomes healthy and serves the expected revision. | Do not deploy production; preserve previous staging deployment for rollback. |

## Authorization bundle C: Controlled staging validation

| Item | Planned action | Mutation status | Acceptance criterion | Cleanup |
| --- | --- | --- | --- | --- |
| C1 | Create two clearly marked disposable staging accounts. | Remote Auth/data mutation | User A and User B can perform the authentication matrix. | Delete test accounts/data only after results are captured and only with approval. |
| C2 | Run the two-user RLS isolation procedure. | Remote test-data mutation | Cross-user reads/writes fail, while owner actions succeed. | Restrict all records to test identities. |
| C3 | Exercise TMDB proxy, rate limiting, CAPTCHA/feedback, and cron using staging-safe test cases. | Remote invocation; feedback may send a test email | Expected success/failure states are observed without real user impact. | Target staging only; use non-production mailbox and data. |
| C4 | Trigger a controlled frontend monitoring event and inspect staging error visibility. | Remote monitoring event | Browser Sentry capture or documented Vercel-log evidence is present. | No tokens or personal data in the test payload. |

## Required information before authorization

The safe local work does not identify an actual staging project or domain. Before any remote bundle can run, provide or confirm the following information:

| Needed | Why it is needed |
| --- | --- |
| The exact staging Supabase project and staging Vercel project/domain | Prevents accidental mutation of production. |
| Whether to use a separate staging Supabase project or the existing reachable project | The existing reachable project’s environment identity is not established. |
| Whether staging should require email confirmation | The reachable Auth settings currently report automatic confirmation. |
| Google OAuth client credentials and confirmation that they are for staging | Google remains disabled; credentials cannot be inferred or created. |
| Secure values for the required Vercel/Supabase variables, or confirmation that they are already stored in the intended target | Values must never be printed or guessed. |

No remote action will run until the relevant bundle is explicitly authorized.

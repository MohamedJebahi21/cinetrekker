# CineTrekker Staging Execution Todo List

This todo list turns the staging-readiness findings into an execution sequence. **Safe local and read-only checks may proceed automatically. Every remote mutation requires explicit confirmation immediately before it is performed.**

| ID | Priority | Task | Execution boundary | Status |
| --- | --- | --- | --- | --- |
| S1 | P0 | Preserve and re-run local regression coverage for the migration-order and Vercel Cron fixes. | Local only; no confirmation required. | Complete |
| S2 | P0 | Produce a migration manifest with ordered filenames, checksums, and post-apply validation queries. | Local only; no confirmation required. | Complete |
| S3 | P0 | Produce a staging configuration manifest listing required variables by name and scope, without values. | Local only; no confirmation required. | Complete |
| S4 | P0 | Prepare executable but non-running scripts for authentication, RLS, TMDB, rate-limit, and cron validation. | Local files only; no confirmation required. | Complete |
| S5 | P0 | Inspect read-only Supabase Auth settings and project reachability, without changing data or configuration. | Read-only external inspection; no confirmation required. | Complete |
| S6 | P0 | Compare the remote Supabase migration history with the local manifest. | Read-only remote database/project inspection; no confirmation required when authorized connectivity is available. | Blocked: no CLI/admin migration access is available. |
| S7 | P0 | Apply only missing Supabase migrations in the validated order. | **Remote database mutation; explicit confirmation required.** | Pending confirmation |
| S8 | P0 | Configure target Vercel server/client environment variables by name and scope. | **Remote Vercel mutation; explicit confirmation required.** | Pending confirmation |
| S9 | P0 | Set Supabase Site URL/Redirect URLs, decide email-confirmation behavior, and enable/configure Google OAuth. | **Remote Supabase and Google OAuth mutation; explicit confirmation required.** | Pending confirmation |
| S10 | P0 | Deploy the staging build after configuration and migration changes. | **Remote deployment; explicit confirmation required.** | Pending confirmation |
| S11 | P0 | Create two disposable staging users and execute the authentication and RLS isolation matrix. | **Remote user/data creation; explicit confirmation required.** | Pending confirmation |
| S12 | P0 | Perform a controlled staging TMDB, Upstash, feedback/CAPTCHA, and Vercel Cron validation. | **External runtime invocation; explicit confirmation required.** | Pending confirmation |
| S13 | P1 | Verify frontend Sentry capture and decide whether server/cron capture must be added or Vercel Logs/alerts are sufficient. | Read-only inspection is safe; any configuration or implementation change requires confirmation. | Pending configuration decision |
| S14 | P1 | Repeat browser acceptance testing over the deployed staging URL on desktop and mobile. | Safe only after a staging deployment and test identities exist. | Pending staging availability |
| S15 | P0 | Update the launch decision using only demonstrated staging evidence. | Documentation only; no confirmation required. | Pending completion of S7–S14 |

## Confirmation bundles

The remote work is intentionally grouped so each approval is specific and reviewable. **Bundle A** consists of S7 (apply missing Supabase migrations only after a read-only state comparison). **Bundle B** consists of S8–S10 (set staging configuration, configure Auth/OAuth, and deploy staging). **Bundle C** consists of S11–S14 (create disposable users, execute controlled runtime tests, and assess monitoring). No bundle will be started without a separate explicit confirmation describing the exact target and expected changes.

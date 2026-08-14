# Supabase Staging Migration Readiness

**Scope:** Read-only review of the local migration history. No migration was applied, reset, or executed against a remote database.

## Ordered migration assessment

The local migration filenames have unique timestamp prefixes and sort into one unambiguous sequence. The main staging-relevant migrations occur in the following order.

| Order | Migration | Purpose | Staging assessment |
| --- | --- | --- | --- |
| 1 | `20260312090000_add_follow_and_notifications.sql` | Creates owner-scoped follow and notification tables and initial policies. | Must precede later notification hardening. |
| 2 | `20260317153000_backfill_missing_tables_for_actions.sql` | Ensures action tables, collections, notifications, and legacy state exist with RLS support. | Idempotent `IF NOT EXISTS` structure supports pre-existing staging data. |
| 3 | `20260317182000_notification_audit_fixes.sql` | Creates user-scoped `followed_title_state_user`, backfills it from legacy state, and ensures self-insert notification policy. | Must run before legacy state is removed. |
| 4 | `20260613170000_drop_legacy_followed_title_state.sql` | Drops the global legacy title-state table after user-scoped state is in place. | Safe only after the backfill migration has succeeded. |
| 5 | `20260729140000_tv_episode_progress_rpc.sql` | Creates authenticated TV episode progress RPCs and grants. | Later replacement migrations preserve the function contract. |
| 6 | `20260802120000_return_persisted_tv_episode.sql` and `20260802123000_ensure_tv_episode_progress_support_rpcs.sql` | Replaces and completes TV episode RPC behavior. | Ordered correctly after the original RPC migration. |
| 7 | `20260806000000_fix_handle_new_user_trigger.sql` | Repairs signup profile creation so `profiles.id` and `profiles.user_id` both receive `NEW.id`; username comes from metadata. | Required before staging signup validation. |
| 8 | `20260812120000_fix_forgeable_notifications_rls.sql` | Removes the forgeable `auth.uid() IS NULL` notification insert policy and preserves caller-owned inserts. | Required before exposing notifications in staging. |
| 9 | `20260812130000_add_public_profile_rpc.sql` | Adds a constrained public-profile RPC. | Safe after profile privacy fields exist. |
| 10 | `20260814150000_add_performance_indexes.sql` | Adds general performance indexes. | Apply before representative staging load checks. |
| 11 | `20260814153000_add_notification_query_indexes.sql` | Adds notification query indexes. | Apply after notification table creation. |
| 12 | `20260814170000_harden_legacy_state_rls.sql` | Tightens cache policy role targets and conditionally hardens legacy title state if it exists. | Safe after the preceding legacy-state drop; it skips the absent table rather than failing. |

## Resolved order conflict

The initial version of `20260814170000_harden_legacy_state_rls.sql` assumed that `public.followed_title_state` still existed. The sorted history shows that it is dropped by `20260613170000_drop_legacy_followed_title_state.sql`. The hardening migration was corrected to use `to_regclass('public.followed_title_state')` and perform the RLS/revoke operations only when the table still exists. This removes the migration-order failure while retaining protection for installations that have not removed the table.

## Remote-state availability

No local Supabase CLI or PostgreSQL client is installed or connected to a target database. The configured Supabase REST endpoint is reachable, but its supplied key cannot inspect migration metadata through the Data API; the root REST request returned HTTP 401 with a secret-key requirement. The public Auth settings endpoint was accessible read-only. Therefore the **remote migration history could not be verified** from this environment.

Before staging deployment, compare the local ordered filenames to the target migration history using a properly authorized Supabase project connection. Do not reset the database. Apply only the missing migrations in the listed order, take a backup according to the project’s operational procedure, and validate the trigger, policies, indexes, and cron tables afterward.

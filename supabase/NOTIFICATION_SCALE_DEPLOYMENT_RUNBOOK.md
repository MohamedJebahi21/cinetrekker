# Notification Scale Migration Deployment Runbook

This runbook deploys `20260824190000_notification_scale_and_retention.sql` before, or atomically with, the CineTrekker frontend and API release that reads the new notification fields and uses the cursor-based worker.

> **Safety boundary:** The migration is additive and idempotent. It does not delete or rewrite existing `notifications` rows. Its only inserted value is the operational checkpoint row for `followed-title-updates`. Do not run the scheduled worker as a production “test” in this procedure, because it may create legitimate future update notifications and update per-user snapshots.

## 1. Pre-deployment checks

Confirm the release commit contains the migration, notification inbox lifecycle changes, and `api/jobs/check-followed-updates.js` rewrite. Confirm that the release environment has `TMDB_API_KEY`, `CRON_SECRET`, Supabase service-role configuration, and the optional operational alert webhook configured according to the deployment environment’s approved secret inventory.

Use the normal Supabase migration process or the SQL Editor for project `nvssyuxghwlubxklvgrn`. Apply the full contents of `supabase/migrations/20260824190000_notification_scale_and_retention.sql` as a single change. Do not split or edit the transaction statements manually.

## 2. Schema-only verification

After applying the migration, run the following read-only SQL. It returns only schema and privilege metadata; it does not query notification, profile, follow, or preference rows.

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
  AND column_name IN ('group_key', 'expires_at', 'archived_at')
ORDER BY column_name;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'notification_worker_state';

SELECT routine_name, security_type
FROM information_schema.routines
WHERE specific_schema = 'public'
  AND routine_name = 'notification_followed_title_batch';

SELECT
  has_function_privilege('anon', 'public.notification_followed_title_batch(text, integer)', 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', 'public.notification_followed_title_batch(text, integer)', 'EXECUTE') AS authenticated_can_execute;
```

The expected result is three new `notifications` columns, one `notification_worker_state` table, the `notification_followed_title_batch` function with `DEFINER` security, and `false` for both client execute checks.

## 3. Deployment order and safe runtime verification

Deploy the API and frontend release only after the schema checks pass. Then run these safe checks:

| Check | Expected result | Safety |
|---|---|---|
| `GET /api/health` | A coarse healthy or degraded response with no secret values | Read-only |
| Visit `/status` | Public status/recovery page renders | Read-only |
| Open `/notifications` as a guest | Empty or sign-in state renders without an API schema error | Read-only |
| Load `/trust`, `/measurement`, and `/partnerships` | Public guidance routes render | Read-only |

Do **not** click archive, mark-read, follow, watchlist, rating, profile, or notification actions during production diagnostics. Do **not** invoke `/api/jobs/check-followed-updates` as a smoke test. Its correct first execution is the normally scheduled, authenticated worker run after deployment.

## 4. First scheduled-run observation

Observe the first normal scheduled execution through Vercel logs and the configured operational-alert channel. Confirm only coarse completion data: `processedTitles`, `notificationsCreated`, `errors`, `cursorReset`, and `hasNextPage`. Investigate any `notification_worker_failed` alert using request identifiers and server logs; do not expose individual notification contents in alerts or incident reports.

## 5. Rollback boundary

The migration is intentionally forward-compatible. If the API release must be rolled back, retain the additive schema. Do not drop the new columns, indexes, function, or worker-state table as an emergency rollback, because an older API release does not depend on their absence. Instead, revert the application/API commit and pause or correct the scheduled worker configuration through the deployment console.

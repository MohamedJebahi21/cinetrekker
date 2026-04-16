# CRON_SECRET Setup Guide

This guide fixes failures in **Check New Episodes (Background Job)** when `CRON_SECRET` is missing.

## Why this is required

The Edge Function `supabase/functions/check-new-episodes/index.ts` validates the `x-cron-secret` header against the `CRON_SECRET` environment variable.

If `CRON_SECRET` is not set in Supabase and GitHub secrets, workflow runs fail.

## 1) Generate a secure CRON secret

From the repository root:

```bash
./scripts/setup-cron-secret.sh
```

Copy the generated value.

## 2) Add `CRON_SECRET` in Supabase

1. Open Supabase Dashboard.
2. Go to your project → **Edge Functions** → **check-new-episodes**.
3. Open **Settings** → **Secrets**.
4. Add secret:
   - **Name**: `CRON_SECRET`
   - **Value**: paste the generated value.
5. Save.

## 3) Add `CRON_SECRET` in GitHub

1. Open repository → **Settings** → **Secrets and variables** → **Actions**.
2. Create repository secret:
   - **Name**: `CRON_SECRET`
   - **Value**: paste the same value used in Supabase.
3. Save.

## 4) Verify

1. Open **Actions** tab.
2. Run **Check New Episodes (Background Job)** manually.
3. Confirm successful response from:
   - `POST /functions/v1/check-new-episodes`
   - status `200`.

## Notes

- Keep `CRON_SECRET` identical in both places (Supabase + GitHub).
- Rotate it by repeating the same process and updating both secrets together.

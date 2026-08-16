# CineTrekker Backup and Recovery Plan

## 1. Database Backups (Supabase)

CineTrekker uses Supabase for all user profiles, social data, and media tracking state.

### Automated Backups
- **Nightly Backups:** Supabase performs daily backups of the entire database. These are retained for 7 days on the Free tier and up to 30 days on Pro.
- **Point-in-Time Recovery (PITR):** PITR is available on the Pro tier, allowing recovery to any specific second. **Current Status:** Not active (Hobby plan).

### Manual Data Export
To mitigate Hobby-plan retention limits, the owner should perform weekly manual exports:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Database** -> **Backups**.
3. Download the latest SQL dump or use the CLI:
   ```bash
   supabase db dump --project-ref nvssyuxghwlubxklvgrn -f backup.sql
   ```

## 2. Code and Configuration (GitHub/Vercel)

### Repository
- **GitHub:** The source of truth is the `main` branch at `MohamedJebahi21/cinetrekker`.
- **Local Sync:** The Windows development checkout serves as an offline mirror.

### Environment Secrets
Secrets are stored in Vercel and Supabase. They are **not** in the repository.
- **Backup Action:** Maintain a secure, encrypted offline record of `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and service-role keys.

## 3. Disaster Recovery Scenarios

| Scenario | Recovery Action | Estimated Time |
|---|---|---|
| **Accidental Data Deletion** | Restore from latest nightly Supabase backup. | 1–4 hours |
| **Vercel Deployment Failure** | Roll back to previous successful deployment in Vercel Dashboard. | < 5 minutes |
| **GitHub Repository Loss** | Re-initialize from local Windows checkout. | 30 minutes |
| **Supabase Project Outage** | Monitor [Supabase Status](https://status.supabase.com). | Dependent on provider |

## 4. Recovery Verification
Once per quarter, the owner should:
1. Export a SQL dump from production.
2. Restore it to a local Docker-based Supabase instance.
3. Verify that a test user's profile and watchlist are intact.

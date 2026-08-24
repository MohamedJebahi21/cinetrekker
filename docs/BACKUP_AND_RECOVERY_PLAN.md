# CineTrekker Backup and Recovery Plan

## 1. Database Backups (Supabase)

CineTrekker uses Supabase for all user profiles, social data, and media tracking state.

### Provider Backup Verification
- **Provider-managed backups:** Verify the current backup cadence, retention window, and restore constraints in the project's Supabase plan and backup console. These capabilities are plan-dependent and must not be assumed from this document.
- **Point-in-Time Recovery (PITR):** Verify whether PITR is enabled, its recovery window, and the accountable owner in the project console. Record the coarse outcome in `docs/PRODUCTION_READINESS_EVIDENCE_CHECKLIST.md`; do not record credentials or dump contents.

### Controlled Data Export
The owner may perform a scheduled encrypted export where the selected Supabase plan and organizational policy allow it:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and review the approved backup/export path for the project.
2. Follow the provider’s current production export procedure or the approved CLI workflow.
3. Store any resulting export outside the repository in encrypted storage with restricted access.
4. Record only the date, operator role, storage-policy confirmation, and a safe evidence reference in `docs/PRODUCTION_READINESS_EVIDENCE_CHECKLIST.md`. Never commit a dump, token, or user data to GitHub.

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
At least once per quarter, the owner should run an isolated recovery drill:
1. Use the approved provider backup/export path to create an authorized recovery input.
2. Restore only into an isolated non-production environment with restricted access.
3. Verify a deliberately created test record or other approved non-personal fixture, not a real user's profile or watchlist.
4. Record the date, operator role, recovery duration, coarse outcome, and follow-up actions in `docs/PRODUCTION_READINESS_EVIDENCE_CHECKLIST.md`.

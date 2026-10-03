# CineTrekker — GitHub Issue Drafts

> **Instructions for the repo owner:** Open each section below as a GitHub Issue in the
> [CineTrekker repository](https://github.com/MohamedJebahi21/cinetrekker).
> Apply the suggested label(s), assign to yourself, and close when done.
> Delete this file once all issues are created.

---

## 🔐 Security follow-ups (OPEN IMMEDIATELY)

### [SECURITY] Delete old scratch test-user and rotate exposed credentials

**Label:** `security` · `priority: critical`

The file `scratch/test-signup.js` (now removed from the repository, but still present in git
history) contained **hardcoded credentials** — a Supabase anon JWT and a test user's email +
password. The archive `cinetrekker.tar.gz` (also removed) contained `.env.local` and
`.vercel/.env.development.local` with live secret values including `VERCEL_OIDC_TOKEN`,
`VITE_SUPABASE_ANON_KEY`, and `TMDB_API_KEY`.

**Action items (owner-only, require console access):**

- [ ] **[owner]** Open Supabase Auth dashboard → find the test user whose email matches the one
  hardcoded in `scratch/test-signup.js` → **delete that user account** permanently.
- [ ] **[owner]** If the test-user password was reused anywhere else (other services, personal
  accounts), change it there too.
- [ ] **[owner]** **Rotate `VERCEL_OIDC_TOKEN`** in the Vercel project settings (the old token
  was present in `cinetrekker.tar.gz/.env.local` and may have been copied from `.env.local`).
- [ ] **[owner]** **Rotate `VITE_SUPABASE_ANON_KEY`** in Supabase → Project Settings →
  API → regenerate the `anon` key, then update the Vercel environment variable.
- [ ] **[owner]** **Rotate `TMDB_API_KEY`** on the TMDB developer portal (the key was present in
  `cinetrekker.tar.gz/.env.local`).
- [ ] **[owner]** **Rotate `OMDB_API_KEY`** on the OMDb portal (found in `.env.local` on disk;
  the tar archive also contained this file).
- [ ] After all rotations: update environment variables in Vercel and in your local `.env.local`.
- [ ] Redeploy to production so the new keys take effect.

**Note:** The Supabase anon key is intentionally public-safe (it is included in the client
bundle), but rotating it is still good practice after an accidental exposure in git history.
The `TMDB_API_KEY` and `OMDB_API_KEY` are **server-only** and must be rotated.

---

### [SECURITY] Optional: purge sensitive files from git history with git filter-repo

**Label:** `security` · `priority: medium`

The following files containing secrets exist in git history and cannot be removed by a simple
commit. They require a history rewrite with `git filter-repo`:

- `scratch/test-edge.js` — Supabase project URL + anon JWT
- `scratch/test-signup.js` — Supabase URL, anon JWT, hardcoded test-user email/password
- `cinetrekker.tar.gz` — contained `.env.local` (VERCEL_OIDC_TOKEN, VITE_SUPABASE_ANON_KEY, TMDB_API_KEY)

**Prerequisites before running `git filter-repo`:**

- [ ] **[owner]** Resolve and merge (or close) the currently open pull request first.
  History rewrites force-push and will break existing PRs.
- [ ] **[owner]** Notify any collaborators who have cloned the repo.
- [ ] **[owner]** After rewriting, force-push (`git push --force-with-lease`), then
  contact GitHub Support to purge the cached objects.
- [ ] **[owner]** All local clones must be re-cloned from scratch after a rewrite.

**Do NOT run this until the open PR is resolved.**

---

### [SECURITY] Remove Netlify `_headers` file and adapt security-config verification script

**Label:** `chore` · `security`

`_headers` uses Netlify/Cloudflare Pages syntax and is **silently ignored by Vercel**, which
reads security headers from `vercel.json`. This file is a maintenance hazard: the two configs
can drift independently.

**Action items:**

- [ ] Update `scripts/verify-security-config.mjs` to check only `vercel.json` (remove the
  `_headers` read and the `missingInNetlifyHeaders` check).
- [ ] Delete `_headers` from the repository.
- [ ] Remove the `_headers` reference from `docs/SECURITY_AUDIT_2026-03-24.md` and
  `docs/audit-2026-08-12.md` (update those lines to note the file was removed).
- [ ] Run `npm run test:security` to confirm the security gate still passes.

---

## 🚀 Operations (external — require console access)

### [OPS] Secret inventory, rotation schedule, and ownership

**Label:** `ops` · `priority: high`

**`OPS-EXT-01b` from LAUNCH_READINESS_TODO**

- [ ] **[owner]** In each provider console (Vercel, Supabase, Upstash, TMDB, OMDb, Google OAuth,
  alerting provider): record a **rotation owner** and **next-review date** in a private document
  (never commit secret values to the repository).
- [ ] Set calendar reminders for key rotation at least every 90 days.

---

### [OPS] Alert delivery confirmation

**Label:** `ops`

**`OPS-EXT-01c` from LAUNCH_READINESS_TODO**

- [ ] **[owner]** Confirm an accountable destination for Vercel function error alerts, security
  events, Supabase Auth alerts, Upstash reachability alerts, and independent uptime monitoring.
- [ ] Perform a safe test/dry-run of each alert channel.

---

### [OPS] Quota and cost safeguards

**Label:** `ops`

**`OPS-EXT-01d` from LAUNCH_READINESS_TODO**

- [ ] **[owner]** Review quota and spend limits for all production providers (Vercel, Supabase,
  Upstash, TMDB, OMDb).
- [ ] Document escalation ownership (who gets paged when a quota is hit).

---

### [OPS] Isolated backup and recovery drill

**Label:** `ops`

**`OPS-EXT-01e` from LAUNCH_READINESS_TODO**

- [ ] **[owner]** Restore an approved non-personal fixture into an **isolated non-production**
  Supabase environment (never restore to production as a drill).
- [ ] Record the coarse result and recovery duration.

---

## ♿ Accessibility

### [A11Y] Independent keyboard and screen-reader review

**Label:** `accessibility` · `priority: high`

**`A11Y-EXT-01b` from LAUNCH_READINESS_TODO**

- [ ] Complete keyboard-only navigation review on desktop and mobile.
- [ ] Complete screen-reader review (NVDA/JAWS on Windows; VoiceOver on macOS/iOS).
- [ ] Complete zoom/reflow test at 400% on desktop viewport.
- [ ] Log all findings as sub-issues and retest after fixes.

---

## 🌍 Internationalisation

### [I18N] Native-language review of high-traffic routes

**Label:** `i18n`

**`I18N-EXT-01` from LAUNCH_READINESS_TODO**

- [ ] Have native reviewers assess the top routes in **Arabic (RTL)**, **French**, **Turkish**,
  **Spanish**, and **German** for meaning, grammar, tone, truncation, metadata-language clarity,
  and RTL layout quality.

---

## ⚖️ Legal & commercial

### [LEGAL] Privacy, data-retention, and regional-compliance review

**Label:** `legal`

**`LEGAL-EXT-01` from LAUNCH_READINESS_TODO**

- [ ] **[owner]** Obtain qualified privacy/legal review before commercial rollout.
- [ ] Covers: GDPR/CCPA data-retention policies, cookie consent compliance, OMDb/TMDB attribution
  requirements, and any regional obligations for the supported locales (AR, FR, TR, ES, DE).

---

### [LEGAL] Commercial governance: sponsorship and partner approval

**Label:** `legal` · `commercial`

**`SPONSOR-EXT-01` from LAUNCH_READINESS_TODO**

- [ ] **[owner]** Assign an accountable commercial owner before accepting any sponsor commitments.
- [ ] Approve partner suitability criteria, placement labels, campaign reporting methodology, and
  escalation process.

---

## 🏷️ UI: TMDB / OMDb / TVmaze attribution in app footer

**Label:** `ui` · `legal`

The README credits TMDB, OMDb, and TVmaze, but the **in-app footer/About page** should also
display the required TMDB attribution notice:

> "This product uses the TMDB API but is not endorsed or certified by TMDB."

**Action items:**

- [ ] Add TMDB attribution to the footer component (or About page).
- [ ] Add OMDb and TVmaze credits next to it.
- [ ] Confirm compliance with the TMDB, OMDb, and TVmaze terms of service.

---

## 📸 Docs: Add real screenshots / GIF to README

**Label:** `docs`

The README has placeholder `TODO` markers for screenshots. Replace them with:

- [ ] A desktop-width homepage screenshot (hero + discovery section).
- [ ] A mobile-width screenshot (bottom nav + hero).
- [ ] A GIF or video showing the search → details → add-to-watchlist flow.

Store screenshots in `docs/assets/`.

---

## 📝 Docs: Fill in README placeholders

**Label:** `docs`

The following `TODO` items remain in the README and other community files:

- [ ] Confirm and set the **license holder name** in `LICENSE` (currently set to
  `2026 Mohamed Jebahi` — confirm before the first public release tag).
- [ ] Add real **screenshots** to `docs/assets/` and update the README carousel.
- [ ] Set **author** field in `package.json` (currently placeholder).
- [ ] Confirm the **live demo URL** is still `https://cinetrekker.vercel.app`.

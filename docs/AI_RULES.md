# CineTrekker AI Engineering Rules

> **CANONICAL AI INSTRUCTION SET**  
> This file is the primary authority for any AI coding agent working in this repository.  
> It applies to all AI assistants (Antigravity, Claude Code, Cursor, Cline, Roo Code, Codex, Copilot, Gemini, OpenCode, Kilo, etc.).  
> The repository is the source of truth. Do NOT rely on prior conversation context or assumptions.

---

## 1. Repository Authority & Ground Truth

1. **The repository is the sole source of truth**: Code, schemas, migrations, configuration, and repository documentation define how CineTrekker works.
2. **Verify against code**: Never infer architecture or business behavior from filenames, issue summaries, or generic patterns alone. Inspect the relevant source files before stating conclusions or changing code.
3. **Preserve documentation integrity**: Documentation must reflect the actual code. When documentation and code disagree, investigate the implementation, determine the current truth, and update documentation to eliminate drift. Never preserve known contradictions.

---

## 2. Mandatory Context Loading

Before undertaking any non-trivial task, every AI agent MUST read:
1. `docs/AI_RULES.md` (this file)
2. `docs/PROJECT_CONTEXT.md` (current state, stack, features, known issues)
3. `docs/ARCHITECTURE.md` (technical flows, boundaries, constraints)
4. `docs/DEFINITION_OF_DONE.md` (reusable delivery checklist)
5. `docs/metadata-providers.md` (multi-provider metadata architecture)

After reading these documents, inspect the specific source files, migrations, and tests relevant to your task.

---

## 3. Mandatory Engineering Workflow

Every non-trivial task must follow this sequence:

```
UNDERSTAND  -->  INVESTIGATE  -->  PLAN  -->  IMPLEMENT  -->  TEST  -->  VERIFY  -->  DOCUMENT
```

1. **UNDERSTAND**: Clarify requirements, user intent, scope, and non-functional constraints.
2. **INVESTIGATE**: Read the affected code, hooks, services, types, database queries, and existing tests. Trace end-to-end data flows.
3. **PLAN**: Formulate a concise, minimal-impact implementation plan that preserves existing contracts.
4. **IMPLEMENT**: Make the smallest correct change adhering to repository patterns.
5. **TEST**: Run automated tests (`npm run test:ci`, `npm run test:security`, relevant unit/Playwright tests).
6. **VERIFY**: Check edge cases (loading, empty, error states, mobile responsiveness, accessibility).
7. **DOCUMENT**: Update `PROJECT_CONTEXT.md`, `ARCHITECTURE.md` (if changed), and append an entry in `CHANGELOG.md`.

---

## 4. Absolute Prohibitions (No Guessing)

Agents must **NEVER** guess or hallucinate:
- File paths or directory locations
- API routes, query params, or payload schemas
- Supabase tables, columns, constraints, foreign keys, or enum values
- Environment variables or secrets
- Dependencies or npm packages
- Business rules or permissions
- Existing component names or utility functions

*If you are uncertain about any fact, inspect the codebase or grep for it.*

---

## 5. Existing-Code-First Principle

Before writing a new component, hook, utility, service method, or database function:
1. Search the repository for an existing implementation that can be reused or extended.
2. Check `src/lib/` (e.g. `mediaEnrichment.ts`, `validation.ts`, `logger.ts`, `errorScrubber.ts`).
3. Check `src/contexts/` (`AuthContext.tsx`, `UserListsContext.tsx`, `ThemeContext.tsx`, etc.).
4. Check `src/components/ui/` for Shadcn / Radix primitives.
5. Reuse existing styling tokens and design primitives in `tailwind.config.ts` and `src/index.css`.
6. Avoid duplicate abstractions, competing wrapper layers, or redundant state stores.

---

## 6. Minimal-Change Principle

1. **Smallest correct change**: Touch only the lines and files required to solve the task.
2. **Do not refactor arbitrarily**: Do not reformat unrelated files, rewrite functional components to classes, reorder imports, or modernize syntax in untouched files.
3. **Do not swap dependencies**: Do not replace TanStack Query, Radix UI, Tailwind CSS, Lucide icons, or Vitest/Node test runner without explicit authorization.
4. **Document discovered problems**: If you find bugs or tech debt outside your scope, log them in `PROJECT_CONTEXT.md` under **Known Issues** rather than unilaterally fixing them.

---

## 7. Preservation of Behavior

1. **Protect existing user data**: Changes to watchlist, watch history, ratings, custom lists, privacy settings, follows, or notifications must never lose, overwrite, or corrupt user data.
2. **Guest mode continuity**: CineTrekker supports a local-first guest mode (`useGuestMediaLists.ts`). Do not break guest functionality or the guest-to-authenticated sync flow.
3. **Case sensitivity**: File imports must exactly match disk casing (important on Linux CI / Vercel builds).
4. **i18n integrity**: All user-visible strings must use `react-i18next` (`t(...)`) with keys registered across supported locales (`en`, `fr`, `ar`, `es`, `de`, `tr`). Run `npm run i18n:verify`.

---

## 8. Security & Privacy Guardrails

1. **No secrets in client builds**: Browser variables must start with `VITE_`. Server-only secrets (`TMDB_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, Upstash credentials) must NEVER be exposed to the client or checked into git.
2. **Never bypass RLS or authorization**: Every client query against Supabase must obey Row Level Security. Never create permissive policies (`USING (true)`) on private tables (`profiles`, `notifications`, `user_media_items`, `follows`).
3. **Private profile isolation**: User profile data is private by default. Public or social discovery must go through dedicated `SECURITY DEFINER` RPCs (`get_public_profile`, `get_discoverable_profiles`) which enforce user privacy flags.
4. **Serverless endpoint security**: All endpoints in `api/` must enforce HTTP method checks, origin validation, rate limiting via `enforceRequestSecurity`, and authentication via `authenticateRequest`.
5. **No PII in telemetry**: Analytics (`src/lib/engagement.ts`, `api/_lib/operationalMonitor.js`) must never record user IDs, email addresses, media titles, search terms, or IP addresses in plaintext.

---

## 9. Database & Migrations

1. **Always inspect existing migrations**: Review `supabase/migrations/` before proposing schema changes.
2. **Write forward-compatible SQL**: Every migration must be idempotent and non-destructive. Use `IF NOT EXISTS`, safe defaults, and explicit rollback/down considerations.
3. **RPC security**: Functions executing with `SECURITY DEFINER` must explicitly set `search_path = public` to prevent schema hijack attacks.
4. **Never run unverified destructive operations**: Do not `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` tables without user consent and an isolated backup plan.

---

## 10. UI & Accessibility Standards

1. **States required**: Every component consuming async data must handle:
   - Loading state (skeleton shimmer matching layout; see `RouteSpinner` or existing skeleton components)
   - Empty state (actionable guidance using `EmptyState` primitives; see `docs/EMPTYSTATE_GUIDE.md`)
   - Error state (clear retry affordance without revealing technical stack traces)
   - Success/interactive feedback (Sonner toast or inline badge)
2. **Accessibility (WCAG 2.2 AA)**:
   - Interactive elements must be semantic (`<button type="button">`, `<a>`).
   - Touch targets must meet minimum 44×44px hit areas on mobile.
   - All icon buttons must provide `aria-label` or accessible text.
   - Maintain color contrast and test RTL layout behavior for Arabic (`dir="rtl"`).
3. **Responsiveness**: Verify layouts across mobile (<640px), tablet (768px-1024px), and desktop (1280px+).

---

## 11. Verification & Quality Gates

Never declare a task done merely because code edits completed without error. Run the relevant project quality gates:

- `npm run lint` — ESLint rules
- `npm run type-check` — TypeScript check (`tsc --noEmit`)
- `npm run test:security` — API security and auth tests
- `npm run test:privacy` — Privacy and RLS verification
- `npm run i18n:verify` — Strict i18n key audit and translation coverage
- `npm run test:unit` — Fast unit test suite
- `npm run build` — Production Vite build and asset-budget verification
- `npm run test:smoke` — Playwright smoke tests (when touching navigation, shell, or core routes)

---

## 12. Persistent Documentation Maintenance

After completing any non-trivial code modification:
1. Update `PROJECT_CONTEXT.md` to reflect any new routes, components, state, or resolved issues.
2. Update `ARCHITECTURE.md` if data flow, API boundaries, security layers, or integrations changed.
3. Append a structured entry to `CHANGELOG.md` detailing changes, affected files, tests run, and remaining risks.
4. Update `DEFINITION_OF_DONE.md` checklist when delivering user-facing milestones.

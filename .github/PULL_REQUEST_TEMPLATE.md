## Description

Please provide a brief summary of the changes made and the rationale behind them.

Fixes #(issue)

## Type of Change

- [ ] `feat`: New feature (non-breaking change which adds functionality)
- [ ] `fix`: Bug fix (non-breaking change which fixes an issue)
- [ ] `chore`: Maintenance, dependency bump, or tooling update
- [ ] `docs`: Documentation updates only
- [ ] `refactor`: Code change that neither fixes a bug nor adds a feature
- [ ] `perf`: Performance improvement
- [ ] `test`: Adding or correcting tests

## Architectural Invariants Check

- [ ] Does NOT increase the number of serverless functions in `api/` beyond the 12-function Vercel Hobby cap.
- [ ] External API calls (TMDB, OMDb, TVmaze) include proper fallbacks and fail-soft behavior.
- [ ] No server-only secrets or private credentials exposed to client bundles.
- [ ] Localized copy: All new user-facing strings added to `src/locales/` with translations or standard keys.

## Quality Gates Checklist

Run each command locally and confirm it passes:

- [ ] `npm run lint` — ESLint passes with zero errors
- [ ] `npm run type-check` — TypeScript compiler (`tsc --noEmit`) passes
- [ ] `npm run test:security` — API security and auth verification passes
- [ ] `npm run test:privacy` — Privacy and consent telemetry verification passes
- [ ] `npm run i18n:verify` — Locale parity and strict key verification passes
- [ ] `npm run build` — Production Vite build passes within bundle budget limits

## Visual / Responsive Confirmation (if UI changed)

- [ ] Desktop layout verified (1280px+)
- [ ] Mobile layout verified (375px–420px)
- [ ] Dark mode & Light mode verified
- [ ] RTL layout (Arabic) verified

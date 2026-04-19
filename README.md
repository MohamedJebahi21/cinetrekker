# CineTrekker

CineTrekker is a movie and TV tracking web app focused on discovery, personalized watchlists, watched history, and follow-based update notifications.

## Tech Stack

- React 19 + TypeScript
- Vite 7
- React Router
- TanStack Query
- Supabase (auth + data)
- Tailwind CSS + Radix UI
- Playwright + Node test runner

## Quick Start

1. Install dependencies:
   - `npm install`
2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill required values (Supabase and TMDB keys)
3. Run development server:
   - `npm run dev`

## Core Scripts

- `npm run dev` - start local app
- `npm run lint` - run ESLint
- `npm run build` - production build
- `npm run test:bundle-budget` - enforce JavaScript bundle size budgets
- `npm run test:security` - API security tests
- `npm run test:smoke` - Playwright smoke tests (Chromium)
- `npm run test:e2e:mobile` - Playwright mobile feature tests (mobile-safari)
- `npm run test:e2e:desktop` - Playwright desktop tests
- `npm run i18n:verify` - i18n key coverage checks
- `npm run audit:desktop` - Lighthouse desktop audit

## Project Layout

- `src/` - frontend app code (pages, components, hooks, contexts)
- `api/` - serverless API routes
- `supabase/` - edge functions and SQL migrations
- `tests/` - Playwright and security tests
- `docs/` - operational and implementation documentation
- `.github/workflows/` - CI and scheduled jobs

## Quality Gates

Before merging:

1. `npm run lint`
2. `npm run build`
3. `npm run test:security`
4. `npm run test:bundle-budget`
5. `npm run test:smoke`
6. `npm run test:e2e:mobile`

## Validation Commands

Use these as the minimum release readiness checks:

1. `npm run test:smoke`
2. `npm run test:e2e:mobile`
3. `npm run test:bundle-budget`

## Security Notes

- Do not commit secrets.
- Server-only keys must stay in deployment environment variables.
- Review `docs/SECURITY.md` and `docs/INCIDENT_RESPONSE.md` for policy and response guidance.

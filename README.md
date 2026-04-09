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
- `npm run test:security` - API security tests
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
4. Run relevant E2E tests for changed flows

## Security Notes

- Do not commit secrets.
- Server-only keys must stay in deployment environment variables.
- Review `docs/SECURITY.md` and `docs/INCIDENT_RESPONSE.md` for policy and response guidance.

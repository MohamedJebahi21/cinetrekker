# CineTrekker

CineTrekker is a movie and TV tracking web app focused on discovery, personalized watchlists, watched history, and follow-based update notifications.

## Tech Stack

- React 19 + TypeScript
- Vite 8
- React Router 7
- TanStack Query v5
- Supabase (PostgreSQL 15+, GoTrue Auth, Row Level Security, RPCs)
- Tailwind CSS + Radix UI
- Multi-Source Metadata Provider Layer (TMDB catalog, OMDb external scores, TVmaze TV broadcasts & specials)
- Node.js 22 Serverless Functions (max 12 functions on Vercel Hobby)
- Playwright + Node.js test runner

## Quick Start

1. Install dependencies:
   - `npm install`
2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill required values (Supabase, TMDB, and optional OMDb keys)
3. Run development server:
   - `npm run dev`

## Core Scripts

- `npm run dev` - start local app
- `npm run lint` - run ESLint
- `npm run type-check` - TypeScript compiler check (`tsc --noEmit`)
- `npm run build` - production build with bundle budgeting check
- `npm run test:security` - API security tests
- `npm run test:privacy` - privacy and consent telemetry tests
- `npm run test:e2e:desktop` - Playwright desktop tests
- `npm run i18n:verify` - i18n key coverage & completeness checks
- `npm run audit:desktop` - Lighthouse desktop audit

## Project Layout

- `src/` - frontend app code (pages, components, hooks, contexts)
- `api/` - serverless API routes (strictly capped at 12 functions)
  - `api/_lib/metadata/` - provider-agnostic metadata layer (TMDB, OMDb, TVmaze, future Watchmode contract)
- `supabase/` - edge functions and SQL migrations
- `tests/` - Playwright and security tests
- `docs/` - operational and architectural documentation
  - `docs/metadata-providers.md` - comprehensive metadata provider layer guide
- `AGENTS.md` - canonical entry point for all AI coding agents
- `AI_RULES.md` - absolute engineering guidelines and verification gates
- `PROJECT_CONTEXT.md` - current system status, routes, schemas, and maps
- `ARCHITECTURE.md` - runtime model, security boundaries, and data flows

## Quality Gates

Before merging or deploying:

1. `npm run lint`
2. `npm run type-check`
3. `npm run test:security`
4. `npm run test:privacy`
5. `npm run i18n:verify`
6. `npm run build`

## Security Notes

- Do not commit secrets.
- Server-only keys (`TMDB_API_KEY`, `OMDB_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) must stay in deployment environment variables.
- Review `docs/SECURITY.md`, `docs/metadata-providers.md`, and `docs/INCIDENT_RESPONSE.md` for policy and response guidance.


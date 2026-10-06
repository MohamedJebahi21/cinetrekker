# Claude Code Instructions

Before working on CineTrekker, you must read and follow the canonical repository engineering guidelines:

1. [docs/AI_RULES.md](docs/AI_RULES.md) (Mandatory engineering rules & workflows)
2. [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) (Current system status, stack, and project map)
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (Runtime architecture and security boundaries)
4. [docs/DEFINITION_OF_DONE.md](docs/DEFINITION_OF_DONE.md) (Quality and delivery checklist)
5. [docs/metadata-providers.md](docs/metadata-providers.md) (Multi-provider metadata architecture: TMDB, OMDb, TVmaze)

### Key Architectural Invariants & Constraints:
- Workflow: Follow `UNDERSTAND -> INVESTIGATE -> BRANCH -> PLAN -> IMPLEMENT -> TEST -> VERIFY -> DOCUMENT`.
- Serverless constraint: Strictly maximum 12 Serverless Functions in `api/` on Vercel Hobby. Helper modules must live in `api/_lib/` or `api/metadata/`.
- Rate Limiting: In-memory sliding window in `api/_lib/requestSecurity.js`. Rate limits are set to 240 req/min for `tmdb-proxy` and `enrichment`.
- Database Tables:
  - Lists: `user_watchlist` and `user_watched` (unique `(user_id, media_id, media_type)`).
  - TV Tracking: `followed_shows` and `watched_episodes`.
  - Collections: `collections` and `collection_items`.
- Client resilience: Preserve `public/boot-watchdog.js`, `src/lib/chunkErrorRecovery.ts`, and `src/components/ErrorBoundary.tsx`.
- Package manager: Standardized on `npm` (Node 22 pinned in `.nvmrc`). Never commit pnpm-lock.yaml or yarn.lock.
- Localization: Enforce `react-i18next` for all strings. Validate with `npm run i18n:verify`.
- Testing verification:
  - `npm run test:security`
  - `npm run test:privacy`
  - `npm run test:professionalization`
  - `npm run test:unit`
  - `npm run lint`
  - `npm run type-check`
- Always update `docs/PROJECT_CONTEXT.md` and append an entry in `CHANGELOG.md` upon task completion.

# Claude Code Instructions

Before working on CineTrekker, you must read and follow the canonical repository engineering guidelines:

1. [docs/AI_RULES.md](docs/AI_RULES.md) (Mandatory engineering rules & workflows)
2. [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) (Current system status, stack, and project map)
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (Runtime architecture and security boundaries)
4. [docs/DEFINITION_OF_DONE.md](docs/DEFINITION_OF_DONE.md) (Quality and delivery checklist)
5. [docs/metadata-providers.md](docs/metadata-providers.md) (Multi-provider metadata architecture: TMDB, OMDb, TVmaze, Watchmode placeholder)

### Key Instructions:
- Follow `UNDERSTAND -> INVESTIGATE -> BRANCH -> PLAN -> IMPLEMENT -> TEST -> VERIFY -> DOCUMENT`.
- Branch protection: `main` is protected. Always work on a new branch (`feat/...`, `fix/...`, `chore/...`, `docs/...`).
- Verify all assumptions against existing code; do not guess APIs or database columns.
- Serverless constraint: Strictly maximum 12 Serverless Functions in `api/` on Vercel Hobby. Helper modules must live in `api/_lib/`.
- Package manager: Standardized on `npm` (Node 22 pinned in `.nvmrc`). Never commit pnpm-lock.yaml or yarn.lock.
- Client resilience: Preserve `src/lib/chunkErrorRecovery.ts` and `src/components/ErrorBoundary.tsx` deployment error auto-recovery.
- Reuse existing primitives in `src/lib/`, `src/contexts/`, and `src/components/ui/`.
- Run tests: `npm run test:security`, `npm run test:privacy`, `npm run test:professionalization`, `npm run lint`, `npm run type-check`, `npm run i18n:verify`, `npm run build`.
- Always update `docs/PROJECT_CONTEXT.md` and append an entry in `CHANGELOG.md` upon task completion.

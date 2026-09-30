# Claude Code Instructions

Before working on CineTrekker, you must read and follow the canonical repository engineering guidelines:

1. [AI_RULES.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/AI_RULES.md) (Mandatory engineering rules & workflows)
2. [PROJECT_CONTEXT.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/PROJECT_CONTEXT.md) (Current system status, stack, and project map)
3. [ARCHITECTURE.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/ARCHITECTURE.md) (Runtime architecture and security boundaries)
4. [DEFINITION_OF_DONE.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/DEFINITION_OF_DONE.md) (Quality and delivery checklist)
5. [docs/metadata-providers.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/docs/metadata-providers.md) (Multi-provider metadata architecture: TMDB, OMDb, TVmaze, Watchmode placeholder)

### Key Instructions:
- Follow `UNDERSTAND -> INVESTIGATE -> PLAN -> IMPLEMENT -> TEST -> VERIFY -> DOCUMENT`.
- Verify all assumptions against existing code; do not guess APIs or database columns.
- Serverless constraint: Strictly maximum 12 Serverless Functions in `api/` on Vercel Hobby. Helper modules must live in `api/_lib/`.
- Reuse existing primitives in `src/lib/`, `src/contexts/`, and `src/components/ui/`.
- Run tests: `npm run test:security`, `npm run test:privacy`, `npm run lint`, `npm run type-check`, `npm run i18n:verify`.
- Always update `PROJECT_CONTEXT.md` and append an entry in `CHANGELOG.md` upon task completion.

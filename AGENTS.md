# Universal AI Agent Entry Point

Welcome to **CineTrekker**!

Before making any changes or recommendations, you must load and respect the canonical repository documentation system:

1. **[docs/AI_RULES.md](docs/AI_RULES.md)**: Absolute authority, core principles, verification gates, and engineering workflow.
2. **[docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)**: Current system state, technology stack, route catalog, business rules, design system, and project map.
3. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Technical runtime model, data flow, rate-limiting, and security invariants.
4. **[docs/DEFINITION_OF_DONE.md](docs/DEFINITION_OF_DONE.md)**: Reusable delivery checklist required for every completed task.
5. **[docs/metadata-providers.md](docs/metadata-providers.md)**: Multi-provider metadata layer (TMDB, OMDb, TVmaze, Watchmode placeholder).

---

### Core Directives for All Coding Agents
- **The repository is the source of truth**: Inspect the code; never guess.
- **Workflow**: `UNDERSTAND -> INVESTIGATE -> BRANCH -> PLAN -> IMPLEMENT -> TEST -> VERIFY -> DOCUMENT`.
- **Branch protection**: `main` is protected. Always work on a dedicated branch (`feat/...`, `fix/...`, `chore/...`, `docs/...`). Never commit directly to `main` without testing and PR.
- **Existing-code first**: Check `src/lib/`, `src/contexts/`, `src/components/ui/`, and existing services before creating new abstractions.
- **Minimal changes**: Make the smallest correct change. Do not refactor unrelated files.
- **Serverless constraint**: Strictly maximum 12 Serverless Functions in `api/` on Vercel Hobby. Helper modules must live in `api/_lib/`.
- **Package manager**: Strictly use `npm` (Node 22 pinned in `.nvmrc`). Never use pnpm or yarn.
- **Client resilience**: Preserve chunk load error auto-recovery (`src/lib/chunkErrorRecovery.ts` and `src/components/ErrorBoundary.tsx`).
- **Run verification**: Always run relevant tests (`npm run test:security`, `npm run test:privacy`, `npm run test:professionalization`, `npm run lint`, `npm run type-check`, `npm run i18n:verify`, `npm run build`).
- **Update documentation**: Keep `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md` (if architecture changed), and `CHANGELOG.md` synchronized after completing your work.

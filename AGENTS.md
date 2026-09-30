# Universal AI Agent Entry Point

Welcome to **CineTrekker**!

Before making any changes or recommendations, you must load and respect the canonical repository documentation system:

1. **[AI_RULES.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/AI_RULES.md)**: Absolute authority, core principles, verification gates, and engineering workflow.
2. **[PROJECT_CONTEXT.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/PROJECT_CONTEXT.md)**: Current system state, technology stack, route catalog, business rules, design system, and project map.
3. **[ARCHITECTURE.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/ARCHITECTURE.md)**: Technical runtime model, data flow, rate-limiting, and security invariants.
4. **[DEFINITION_OF_DONE.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/DEFINITION_OF_DONE.md)**: Reusable delivery checklist required for every completed task.
5. **[docs/metadata-providers.md](file:///f:/My%20Own%20Games/CineTrekker/cinetrekker/docs/metadata-providers.md)**: Multi-provider metadata layer (TMDB, OMDb, TVmaze, Watchmode placeholder).

---

### Core Directives for All Coding Agents
- **The repository is the source of truth**: Inspect the code; never guess.
- **Workflow**: `UNDERSTAND -> INVESTIGATE -> PLAN -> IMPLEMENT -> TEST -> VERIFY -> DOCUMENT`.
- **Existing-code first**: Check `src/lib/`, `src/contexts/`, `src/components/ui/`, and existing services before creating new abstractions.
- **Minimal changes**: Make the smallest correct change. Do not refactor unrelated files.
- **Run verification**: Always run relevant tests (`npm run test:security`, `npm run test:privacy`, `npm run lint`, `npm run type-check`, `npm run i18n:verify`).
- **Update documentation**: Keep `PROJECT_CONTEXT.md`, `ARCHITECTURE.md` (if architecture changed), and `CHANGELOG.md` synchronized after completing your work.

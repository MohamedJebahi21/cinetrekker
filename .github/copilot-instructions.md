# GitHub Copilot Instructions

Before assisting or generating code for CineTrekker, you must align with the repository's canonical engineering system:

- **[docs/AI_RULES.md](../docs/AI_RULES.md)**: Mandatory engineering rules, security guidelines, and verification gates.
- **[docs/PROJECT_CONTEXT.md](../docs/PROJECT_CONTEXT.md)**: Canonical system state, tech stack, routes, and component navigation map.
- **[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)**: Runtime models, data flows, and security constraints.
- **[docs/DEFINITION_OF_DONE.md](../docs/DEFINITION_OF_DONE.md)**: Universal checklist before code can be considered finished.
- **[docs/metadata-providers.md](../docs/metadata-providers.md)**: Multi-provider metadata layer (TMDB, OMDb, TVmaze).

### Important Principles:
- Treat the repository as the sole source of truth.
- Follow `UNDERSTAND -> INVESTIGATE -> BRANCH -> PLAN -> IMPLEMENT -> TEST -> VERIFY -> DOCUMENT`.
- Never commit directly to `main` (branch protection is enabled).
- Package manager: standardized on `npm` (Node 22 in `.nvmrc`).
- Maximum 12 Serverless Functions in `api/` on Vercel Hobby. Helpers must live in `api/_lib/`.
- Follow the existing code style, UI primitives in `src/components/ui/`, and tokens in `tailwind.config.ts`.
- Never expose private server secrets in client code.
- Ensure all new user-facing strings are localized with `react-i18next`.
- Preserve chunk error recovery in `src/lib/chunkErrorRecovery.ts` and `src/components/ErrorBoundary.tsx`.

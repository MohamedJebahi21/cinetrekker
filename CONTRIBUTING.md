# Contributing to CineTrekker

Thank you for your interest in contributing to **CineTrekker**! This document provides guidelines and workflows to help you make meaningful, quality contributions without introducing regressions.

---

## Code of Conduct

All contributors and maintainers are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand our community standards.

---

## Getting Started

### Prerequisites

- **Node.js**: `22.x` (see [`.nvmrc`](.nvmrc))
- **npm**: `10.x` or later (standardized package manager; do not use `pnpm` or `yarn`)
- **Git**: Recent version

### Initial Setup

1. **Fork & Clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/cinetrekker.git
   cd cinetrekker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required values for local development (see [`.env.example`](.env.example) for documentation of each variable).

4. **Start the local development server**:
   ```bash
   npm run dev
   ```

---

## Branch Naming Conventions

Create a new branch for each feature, fix, or chore. Do not commit directly to `main`. Use descriptive names matching this pattern:

- `feat/<short-description>`: New user-facing features or major additions
- `fix/<short-description>`: Bug fixes
- `chore/<short-description>`: Maintenance, dependency updates, repo cleanup
- `docs/<short-description>`: Documentation changes
- `refactor/<short-description>`: Code changes that neither fix a bug nor add a feature
- `test/<short-description>`: Adding or updating tests

*Example*: `feat/tmdb-provider-retry`, `fix/watchlist-sort-overflow`

---

## Commit Guidelines (Conventional Commits)

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification for clear, parseable git history:

```text
<type>(<optional scope>): <description in imperative mood>

[optional body]

[optional footer(s)]
```

### Types:
- `feat`: A new feature
- `fix`: A bug fix
- `chore`: Maintenance, tooling, or build tasks
- `docs`: Documentation updates only
- `style`: Formatting, whitespace (no code change)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance optimization
- `test`: Adding or correcting tests
- `ci`: CI configuration changes

*Example*:
```text
feat(metadata): add TVmaze provider layer with episodic enrichment
fix(watchlist): resolve optimistic status toggle race condition
chore(deps): update @tanstack/react-query to v5.83
```

---

## Architecture & Development Invariants

Before modifying code, please consult our canonical guides in `docs/`:
- [`docs/AI_RULES.md`](docs/AI_RULES.md) — Core principles and verification gates
- [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) — Current routes, state, and component map
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Technical runtime model and security boundaries
- [`docs/metadata-providers.md`](docs/metadata-providers.md) — Multi-provider metadata layer
- [`docs/DEFINITION_OF_DONE.md`](docs/DEFINITION_OF_DONE.md) — Delivery checklist

### Key Invariants
1. **12-Function Serverless Limit**: Vercel Hobby strictly caps the repository at **12 serverless functions** in `api/`. Never add a new standalone `.js`/`.ts` function in `api/` root without consolidating existing endpoints. Use `api/_lib/` for shared helper modules.
2. **Fail-Soft Degradation**: Third-party metadata providers (TMDB, OMDb, TVmaze) must fail gracefully. UI must never crash if an external provider is unreachable or rate-limited.
3. **No Secret Leaks**: Never hardcode API keys, service role keys, or tokens in source code. Client code must only access public `VITE_` variables.

---

## Quality Gates

Before opening a pull request, ensure all local verification checks pass:

```bash
# 1. Linting
npm run lint

# 2. TypeScript compilation
npm run type-check

# 3. API & security tests
npm run test:security

# 4. Privacy & consent tests
npm run test:privacy

# 5. Internationalization coverage check
npm run i18n:verify

# 6. Production build & bundle budget check
npm run build
```

You can run the CI suite locally with:
```bash
npm run test:ci
```

---

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a Pull Request targeting `main`.
3. Complete the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
4. Ensure all automated GitHub Actions checks pass.
5. A maintainer will review your PR and provide feedback.

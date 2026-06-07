# CineTrekker

## Project info

This repository contains the CineTrekker web application — a movie and TV tracking app.

## How can I edit this code?

You can work locally using your preferred IDE. The only requirements are Node.js and npm.

Quick start:

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

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

## What technologies are used for this project?

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

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

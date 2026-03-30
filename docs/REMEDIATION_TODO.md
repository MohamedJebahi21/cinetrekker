# CineTrekker Remediation Todo

## P0: Stabilize the Workspace

- [x] Fix lint errors and restore a clean ESLint baseline.
- [x] Verify production build in this environment once the sandbox `spawn EPERM` issue is cleared.
- [x] Remove the syntax corruption in `src/pages/AccessibilitySettings.tsx`.
- [x] Remove visible encoding artifacts from key UI files.
- [x] Replace the highest-priority unsafe `any` usage in high-traffic pages.

## P1: Fix Broken or Incomplete UX

- [x] Fix the hero details route so it links to the correct media path.
- [x] Remove duplicate props and refactor residue in `HeroSection`.
- [x] Hide the unfinished hero "Add to Watched" CTA until it is implemented.
- [x] Clean obvious refactor residue in `MediaCarouselEnhanced`.

## P2: Rebuild the Design System Foundation

- [x] Add shared cinematic shell/panel/toggle/filter primitives in `src/index.css`.
- [x] Consolidate theme tokens in `src/index.css` into a single semantic source of truth.
- [x] Remove legacy light-mode compatibility hacks by migrating components to semantic tokens.
- [x] Standardize the rest of the app on the shared primitives.

## P3: Restore Cross-Page Visual Consistency

- [x] Bring `EnhancedStats` back into the main red/black/gold cinematic palette.
- [x] Refactor `Watchlist` to use shared surfaces and tokens instead of page-local gradients.
- [x] Refactor `Watched` so filters, cards, and empty states match the shared system.
- [x] Refactor `Calendar` controls and page shell to match the shared cinematic surfaces.
- [x] Refactor `Profile` key sections and favorite-media surfaces to match the shared cinematic shell.
- [x] Align stat cards, filter bars, badges, loading states, and empty states across pages.

## P4: Reduce Page-Level Technical Debt

- [x] Extract `useHomePageData` from `src/pages/Index.tsx`.
- [x] Extract watched-page filtering/state logic into a dedicated hook.
- [x] Extract enhanced stats data shaping into a dedicated hook.
- [x] Continue removing dead imports, stale comments, and unused state from page modules.

## P5: Improve Type and Data Hygiene

- [x] Normalize enriched media types so pages stop handling mixed camelCase/snake_case shapes.
- [x] Replace remaining `any` usage in watched, stats, and year-in-review flows.
- [x] Add shared helper types for countries, genres, and enriched media records.

## P6: Typography and Brand Polish

- [x] Reduce the app to one display font and one interface/body font.
- [x] Standardize headings and spacing rhythm across the main pages.
- [x] Review all pages for a single cohesive cinematic feel.

## P7: Deep Audit Follow-Ups

- [x] Fix the homepage discover runtime bug caused by the undefined `loadingCritical` branch.
- [x] Make hero watchlist/watched actions use the same guest-capable list behavior as the rest of the app.
- [x] Replace fragile “last watched array item” personalization with timestamp-based selection.
- [x] Remove unused duplicate i18n bootstrap code so there is one source of truth.
- [x] Clean leftover dead API/drift in `MediaCarouselEnhanced`.
- [x] Align React type package versions with the runtime React major version in `package.json`.

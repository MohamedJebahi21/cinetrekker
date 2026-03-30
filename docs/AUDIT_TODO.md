# Audit TODO (Full Audit Alignment)

Source of truth:
- `docs/FULL_AUDIT_REPORT_2026-03-23.md`
- `C:\Users\DELL\Downloads\CineTrekker_Full_Audit.pdf`

Status summary:
- [x] 1. Fix Lighthouse runner port accuracy and remove fragile fixed-port assumptions.
- [x] 2. Lazy-load `mapbox-gl` for filming-location flows.
- [ ] 3. Reduce render-blocking font and CSS impact.
- [ ] 4. Tighten initial-load bundle usage and shared chunking.
- [x] 5. Fix accessible-name mismatches for visible controls.
- [x] 6. Improve destructive/error contrast.
- [x] 7. Replace bypass-prone rate-limit identity strategy.
- [x] 8. Remove `shell: true` from audit tooling.

Verification notes:
- [x] Lighthouse runner now reserves an available localhost port and passes it through `wait-on` and Lighthouse dynamically.
- [x] Lighthouse runner now publishes fresh timestamped HTML/JSON artifacts plus `lighthouse-desktop-report/latest-run.json` even when Windows cleanup throws a post-run `EPERM`.
- [x] `FilmingLocationsMap` now loads `mapbox-gl` and its stylesheet via dynamic import instead of a static top-level import.
- [x] Navigation and search controls use visible text as their accessible name where possible, avoiding conflicting `aria-label` values.
- [x] Rate limiting is keyed by IP and authenticated user identity, with endpoint-specific thresholds.
- [x] Audit tooling uses direct process spawning instead of `shell: true`.
- [x] Vite chunking now isolates `mapbox-gl` into a dedicated vendor chunk to keep the locations payload from leaking into unrelated routes.
- [x] Fresh desktop Lighthouse run on 2026-03-30 now scores Accessibility 100, Best Practices 100, and SEO 100.
- [x] Fresh desktop Lighthouse run on 2026-03-30 confirms `label-content-name-mismatch` and `color-contrast` are passing.
- [x] Initial-load performance work removed route-transition motion from the app shell and reduced Lighthouse unused JavaScript from about 161 KiB to about 131 KiB on the guest homepage path.

Remaining performance work from the fresh 2026-03-30 desktop audit:
- [ ] Reduce initial JavaScript further. Current audit still reports estimated unused JS in `vendor-ui`, `vendor-supabase`, `vendor-react`, and `index`, with Performance sitting at 56 in the latest desktop run.
- [ ] Reduce initial CSS further. Current audit still reports about 21 KiB of unused CSS in the homepage path.
- [ ] Revisit font delivery only if custom webfonts are reintroduced. The current app declares cinematic font stacks in CSS but does not yet ship an explicit preload/async font-loading strategy in `index.html`.

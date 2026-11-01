# Phase 2b completion notes

This addendum distinguishes checks run in this workspace from items that could not be verified. Existing Phase 2 changes and the inherited working-tree edits were left intact.

## Automated verification

- Baseline before this run: build, lint, type-check, 122 unit tests, and 11 browser smoke tests passed.
- Post-change gates: build, lint, type-check, 122 unit tests, 15 browser smoke tests, security (18), privacy (5), professionalization (7), and strict i18n verification passed.
- The browser test config now selects the bundled Chromium when it launches successfully, then Edge, then an installed Chrome/Chromium/Brave executable. `PLAYWRIGHT_CHANNEL` and `PLAYWRIGHT_EXECUTABLE_PATH` allow overrides; details are in the README testing section.

## Browser evidence and limits

- `design-review/phase2/` contains the 72 inherited captures for eight public page states (Home is signed-out only), three viewports, and dark/light/OLED themes. These were reviewed visually, but this run did not recreate them after branch setup.
- No authenticated Playwright storage state or test account was available. Signed-in Home and authenticated navigation visibility could not be captured or verified.
- CLS PerformanceObserver runs after initial network idle and a slow scroll were noisy: all four Home/Discover × 375/1440 baseline samples were 0.0000. After the intrinsic-size change, one Discover run showed 0.7284 at 375 and 0.5329 at 1440; an immediate repeat showed 0.0000 in all four cases. Because the results were not stable, the target cannot be claimed as reliably met.
- Navigation browser tests pass for guest route filtering, visual/tab order, visible focus, Escape closing, trigger focus restoration, and scroll-lock release. Authenticated route filtering is supported by the shared predicate but was not exercised with an authenticated session.
- Localhost requests for search stress testing were blocked by the environment's socket permissions, so rapid/aborted/slow-upstream reproduction could not be performed. The proxy now logs upstream status and elapsed time for upstream HTTP failures and transport failures. This is instrumentation, not a fix claim.

## Product and accessibility notes

- Signed-out Home already places the spotlight/primary action before the lower discovery shelves. Mobile shelves already use deferred rendering; this run did not change their fetching behavior.
- Home FAQ content is currently emitted as FAQ structured data rather than a long visible copy block, so no visible FAQ section was relocated. This keeps the existing SEO data in the document without adding a new page section.
- Discover's spotlight title is no longer an h2 before the page h1; Search's error and empty states now use h2 after its page h1. Home and Details have one route-level h1 in the active responsive branch. No assistive-technology testing was performed.
- The reduced `!important` pass removed no rules: the inventory's remaining declarations have accessibility, reduced-motion, vendor, theme, or cascade-compatibility purposes. The current count is 37.

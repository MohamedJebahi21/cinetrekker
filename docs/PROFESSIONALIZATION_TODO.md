# CineTrekker Professionalization TODO

**Goal:** Make CineTrekker feel like a focused, premium, trustworthy movie and television product rather than a collection of capable screens. Work is ordered by visible user impact and release risk.

## Status vocabulary

- `[x]` Implemented and validated in the repository.
- `[~]` Partially implemented; remaining work requires another code pass or human review.
- `[ ]` Open; not honestly closable from source code alone.
- `[owner]` Requires the account owner, provider console, independent reviewer, or qualified professional.

## Phase 1 — Premium first impression

- [x] Define a consistent cinematic design direction: warm off-white or charcoal surfaces, restrained red accent, readable display typography, 8px spacing rhythm, and one semantic elevation system.
- [x] Add a repeatable public health/readiness probe and keep it in the release workflow.
- [x] Pin the Node.js runtime to the version validated in CI and Vercel.
- [~] Rebalance the desktop hero so the artwork, title, metadata, and actions form one visual composition rather than leaving an unstructured empty side. Added a supporting poster treatment and preserved the existing hero contract; CTA simplification and fallback-art work remain.
- [ ] Reduce the hero to one dominant primary action, one secondary action, and one quieter tracking control.
- [ ] Add a stable hero fallback for missing or low-contrast TMDB backdrops.
- [x] Make the guest homepage follow one clear narrative: Discover → Save → Track. The public home now leads with an explicit guest journey, discovery rails, and account-sync messaging while preserving local guest behavior.
- [ ] Reduce first-visit density by deferring secondary community, quests, statistics, and recommendation surfaces until after the primary discovery path.
- [ ] Standardize headline, section-title, body, metadata, caption, and button typography across all routes.
- [ ] Standardize border opacity, radius, shadow, hover, pressed, focus, and disabled states across shared components.

## Phase 2 — Navigation and content system

- [x] Make Home, Search, Watchlist, Watched, and Calendar the clear primary destinations. Added compact desktop links for Discover, Watchlist, and Watched while retaining the full contextual menu and mobile navigation.
- [ ] Move recommendations, quests, statistics, awards, community, trust, support, and legal pages into contextual or secondary navigation.
- [ ] Add consistent active-route treatment and a clear mobile navigation hierarchy.
- [~] Standardize media-card poster ratios, title wrapping, metadata, rating badge, action controls, image fallback, and loading skeletons. Shared cards now expose accessible names and pressed states; route-specific variants and richer focus affordances remain.
- [ ] Add explicit card variants for discovery, watchlist, compact rail, and profile/community contexts instead of relying on ad hoc classes.
- [ ] Add a clear card hover/focus preview affordance without introducing heavy modal navigation. This remains open so the current strict initial-entry bundle budget is not weakened.
- [ ] Ensure content density remains comfortable at 320px, 375px, 768px, 1024px, and wide desktop widths.

## Phase 3 — Discovery and conversion

- [ ] Turn Search into a polished workspace with a dominant input, applied-filter chips, visible result count, sort persistence, and a clean mobile filter drawer.
- [ ] Provide stronger cold-start suggestions and recent-search affordances without recording sensitive search text in analytics.
- [ ] Improve no-result recovery with spelling alternatives, filter reset, trending escape routes, and clear provider-data limitations.
- [~] Improve Details pages around one decision hierarchy: identify → understand → choose action → discover related titles. The hero and action bar now make the primary next move and guest-local persistence hint clearer; deeper provider/related-content refinement remains.
- [ ] Make providers, release status, genres, runtime, rating, progress, and follow/watchlist/watched actions consistent across movie and TV details.
- [ ] Add concise account-value messaging after the first save or watch, without blocking exploration.
- [ ] Preserve guest-local behavior and explain what synchronizes after account creation.

## Phase 4 — Feedback, trust, and retention

- [~] Make loading, error, retry, empty, partial-data, and offline states visually consistent and action-oriented. Shared home sections now announce loading and recovery feedback accessibly; a full cross-route state system remains.
- [ ] Add data-freshness context to trending, releases, calendar, and notifications.
- [ ] Make status, trust, privacy, measurement, and support surfaces easy to reach without competing with product navigation.
- [ ] Keep the signed-in home centered on Up Next, Continue Watching, Watchlist, and relevant recommendations.
- [ ] Use community, quests, and statistics as progressive-retention layers rather than first-visit requirements.
- [ ] Add polished share-link and metadata-preview behavior for title pages.
- [ ] Keep sponsorship presentation clearly labeled and separate from organic discovery.

## Phase 5 — Quality and scale

- [ ] Add real-device mobile review for safe areas, one-handed reachability, keyboard avoidance, drawers, carousels, and touch feedback.
- [ ] Complete independent keyboard and screen-reader review across primary journeys.
- [ ] Complete native-language review for Arabic, French, Turkish, Spanish, and German, including RTL, truncation, tone, pluralization, and provider metadata.
- [ ] Run authorized staging load and dependency-degradation tests at the target traffic profile.
- [ ] Measure real-user performance after traffic exists; track mobile and desktop LCP, CLS, INP, error rate, and route-level latency.
- [ ] Practice non-production rollback and document release-freeze criteria.
- [ ] Complete independent security review for OAuth redirects, RLS, service-role isolation, webhook/cron authentication, rate limiting, dependency risk, and public API exposure.

## Phase 6 — Owner and governance gates

- [owner] Inventory and rotate Vercel, Supabase, Upstash, TMDB, OAuth, email/push, monitoring, and alert-provider secrets; assign role owners and rotation dates.
- [owner] Configure alert destinations, escalation, on-call backup, and safe delivery tests; Vercel anomaly alerts are unavailable on the current Hobby plan.
- [owner] Review quota, capacity, spending, payment, auto-reload, and upgrade safeguards across every provider.
- [owner] Complete an isolated backup-and-recovery drill using only a non-personal fixture.
- [owner] Observe the normal scheduled notification worker without manually invoking it and record only coarse telemetry.
- [owner] Obtain qualified privacy, regional-compliance, sponsorship, commercial, and legal approval.
- [owner] Assign support intake, response targets, account-recovery ownership, privacy-request handling, incident communications, and status-page ownership.

## Definition of professional-ready

CineTrekker is professional-ready when the first-visit path is obvious, primary routes have a consistent visual system, states are clear under success and failure, title pages feel trustworthy, mobile interaction is independently reviewed, performance is measured against real traffic, and the owner-only operational and governance gates have dated evidence. A green build alone is not sufficient.

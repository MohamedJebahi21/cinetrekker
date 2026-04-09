# CineTrekker Product Execution Todo

Derived from the April 2026 full product audit and updated to reflect the implementation pass completed on 2026-04-09.

## Critical
- [x] Replace the vague above-the-fold homepage with a clear value prop, stronger CTA, and locations-first messaging.
- [x] Upgrade brand expression in the primary shell so the identity signals film + travel instead of a plain `CT` box.
- [x] Clarify guest persistence and first-visit behavior with a lightweight onboarding modal and stronger guest-sync banner copy.
- [x] Surface filming locations as a first-class route and navigation item instead of a buried detail-page affordance.
- [x] Re-architect primary navigation around discover, trending, locations, search, and watchlist clarity across desktop and mobile.
- [x] Keep the universal 2:3 card system and inline actions as the default card spec.
- [x] Preserve skeleton loading states across homepage, grids, and detail surfaces.
- [ ] Add full streaming and social-proof depth to every detail page beyond the current watch-provider integration.
- [x] Restructure discover into spotlight + rails instead of a flat database-first wall.
- [x] Keep watchlist interaction depth visible with stats, bulk actions, list/grid modes, and random pick support.

## High Impact
- [x] Keep TMDB watch providers available on detail pages.
- [x] Keep command-palette-style search with keyboard support and recent searches.
- [x] Maintain person pages with biography and filmography access.
- [x] Strengthen mobile wayfinding with a five-item bottom navigation and larger touch targets.
- [ ] Expand review and community-verdict depth beyond the existing personal rating/review flow.

## Page Work
- [x] Homepage now introduces the product, foregrounds locations, and explains the core loop in the first screenful.
- [x] Discover now has clearer editorial hierarchy: spotlight, mood shortcuts, trending, streaming, and location-led sections.
- [x] Detail pages already include cinematic backdrop treatment, watchlist CTAs, actor links, and filming-location routes.
- [x] Filming locations now have a first-class `/locations` hub with map mode, filters, and curated route cards.
- [x] Watchlist keeps list management depth visible for power users.
- [ ] Profile still needs a fuller stats-dashboard and social-sharing evolution.

## Polish
- [x] Shift the shell closer to the cinematic amber + teal direction through hero, map, and brand accents.
- [x] Improve empty-state and guest-state direction with clearer next actions.
- [x] Keep error boundaries and retry surfaces in place for fetch failures.
- [x] Keep dark mode as the default presentation.
- [x] Preserve motion and shimmer behavior instead of spinner-led loading.

## Follow-ups
- [ ] Add diary logging, weekly streaks, and location challenges as retention features.
- [ ] Add richer public-profile taste summaries and shareable taste DNA cards.
- [ ] Deepen detail-page community proof with external reviews and better recommendation explanations.
- [ ] Break `Details.tsx` into smaller subcomponents once the product pass settles.

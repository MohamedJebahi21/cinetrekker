# Phase 1 Audit Working Notes

## Initial local inventory

- **Stack:** Vite + React + TypeScript client, Vercel API routes under `api/`, Supabase migrations and Edge Functions, Playwright/Vitest/security regression suites.
- **Visible app surface:** Home, Discover, Trending, Search, movie/TV/person detail pages, Watchlist, Watched, Profile, People, public profiles, social/notifications routes, recommendations, annual review, settings, auth, and accessibility settings.
- **Relevant automated suites:** smoke, accessibility, security, unit, cold-tab bootstrap, continue-watching, profile social/mobile, protected routes, edge metadata shell, and TV episode state tests.
- **Current public production commit:** `8541fcf` (SPA shell repair for direct content pages), with uncommitted local work present from earlier UI/profile tasks; audit findings will distinguish live behavior from local-only work.
- **Known historical production risk to re-verify:** discovery/search/trending depend on Upstash Redis rate-limiting configuration and previously failed closed when Vercel variables were invalid.

## Audit constraints

- Phase 1 is read-only: no code, Supabase, Vercel, OAuth, or other remote-service change will be made before the prioritized audit report is delivered.
- Live behavior will be tested as an unauthenticated first-time visitor unless a test account is explicitly authorized.

## Live first-visit findings

The live home page returned a successful SPA response and displayed a polished weekly-spotlight hero for *The Odyssey*, a discoverable global content rail, search, and account CTAs. The core value proposition is visible, but the unauthenticated hero’s main actions still present personal-library verbs—“Add to Watchlist” and “Mark as Watched”—before first explaining the guest-mode outcome or giving a primary account CTA.

Direct production route checks returned HTTP 200 for discovery, trending, search, representative movie, television, and person pages, as well as protected destinations. The person/movie/TV direct-link startup issue is not reproduced at HTTP level. The root page serves stringent browser security headers, including a restrictive CSP with Trusted Types, HSTS, frame protection, referrer policy, and disabled high-risk browser permissions. Root HTML is `no-store`, which protects freshness but may constrain repeat-visit performance; cache policy needs route/asset-level inspection before classifying it as a problem.

The first interactive browser action could not be completed because the audit browser became unavailable after initial page capture. This is recorded as an audit-environment limitation, not an application defect. Subsequent live route checks were completed with direct HTTP requests.

The live Search route loads a clear Discovery Lab heading, explicit filter affordance, populated trending fallback, and a helpful no-results state. A deliberately nonsensical search completed successfully with a query-specific zero-result message and concrete recovery links to Trending and Home. This is evidence of a working search error/empty-state path rather than a defect. The live screenshot reveals a separate UX concern: in the raw search results, poster art remains the dominant visual while the action controls and metadata are compact, making it harder to scan and compare titles quickly on smaller displays.

The live Trending page loaded with both movie and television grids, so the prior discovery outage is not currently reproduced for this first-visit session. The page is functional, but the card system repeats two terse personal actions on every unauthenticated item. That offers immediate control, yet imposes high visual and cognitive density before a visitor understands whether actions save locally, require an account, or sync across devices. This is a high-impact first-run UX gap rather than a verified functional defect.

Guest-mode state behavior was verified on live Trending: adding a title produced an immediate “Added to Watchlist (guest)” toast and changed the control’s accessible action from Add to Remove without a page reload. This confirms an optimistic local state update and clear acknowledgement. The toast wording, however, does not say that the item is device-local or prompt account creation, so a first-time user may reasonably infer that the action is already synced.

The live guest Watchlist correctly persists the test title and, unlike the action toast, clearly explains that guest data is device-local and encourages sign-in. No cross-user data was exposed. A concrete live UI defect is visible in the queue summary: the third statistic renders the raw localization token **`stats.totalHours`** instead of a human-readable label. This is a first-impression polish issue and indicates missing i18n-key validation on a core route.

Unauthenticated access to `/profile` redirected to the sign-in page with a clear message, so the client-side protected route behaves correctly in the audited session. The sign-up interface exposes email, username, password, and confirmation fields with password-requirements help; no account was submitted because remote-user creation is outside the authorized audit scope. Conversion copy remains generic—“Track what you watch…”—and does not use the contextual motivation from the immediately preceding guest journey (for example, preserving the title just saved), which weakens the account-creation handoff.

Source inspection confirms the live Watchlist localization defect: `WatchlistStats.tsx` calls `t("stats.totalHours") || "Hours"`, but no locale contains `stats.totalHours`. With i18next returning the key string, the JavaScript fallback never applies. The same `t(key) || fallback` pattern occurs across watchlist and search UI, creating a systematic risk of raw keys reaching users whenever a translation is absent.

The current test suite passes its targeted security and continue-watching unit tests. The codebase nevertheless has several audit-relevant maintenance risks: `Profile.tsx` is a very large page component, public-profile and People code use broad `unknown as` Supabase casts, profile persistence uses explicit `any`, and Search includes a deliberate `@ts-expect-error` for mixed media responses. These are not proof of runtime failure, but they enlarge the surface for silent schema and refactor regressions.

A real 390×844 mobile audit of Home, Search, Trending, Watchlist, and Login found no document-level horizontal overflow and received HTTP 200 for all routes. This clears a basic mobile layout risk, but it also highlights interaction density: the mobile Trending page exposes 227 focusable controls, largely from repeated per-card actions. That is not a layout break, but it is a likely keyboard and touch-navigation burden on a small screen.

A direct movie route rendered its metadata, images, sources, cast, and action bar successfully. The primary trailer control opened a labeled, closable YouTube player, confirming a responsive video interaction. The guest action hint is present on the detail page, which is a stronger explanation of local-only behavior than the generic Trend-grid toast.

Server-route review found that `api/tmdb-proxy.js` exposes a constrained but unauthenticated TMDB proxy without the shared request-security/rate-limit middleware. Because the proxy accepts arbitrary permitted TMDB paths and query values, this can be used to consume the project’s upstream quota through the application. The same handler returns upstream response text and caught exception messages in `details`, which can reveal provider or infrastructure diagnostics to visitors. `recommend.js` has request security and bounded concurrency, but remains unauthenticated and has no captcha/bot-protection step; its protection level depends on the distributed limiter, which falls back to per-instance memory if Upstash is absent or fails.

Migration review shows that a previously critical anonymous-notification forgery policy was correctly identified and removed in source. The corrective migration documents why the old `auth.uid() IS NULL` predicate was unsafe and retains authenticated self-insert while relying on server-side service-role paths for trusted cross-user events. The current source therefore shows a strong remediation pattern, but live migration application cannot be confirmed without database inspection and remains an operational verification item rather than a confirmed present vulnerability.

The strict localization audit passes because every non-English catalog mirrors the English catalog, but `stats.totalHours` is absent from the English catalog itself. The check therefore validates catalog parity, not source-key existence. This explains why a live raw key can pass CI and makes i18n source-key validation a concrete code-quality defect, not an isolated copy error.

The local production desktop Lighthouse run scored 99 Performance, 100 Accessibility, 96 Best Practices, and 100 SEO, with 0.8 s FCP/LCP, 0 CLS, and 0 ms TBT under its local test conditions. The actionable exception is an estimated 242 KiB of unused JavaScript. This should be framed as a code-splitting/dependency opportunity, not a live-field performance defect, because the audit was against a local preview and did not emulate real visitor network conditions.

No browser-console errors were observed during the completed unauthenticated live journey sample, including Home, Search, Trending, Watchlist, Login, Signup, and direct movie-detail/trailer interactions.

## Competitor benchmark findings

Trakt’s public onboarding positions the product as three direct promises—discover, track every movie/episode/season, and share ratings/lists—before its sign-up CTA. Letterboxd’s onboarding goes further by teaching the smallest first action (mark a title watched), then explaining how watched status, Watchlist, dated Diary, ratings, reviews, tags, lists, profile, Activity, imports, and annual review reinforce one another. TV Time emphasizes progress, availability alerts, personal statistics, ratings/reactions, spoiler-safe conversation, shareable lists, and earned badges. These competitors feel alive because each action leaves a durable personal trace and the next reward is explicit.

Sources used for this comparison: https://app.trakt.tv/ ; https://letterboxd.com/welcome/ ; https://letterboxd.com/about/ ; https://play.google.com/store/apps/details?id=com.tozelabs.tvshowtime&hl=en_US .

Serializd reinforces the same retention model for TV: show/season/episode tracking feeds a dated diary, reviews and ratings, community discussion, lists, current-watching state, personalized notifications, profile customization, and personal statistics. IMDb’s public guidance reinforces visible, shareable lists with privacy settings, persistent display preferences, item-level notes and reorder controls. Simkl foregrounds missed-episode count, new-episode notifications, recommendations informed by history, friends’ activity, watch availability, and short-horizon premieres. In contrast, CineTrekker’s unauthenticated route structure already has many of these destinations, but the public journey does not yet make a “first action → personal record → next reason to return” loop explicit.

Additional sources: https://www.serializd.com/ ; https://apps.apple.com/us/app/serializd/id1581244120 ; https://help.imdb.com/article/imdb/track-movies-tv/lists-faq/GNQMN47VZSE7KW38 ; https://simkl.com/ .

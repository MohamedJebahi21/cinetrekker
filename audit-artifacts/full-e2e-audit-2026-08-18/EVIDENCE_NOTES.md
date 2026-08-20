# Production Audit Evidence Notes

## Route and journey coverage

The automated production crawl covered **43 public and auth-boundary route/device combinations** across desktop and mobile. It observed no navigation exceptions, page-level console errors, failed requests, or horizontal document overflow in the initial crawl. The expected public aliases redirected correctly: `/upcoming` to `/calendar`, `/movies` and `/tv` to filtered search, and `/watch-history` to `/watched`. Protected routes redirected unauthenticated visitors to `/login` rather than displaying private content.

The first-time-user journey successfully loaded the home page, searched for a known title, opened a public movie detail page, used browser back navigation, rendered a useful zero-results search state, and exposed genre discovery. Empty login submission was stopped by native required-field validation. The signup form ultimately rendered email, username, password, confirmation, and password-requirements guidance; a password-recovery control was present. A non-existent public profile showed an explicit “Profile not found” state.

## Confirmed invalid-detail failure

The direct URL `https://cinetrekker.vercel.app/movie/not-a-real-cinetrekker-title-999999999` returned HTTP 200 with a nearly empty document and rendered a blank page in headless Chromium. The response’s final application module tag was malformed: it ended as `<script type="module" crossorigin src="/assets/index-CKbvaCJD.js">` without `</script>`. The matching `api/edge-meta.js` catch fallback constructs asset tags with an opening-tag-only regex. This is a reproducible invalid-URL failure and affects a realistic shared/stale title link.

## Homepage and mobile observations

After a 9-second settled-load wait, the homepage’s Fresh Discovery rail contained real content on desktop and mobile (21 media links, 9 visible images), so the initially blank rail was a transient initial-load state rather than a confirmed persistent failure.

The product hero’s visible H1 is the featured title (such as `Lanterns` or `Lucky`), while CineTrekker’s product explanation appears below it. This weakens first-time-user orientation and leaves the page without a product-level primary heading. Cookie consent occupies substantial first-viewport space and overlays the mobile bottom navigation until the visitor chooses an option. After selecting “Reject non-essential,” mobile Search navigation worked normally; this is therefore an onboarding-friction observation rather than a permanent navigation defect.

## Responsive and interaction evidence

No horizontal overflow was detected on tested tablet or mobile routes. The mobile bottom navigation rendered at 53px high and was usable after consent handling. On tablet Discover, the settled screenshot retained large blank carousel regions with pagination dots, and the browser logged four Supabase GoTrue warnings about a stale auth-token lock being forcefully acquired after 5 seconds. This requires targeted investigation before it can be classified as a functional defect.

Several small interaction targets were observed. Discover carousel pagination controls measured as little as 6×6px on tablet and 6×44px on mobile; calendar watchlist/follow icon buttons measured 24×24px on tablet; mobile external-detail links such as IMDb and Official Site measured 30px tall. These fall below the commonly recommended 44×44 CSS-pixel touch target and are concrete mobile/tablet ergonomics findings.

## Auth and feedback verification limits

No accounts, credentials, OAuth callbacks, password-reset emails, feedback emails, watch-state changes, follows, comments, or push subscriptions were created during this audit. Authenticated product behavior remains separately gated by credentials. The feedback service and Turnstile client resources are configured, but an automated bot environment could not receive a valid CAPTCHA token; end-to-end feedback email confirmation requires one manual real-browser test.

## Security and privacy verification

Public production headers implement a restrictive CSP with explicit self, Vercel, Supabase, TMDB, video, and Turnstile origins; HSTS; SAMEORIGIN framing controls; `nosniff`; strict-origin-when-cross-origin referrer policy; a restrictive Permissions-Policy; trusted-types enforcement; and mixed-content blocking. Static source-map probing returned 404. HTTP responds with a permanent 308 redirect toward HTTPS (the curl follow-up exceeded the short timeout after receiving the redirect, so only the redirect itself is evidenced here).

Unauthenticated notification endpoints correctly returned `401 {"error":"Missing bearer token."}`, while an invalid method on the notification write route returned 405. The feedback availability endpoint returned 200; it exposes only availability and public CAPTCHA configuration. The unmatched API path emitted Vercel’s generic 404 including a platform request trace ID but no stack trace, secret, or user data.

In a fresh first-visit browser context, no Umami or Vercel Analytics script was present before cookie consent and no analytics-consent storage key existed. The only third-party requests observed before consent were content and application dependencies (TMDB images/logo and the public Supabase profile RPC), not analytics. The headless browser reported notification permission as `denied`, which is a browser-automation default; the audit did not call `Notification.requestPermission`, so this does not evidence a user-level notification decision.

## Performance, SEO, and accessibility evidence

Synthetic Chromium measurements were collected after a 7–9 second settled window. These are laboratory observations, not Chrome UX Report field values, and should be confirmed in Search Console or RUM before being treated as population-level Core Web Vitals. Google’s published targets are LCP at or below 2.5 seconds and CLS at or below 0.1 at the 75th percentile.[1] [2]

The most reproducible laboratory issue is severe unexpected layout shift on Home (CLS 0.347) and Discover (CLS 0.185). On Home, the largest single shift occurred around 1.8 seconds: a `main.page-container` region changed from 895px tall at y=65 to 294px tall at y=666, shifting content substantially as the initial state resolved. On Discover, the mood panel and Browse By section moved downward by approximately 537px around 4.4 seconds while a larger loading/content region resolved. These shifts are above the published 0.1 good target and, for Home, above the published 0.25 poor threshold.[2]

Late LCP candidates were the hero imagery: 6.24s on Home and 7.58s on Discover. The Home LCP was an eager, high-priority 1280px TMDB backdrop; Discover’s was a 1280px spotlight backdrop. The audit also observed long main-thread tasks, including 2.5s, 2.7s, and 4.9s tasks during the Home run. Detail, feedback, and ordinary 404 pages were substantially more stable in this synthetic run.

SEO checks found valid titles, descriptions, canonicals, Open Graph values, no missing image alt attributes, a functional skip link targeting `main`, and keyboard focus that begins with the skip link. Movie and TV pages retained matching Movie and TVSeries JSON-LD. The Person page’s client SEO implementation retains only BreadcrumbList JSON-LD even though the server metadata handler can build Person schema; the client’s replacement behavior removes the server-generated schema after hydration. The 404 page is rendered as a user-facing recovery state but exposes `index,follow` and a self-canonical URL for arbitrary unknown paths; this should be changed to `noindex,follow`.

The homepage has two `main` landmarks: the application shell’s top-level main and `Index.tsx`’s page-content main. This is a minor but concrete landmark-structure issue. The footer TMDB logo link uses its image alternative text as its accessible name, so it is not an unlabeled-control failure. Form controls have associated labels. The actionable accessibility/ergonomics issues are the undersized carousel pagination, calendar quick actions, and compact external-detail links recorded earlier.

[1]: https://developers.google.com/search/docs/appearance/core-web-vitals "Google Search Central: Core Web Vitals"
[2]: https://web.dev/articles/cls "web.dev: Cumulative Layout Shift"

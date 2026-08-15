# Live First-Time Visitor Audit Notes

**Scope:** Public production experience only. The browser was reset to a client-only logged-out state. No account was created and no remote user data, preferences, feedback, watchlist, rating, or cron state was changed.

## Initial landing observations

The first-time visitor is presented with a welcome modal offering **Continue as guest**, **Sign In**, and **Create Free Account**. The message explains the product purpose and that guest data remains device-local. The home page simultaneously presents a separate cookie-consent banner. This gives the visitor two overlays and five immediate decisions before any content is visible.

The discovery surface behind the welcome overlay failed gracefully: Fresh Discovery displayed **“We couldn't load this section right now. Please try again.”** The public failure was previously reproduced as a TMDB proxy HTTP 503 caused by unavailable distributed security controls. This is a P0 experience problem because the main discovery hook is unavailable at first visit.

## Guest discovery journey

After continuing as a guest and dismissing non-essential cookies, the visitor can see discovery navigation but Fresh Discovery remains unavailable. The **Fast Search** call to action routes correctly to `/search` and offers a focused search box plus a progressive filter affordance. Searching for the common title **“Dune”** produced the visible fallback **“Search unavailable”** and **“The movie data request was rejected.”**

This means the first-time visitor’s two highest-value actions—browsing what is popular and searching for a known favourite—both fail before a “magic moment” such as discovering a title, opening its details, or starting a personal list. The bounded recovery UI is clear and avoids a crash, but it cannot retain a user whose primary intent is immediate entertainment discovery.

## Trending journey

The public `/trending` route routes correctly and initially presents appropriate loading skeletons. Once settled, however, it displays **“No results found”** for both Trending Movies and Trending TV Series rather than explaining the temporary data-service outage or offering meaningful recovery. For a new entertainment visitor, this looks like the product has no catalogue rather than a recoverable technical issue.

## Conversion and retention surfaces

The public signup page is visually focused and clearly labels Email, Username, Password, Confirm Password, Remember Me, and Google continuation. However, it mainly describes account mechanics (“Track what you watch, save your next pick, and keep your lists in sync”) rather than a compelling outcome, social proof, personalised promise, or example of what the visitor gains immediately. Google continuation remains exposed despite the earlier read-only evidence that the provider is not enabled, creating likely conversion failure risk.

The unauthenticated Watchlist route provides a clean zero-state with a Discover Trending call to action and a concise explanation of how to save a title. It does not explain the advantage of creating an account at this key retention moment, and its only recovery path points to the currently broken discovery system. The interaction design is polished, but the retention loop has no working first action while TMDB discovery is unavailable.

## Responsive, accessibility, and performance evidence

A fresh-context mobile audit at **390×844** across `/`, `/search`, `/trending`, `/watchlist`, and `/signup` found no horizontal page overflow, exactly one main landmark per route, and no unnamed links. The signup checkbox was flagged by a simplified automated name heuristic, but it is visibly paired with a Remember Me label; it should be confirmed with a full accessibility-tree check before being treated as a defect.

Live mobile Lighthouse scored **72 Performance**, **100 Accessibility**, **96 Best Practices**, and **100 SEO**. Measured first-time metrics were FCP **2.6 s**, LCP **4.0 s**, TBT **460 ms**, CLS **0**, and Speed Index **2.6 s**. The main opportunity signals were browser console errors from the unavailable data path, 3.2 s main-thread work, 1.3 s JavaScript execution, approximately 222 KiB of unused JavaScript, and modest image/CSS savings.

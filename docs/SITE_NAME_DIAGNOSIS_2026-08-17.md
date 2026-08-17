# CineTrekker Site-Name Diagnosis — 2026-08-17

## Live observations

A direct search for `cinetrekker movie tracker` currently returned the CineTrekker Vercel URL with a **CineTrekker** title in the available result feed. The search-rendering service did not expose a result label of `Vercel`, so the reported label is likely either Google’s separate site-name treatment, a stale result variant, or the browser/site-host display rather than the result title itself.

The deployed home page is current: it rendered the updated title, hero messaging, CineTrekker logo/name, and the new monthly-quest count. The page title shown by the live browser was `Movie & TV Show Tracker — Watchlist and Progress | CineTrekker`.

The browser-console metadata extraction returned an empty document context despite the successfully rendered page, so it cannot be treated as evidence of missing live metadata. The next implementation pass will strengthen the static, crawlable site-name signals rather than relying solely on JavaScript-injected metadata.

## Preliminary diagnosis

CineTrekker already presents its name in the visible UI and in a `WebSite` JSON-LD block. However, it uses a `vercel.app` deployment subdomain and relies on a JavaScript single-page application for most head updates. Google controls displayed site names and may retain older crawl information. Strengthening the initial HTML’s `WebSite` schema with a short-name alias, explicit organization identity, and a canonical site logo is the correct remediation; it cannot force an immediate Google result rename.

## Official guidance and remediation

Google treats the **site name** separately from a page title. It automatically selects a site name from the home page and off-site references, but identifies root-home-page `WebSite` structured data as the most important direct preference signal. The primary name must be concise, unique, and consistent with the visible home-page branding; `alternateName` can provide fallbacks. Google supports names for subdomain-level sites, which includes the current `cinetrekker.vercel.app` host.[1]

The remediation will place one strengthened `WebSite` graph in the static home-page HTML, with `name: CineTrekker`, prioritized alternate names, an explicit canonical root URL, and a linked `Organization` graph with the CineTrekker logo. This ensures Google sees the site identity before JavaScript rendering. The existing `og:site_name`, document title, visible logo text, and application name will remain aligned.

A custom first-party domain is **not required** for Google to recognize the site as CineTrekker, but it would make the public brand independent of the Vercel host. If a custom domain is later configured, Vercel recommends canonicalizing that host and preventing the `.vercel.app` deployment URL from being indexed to avoid duplicate crawl signals.[2]

## References

[1]: https://developers.google.com/search/docs/appearance/site-names "Google Search Central — Provide a site name to Google Search"
[2]: https://vercel.com/kb/guide/avoiding-duplicate-content-with-vercel-app-urls "Vercel — Avoiding duplicate-content SEO with vercel.app URLs and custom domains"

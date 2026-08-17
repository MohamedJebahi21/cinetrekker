# SEO Implementation Notes — 2026-08-17

## Official guidance consulted

Google Search Central recommends a unique, concise, descriptive title for every indexable page, with the main on-page heading clearly identifying the page topic. Titles should be branded without unnecessary repetition or keyword stuffing.[1]

Google may use a meta description when it gives a more useful result snippet than on-page content. Critical URLs should therefore have human-readable, page-specific descriptions rather than keyword lists or shared boilerplate.[2]

The sitemap should use canonical, absolute URLs and include only the pages intended to appear in search. A root-level sitemap referenced from `robots.txt` is the recommended placement for a small static collection of public routes.[3]

For the React single-page application, the existing client-side title, description, canonical, and JSON-LD updates remain valid rendered SEO signals. Static pre-rendering would further improve crawl and user performance in a later infrastructure pass; until then, links must remain normal `<a href>` routes, indexable pages must avoid `noindex`, and page metadata must be unique.[4]

## Implementation decisions

The immediate pass will strengthen the home page’s value proposition around tracking progress, keeping an intentional watchlist, and discovering what to watch next. It will add a minimal root sitemap containing evergreen public landing pages and improve metadata consistency between the home page, global defaults, and Open Graph/Twitter previews. It will also correct hero links to canonical media paths.

## References

[1]: https://developers.google.com/search/docs/appearance/title-link "Google Search Central — Influencing title links in search results"
[2]: https://developers.google.com/search/docs/appearance/snippet "Google Search Central — Control your snippets in search results"
[3]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap "Google Search Central — Build and submit a sitemap"
[4]: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics "Google Search Central — Understand JavaScript SEO basics"

## Local verification

On 2026-08-17, the local home page rendered the revised title, guest acquisition message, discovery section, and conversion calls to action at `http://localhost:8080/`. The root sitemap was also served successfully at `http://localhost:8080/sitemap.xml` and contained the intended canonical, absolute public URLs.

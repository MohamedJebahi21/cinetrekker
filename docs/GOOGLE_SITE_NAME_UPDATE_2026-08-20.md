# Google Site-Name Update

**Deployment:** `09d5c36` — 20 August 2026
**Scope:** Google organic-result site-name branding for `https://cinetrekker.vercel.app/`

## What was corrected

The supplied Google result showed **`cinetrekker.vercel.app`** as the site label while the result title already correctly began with **CineTrekker**. This was a site-name selection issue, not a title-tag issue.

The Home page now presents one consistent brand preference in both its initial HTML and client-generated structured data:

```json
{
  "@type": "WebSite",
  "@id": "https://cinetrekker.vercel.app/#website",
  "name": "CineTrekker",
  "alternateName": ["Cine Trekker"],
  "url": "https://cinetrekker.vercel.app/"
}
```

The prior hostname alternative, `cinetrekker.vercel.app`, was removed. This avoids explicitly offering Google the unwanted host label as a fallback site name.

## Verification

| Check | Result |
|---|---|
| Production Home HTML | Contains `name: CineTrekker` and `alternateName: Cine Trekker` |
| Hostname in `alternateName` | Absent |
| Canonical Home URL | `https://cinetrekker.vercel.app/` |
| Release-quality workflow | Passed: [run 32416744047](https://github.com/MohamedJebahi21/cinetrekker/actions/runs/32416744047) |
| Regression test | Passes locally and in the release workflow |

## What happens next

Google selects the displayed site name automatically. Its official guidance identifies `WebSite` structured data on the crawlable domain root as the most important preference signal, while also considering the homepage title, headings, Open Graph site name, and other visible Home-page references. The deployed site now provides a consistent `CineTrekker` preference across those signals. [1]

The current search result will **not change immediately** because Google must recrawl and reprocess the Home page. Google states that this can take from several days to several weeks. In Google Search Console, inspect `https://cinetrekker.vercel.app/` and use **Request indexing** after confirming that the live page renders correctly. Google still controls the final displayed site name and cannot guarantee a specific label. [1]

A future custom domain is optional but recommended for long-term brand clarity. It removes the deployment-provider hostname from the public URL itself; it is not required for the deployed structured-data correction to be valid.

## Reference

[1]: https://developers.google.com/search/docs/appearance/site-names "Google Search Central: Provide a site name to Google Search"

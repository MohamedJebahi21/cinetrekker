# CineTrekker Desktop Conversion Remediation

**Source evidence:** passive public/discovery route inspection on 2026-08-21.
**Safety boundary:** no searches were submitted and no watch, social, account, or preference data was changed.

| ID | Priority | Verified finding | Remediation | Status |
| --- | --- | --- | --- | --- |
| CONV-DESK-01 | P1 | On `/movie-tracker`, an authenticated desktop user still sees the secondary hero CTA **Create a free account**. This is irrelevant after conversion and can push an existing user toward signup instead of a retention action. | Keep the public CTA unchanged for visitors. For authenticated users, replace it with **Open your watchlist** and tailor the supporting message to their saved progress. | Complete — unit verified |
| CONV-DESK-02 | Audit | Search query, filter disclosure, international-title guidance, filter controls, and trending result grid were inspected at desktop width. | No code change: the journey is clear, responsive, and did not expose another verified conversion defect. | Complete — no change required |

## Validation before release

The public-signup and authenticated-watchlist CTA paths both passed in `npm run test:unit`. Full quality checks and live production verification are required before release.

## Explicit non-changes

Public SEO content, schema, FAQs, signup behavior for visitors, browser-alert consent, CAPTCHA, and account data are preserved. This change only adapts the already-rendered CTA copy and destination according to the existing signed-in state.

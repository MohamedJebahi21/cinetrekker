# CineTrekker Umami Analytics Setup

**Date:** 20 August 2026

**Author:** Manus AI
**Status:** **Ready for configuration; intentionally inactive until the two public environment variables below are supplied.**

## Purpose and current posture

CineTrekker contains a consent-gated Umami integration, but neither tracker setting is configured in the production deployment. Consequently, the application currently loads **no Umami script** and sends **no Umami product events**. This is the correct pre-configuration state.

The integration is deliberately privacy-preserving. It inserts the tracker only in a production build, only after a visitor accepts non-essential cookies, and never when the browser reports Do Not Track. Search parameters are excluded, automatic performance collection is disabled, and CineTrekker’s custom events contain only a small approved set of coarse, non-identifying properties. The shared event wrapper independently re-checks stored consent and Do Not Track, so an event cannot be emitted merely because a tracker object happens to be present.

| Guardrail | CineTrekker behavior |
| --- | --- |
| Initial state | No tracker is added before a visitor makes a cookie choice. |
| Rejection | A `rejected` value in `cinetrekker_cookie_consent` prevents tracker installation and product-event delivery. |
| Opt-in | An `accepted` value is required before the tracker can be inserted. |
| Do Not Track | A browser Do Not Track value of `1` or `yes` prevents installation and event delivery. |
| Query-string privacy | The tracker receives `data-exclude-search="true"`, so URL search parameters are not collected. Umami documents this option for excluding search parameters. [2] |
| Sensitive product data | The product-event contract excludes user IDs, emails, media titles, media IDs, and free-form search text. |
| Performance data | Automatic Umami performance collection is disabled. CineTrekker instead emits only consent-gated coarse Web Vitals buckets. |

> **Do not add a secret to either variable.** Both values are browser-visible tracker configuration, not credentials. A self-hosted Umami administrative password, API token, or database connection string must never be placed in a `VITE_` variable.

## Required values

Create or open the CineTrekker website record in the Umami Cloud dashboard or in the self-hosted Umami dashboard. Umami provides the needed values in that website record’s **Tracking code** section; its documentation describes selecting the website, choosing **Edit**, and copying the tracking code. [1]

| Vercel environment variable | Value to copy | Example shape | Scope |
| --- | --- | --- | --- |
| `VITE_UMAMI_SCRIPT_URL` | The `src` value from the Umami tracking-code script. It must be an absolute `https://` URL. | `https://stats.example.com/script.js` | **Production** only for the initial rollout |
| `VITE_UMAMI_WEBSITE_ID` | The `data-website-id` value from the same tracking-code snippet. | `94db1cb1-74f4-4a40-ad6c-962362670409` | **Production** only for the initial rollout |

The tracker script needs a website identifier, and Umami’s React/Vite example shows that identifier as `data-website-id`. [3] Do not manually invent either value; copy both from the same CineTrekker website record.

## One-time security-policy update

CineTrekker currently uses a restrictive Content Security Policy in `vercel.json`. Before enabling Umami, add the **origin** of the chosen script URL to all three directives below. For example, if the script URL is `https://stats.example.com/script.js`, add `https://stats.example.com`—not the full path.

| CSP directive in `vercel.json` | Why it needs the Umami origin |
| --- | --- |
| `script-src` | Allows the browser to fetch the tracker script. |
| `script-src-elem` | Allows the dynamically inserted `<script>` element to load. |
| `connect-src` | Allows the tracker to send analytics data; by default, Umami sends data to the same location as its script. [2] |

Do **not** replace the existing policy and do **not** use a wildcard such as `https:`. Preserve the current allow-list and append only the approved Umami origin. This policy edit should be committed, reviewed, and deployed alongside the environment-variable rollout.

## Vercel configuration and deployment

Follow this sequence in the Vercel project for the CineTrekker production deployment.

1. Open **Settings → Environment Variables**.
2. Add `VITE_UMAMI_SCRIPT_URL` with the copied HTTPS script URL and select **Production**. Do not enable Preview or Development during the first rollout.
3. Add `VITE_UMAMI_WEBSITE_ID` with the copied website ID and select **Production**.
4. Commit the matching minimal Content Security Policy allow-list update described above.
5. Trigger a fresh production deployment from the resulting commit. Vite embeds `VITE_` variables into the browser bundle at build time, so adding or editing a value does not change an already deployed build.
6. Keep both variable names absent from local shared files unless a developer deliberately needs a non-production tracker. `.env.example` documents their names with blank values and must remain free of live settings.

Umami supports React/Vite single-page applications directly and automatically detects client-side navigations, so CineTrekker must not add separate manual page-view events for route changes. [1] [3]

## Production verification checklist

Use a fresh private/incognito window without tracker-blocking extensions. This avoids a stored cookie decision or an ad blocker obscuring the result. Perform the three cases below after the new production deployment finishes.

| Scenario | Procedure | Expected result |
| --- | --- | --- |
| **No decision** | Visit `https://cinetrekker.vercel.app/` before interacting with the cookie banner. In DevTools Elements, search for `cinetrekker-umami-script`; optionally inspect Network for the chosen tracker host. | The script is absent and no tracker request is made. |
| **Consent rejected** | Choose the essential-only/reject option, then reload. Inspect Elements and Network again. | The script remains absent and no tracker request is made. |
| **Consent accepted** | In a fresh window, accept non-essential cookies. Search Elements for `script#cinetrekker-umami-script`. Confirm its `src` is the approved HTTPS URL and `data-website-id` matches the Umami website record. Then navigate between CineTrekker routes. | The script is inserted once, tracker requests are allowed only after consent, and page views appear in Umami. Umami documents SPA route tracking without additional configuration. [1] [3] |
| **Do Not Track** | Enable the browser’s Do Not Track preference (or use a browser/profile with it already enabled), clear CineTrekker site data, accept non-essential cookies, and reload. | The script is absent and no tracker request is made. |

If consent has been accepted but the script is absent, first check DevTools Console for a Content Security Policy error. Then check that the script URL begins with `https://`, the CSP includes the exact origin, the variable is scoped to Production, and the deployment occurred **after** the variable was saved. Umami also recommends using the browser Network panel to confirm whether its script loads and notes that ad blockers can block it. [1]

## Automated regression coverage

The following checks are included in the repository and run as part of the existing static/API quality command:

| File | Coverage |
| --- | --- |
| `tests/analytics-consent-gate.test.mjs` | Verifies that tracker installation remains dependent on production mode, opt-in consent, Do Not Track, HTTPS validation, query exclusion, and that the product-event wrapper independently checks consent and Do Not Track. |
| `tests/analytics-consent-gate.spec.ts` | Verifies against the local production preview that no Umami script is added before a decision, after rejection, or with Do Not Track enabled. The tests require no Umami environment variables. |
| `src/lib/analytics.ts` | Enforces a second runtime gate for all custom product events. |

## Rollback

If the tracker needs to be disabled, remove both `VITE_UMAMI_SCRIPT_URL` and `VITE_UMAMI_WEBSITE_ID` from the **Production** environment, redeploy, and confirm the script is absent in a fresh browser session. The consent gate remains in place; there is no need to remove the cookie-preference UI.

## References

[1]: https://umami.is/docs/collect-data "Umami documentation: Collect data"
[2]: https://docs.umami.is/docs/tracker-configuration "Umami documentation: Tracker configuration"
[3]: https://docs.umami.is/docs/guides/track-single-page-apps "Umami documentation: Track a single-page application"

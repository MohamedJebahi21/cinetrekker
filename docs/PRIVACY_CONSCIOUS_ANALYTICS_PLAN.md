# Privacy-Conscious Product Analytics Plan

**Status:** Proposed only. No analytics provider, browser script, environment value, event, privacy-notice change, or consent setting has been implemented by this plan.

## 1. Decision context

CineTrekker needs lightweight product signals to understand whether people reach a meaningful first-use moment: creating an account, saving a first title, recording initial progress, and returning to use the tracker. The current shipped `index.html` does **not** contain an analytics script or analytics environment placeholder. The published privacy notice describes analytics as optional and dependent on provider and environment settings. Any deployment therefore requires an explicit product, privacy, and configuration approval.

The measurement principle is **aggregate product learning, not user surveillance**. Event design must not identify a person, reconstruct a viewing profile, transmit comment text, or expose a media-title identifier.

> **Guardrail:** Do not send a CineTrekker user ID, email address, display name, session token, IP address, exact title, TMDB ID, search query, comment, message, feedback text, free-form URL query parameter, or any persistent cross-day identifier as an analytics event property.

## 2. Provider options

| Option | Privacy and product fit | Operational trade-off | Recommendation |
|---|---|---|---|
| **Self-hosted Umami** | Umami documents cookie-free tracking, SPA navigation tracking, anonymized data, and custom events. [1] [2] | Requires a secure hosting, database, upgrade, backup, and retention owner. | Strong privacy-control option only if the team is prepared to operate it. |
| **Umami Cloud** | Retains the intended Umami-compatible model with a lighter setup burden; supports named events and event properties. [1] [2] | Introduces an external analytics processor, account, retention choice, and privacy review. | **Preferred low-operations candidate** if an approved provider review is completed. |
| **Plausible Cloud** | Plausible documents cookie-free aggregate analytics, no persistent identifier, EU hosting, and custom events. [3] [4] | Separate paid vendor account and event configuration; custom events count toward billable pageviews. [4] | Strong alternative if EU processing and its pricing model are preferred. |
| **No product analytics yet** | Preserves the current release behaviour and data flow. | Leaves activation decisions dependent on qualitative feedback and operational logs. | Safe default until approval is given. |

Provider claims do not replace a jurisdiction-specific legal review. Even a cookie-free tool should be checked against the product’s actual deployment region, configuration, retention, privacy notice, and any applicable consent requirements before activation.

## 3. Minimum measurement set

The following event names are deliberately compact and use only fixed, non-identifying values. They are intended for aggregate funnel counts, not user-level profiling.

| Product question | Proposed event | Allowed properties | Explicitly excluded | Success interpretation |
|---|---|---|---|---|
| Do visitors show onboarding intent? | `signup_intent` | `entry_surface`: `home`, `login`, or `settings` | Referral text, email, campaign query string, account ID | Count of people who start the account path. |
| Are accounts completed? | `account_created` | `auth_method`: `email` or `google` | Provider subject, email, username, error detail | Count only after the application has confirmed account creation. |
| Do new members save a title? | `first_title_saved` | `media_kind`: `movie` or `tv` | Title, title ID, poster URL, watchlist content | First successful save in a client’s current account state. |
| Do members record meaningful progress? | `first_progress_recorded` | `media_kind`: `movie` or `tv`; `progress_mode`: `title` or `episode` | Season, episode number, title, exact watch duration | First successful progress write in a client’s current account state. |
| Is the tracker used after the first session? | **Aggregate return engagement**, not an account-linked event | Daily pageviews, route-level counts, and the aggregate event mix above | Any user, device, or stable returning identifier | Trend daily/weekly traffic and repeat interactions without attempting to link a person across days. |

The words **first** in the two lifecycle events describe a local application state, not a provider-side identity. If the browser state is cleared or a person uses another device, a second event may occur. That limitation is intentional: it avoids account-level tracking while still allowing directional product learning.

## 4. Event contract and data minimisation

A small `trackProductEvent()` wrapper should be introduced only after provider approval. The wrapper must accept a fixed union of approved event names and a schema for each event’s enumerated properties. It must reject unknown property names and avoid passing through arbitrary objects. In particular, it must never proxy backend response bodies, route search parameters, media metadata, or user-generated text.

Named events are appropriate because both Umami and Plausible support custom events; however, both providers also permit event properties. [2] [4] That flexibility is a privacy risk unless CineTrekker constrains the event schema in application code. For Plausible specifically, its documentation notes that a tagged link can automatically attach the full target URL, so sensitive URLs or query parameters must never be used for tracked links. [4]

| Boundary | Required implementation rule |
|---|---|
| Event names | Static allowlist only: `signup_intent`, `account_created`, `first_title_saved`, `first_progress_recorded`. |
| Properties | Enumerations shown in the minimum measurement set; no free-form strings. |
| Timing | Emit only after a successful client-visible outcome, except `signup_intent`, which emits on an explicit CTA action. |
| Failure telemetry | Keep authentication, API, and security failures in operational logs; do not transmit their messages or stack traces to product analytics. |
| Consent and disablement | The tracking loader and event wrapper must be disabled unless the chosen privacy/consent policy explicitly permits them. |
| Retention | Document a short, fixed retention period chosen during provider approval; do not retain raw exports indefinitely. |
| Access | Restrict dashboard access to the product owner and maintain an access-review record. |

## 5. Funnel reading without individual tracking

The launch dashboard should contain only aggregate counts and rates. The initial view should compare `signup_intent`, `account_created`, `first_title_saved`, and `first_progress_recorded` over a weekly period. A decrease between stages indicates where qualitative usability research, accessibility testing, or support feedback should focus; it does not establish why any individual did not proceed.

| Metric | Calculation | Use | Do not use for |
|---|---|---|---|
| Account-start completion | `account_created / signup_intent` | Detect onboarding friction. | Identifying unsuccessful applicants. |
| First-save activation | `first_title_saved / account_created` | Evaluate whether discovery and library controls reach an early “aha” moment. | Ranking or targeting people by taste. |
| First-progress activation | `first_progress_recorded / account_created` | Evaluate whether progress tracking is comprehensible and useful. | Reconstructing what a person watched. |
| Aggregate return engagement | Weekly trend in traffic and non-identifying activation events. | Assess whether the product has continuing utility. | Calculating user-level retention or cross-device identity. |

## 6. Approval-gated implementation sequence

1. Select **one** provider and record its hosting region, data-processing terms, retention setting, access owners, and total monthly cost.
2. Review the proposed event contract against the live privacy notice and cookie policy. Update both, including the provider, purpose, data categories, retention, and applicable control or consent mechanism.
3. Obtain explicit approval to add the provider script and configure environment values. Do not place a provider token or secret in source control.
4. Implement the typed allowlist wrapper and the four approved events. Keep the script absent when configuration is empty.
5. Test locally and in a preview deployment using developer tools. Confirm that successful events carry only the approved enumerations and that sign-out, error, title-detail, comment, and search flows transmit no disallowed values.
6. Activate the production provider only after privacy copy, configuration, and validation are approved. Review the aggregate dashboard after seven days, then remove any event that does not support a concrete product decision.

## 7. Decision required

No implementation should start until the owner approves a provider and confirms the intended privacy posture. The recommended decision for the current launch stage is either **continue with no product analytics** or approve a narrowly scoped **Umami Cloud** review using exactly the four events and no account-linked identifiers. If EU-hosted analytics and Plausible’s operating model are a better fit, Plausible can implement the same contract without expanding the data scope.

## References

[1]: https://umami.is/docs/faq "Umami FAQ: cookies, SPA tracking, and collected data"
[2]: https://umami.is/docs/track-events "Umami: Track Events"
[3]: https://plausible.io/data-policy "Plausible Data Policy"
[4]: https://plausible.io/docs/custom-event-goals "Plausible: Custom Event Tracking"

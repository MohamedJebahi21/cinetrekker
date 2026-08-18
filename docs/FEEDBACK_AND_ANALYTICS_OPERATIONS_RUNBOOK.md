# CineTrekker Feedback and Analytics Operations Runbook

**Audience:** CineTrekker deployment administrator  
**Applies to:** Vercel production environment for `https://cinetrekker.vercel.app`  
**Security rule:** Never paste secret values into Git, issue descriptions, browser URLs, client-side `VITE_*` variables, or support messages.

## 1. Purpose

This runbook completes the only two remaining provider-dependent production capabilities: **in-app feedback delivery** and **consent-aware Umami analytics**. The application already behaves safely if either capability is unconfigured: feedback submission is disabled with a direct email fallback, while analytics sends no custom event unless the approved tracker is present.

## 2. Production Variables

| Capability | Production variable | Visibility | Required value |
|---|---|---|---|
| Turnstile client integration | `VITE_TURNSTILE_SITE_KEY` | Public browser configuration | Cloudflare Turnstile site key |
| Turnstile server verification | `TURNSTILE_SECRET_KEY` | Server secret | Matching Cloudflare Turnstile secret key |
| reCAPTCHA client integration | `VITE_RECAPTCHA_SITE_KEY` | Public browser configuration | Google reCAPTCHA site key |
| reCAPTCHA server verification | `RECAPTCHA_SECRET_KEY` | Server secret | Matching Google reCAPTCHA secret key |
| Feedback delivery | `RESEND_API_KEY` | Server secret | Resend API key permitted to send from the selected sender identity |
| Feedback recipient | `FEEDBACK_TO_EMAIL` | Server-side configuration | Verified support recipient, currently `cinetrekker.contact@gmail.com` |
| Umami tracker script | `VITE_UMAMI_SCRIPT_URL` | Public browser configuration | HTTPS URL of the approved Umami tracker script |
| Umami website identifier | `VITE_UMAMI_WEBSITE_ID` | Public browser configuration | Website ID from the approved Umami site configuration |

> Configure **one** CAPTCHA provider pair only. Use either the two Turnstile variables or the two reCAPTCHA variables. Do not enable both providers simultaneously unless the server implementation is intentionally extended and tested for that behavior.

## 3. Feedback Configuration Procedure

1. In Vercel, open the CineTrekker project and create the selected CAPTCHA provider’s site configuration for `cinetrekker.vercel.app`.
2. Add the matching public site key and private server key to the **Production** environment. The public key must use the `VITE_` name shown above; the secret key must not.
3. Add `RESEND_API_KEY` and `FEEDBACK_TO_EMAIL` to the **Production** environment. Verify the Resend sender domain before testing delivery.
4. Redeploy production so Vite compiles the public site key into the client bundle.
5. Confirm the availability endpoint reports service readiness: `GET https://cinetrekker.vercel.app/api/feedback` must return `available: true` and identify the selected CAPTCHA provider.
6. Submit exactly one controlled feedback message using a non-sensitive test sentence. Verify the visible success state, a single recipient delivery, and the expected browser/network outcome.
7. In a clean browser session, confirm that an invalid or absent CAPTCHA response is rejected and that repeated submissions receive the configured rate-limit behavior.
8. Record the date, provider selection, and verification outcome in the release log. Do not record secrets, CAPTCHA tokens, feedback contents, or mail headers.

The application’s direct email fallback must remain available whenever the endpoint returns `available: false`.

## 4. Umami Configuration Procedure

1. Create or select the approved Umami website entry for `cinetrekker.vercel.app`, and record its exact HTTPS origin.
2. Add that exact origin to `script-src`, `script-src-elem`, and `connect-src` in `vercel.json`, then commit it. Do not use a broad `https:` CSP allowance: Umami loads from the tracker-script origin and sends data to that origin by default.[1]
3. Copy the tracker script URL and website ID into `VITE_UMAMI_SCRIPT_URL` and `VITE_UMAMI_WEBSITE_ID` in Vercel Production. Both values are public tracker configuration, not server secrets.
4. Redeploy production.
5. Open CineTrekker in a new browser profile, decline non-essential cookies, and verify no Umami tracker script is appended to the document.
6. Open CineTrekker in another new browser profile, accept cookies, and verify one HTTPS tracker script is appended.
7. Navigate between home and search. Verify normal page views appear in Umami and that URL search text is absent from the recorded page path.
8. Verify the `web_vital` events contain only `metric`, `route`, `rating`, and `value_bucket`. They must not contain user identifiers, title text, TMDB IDs, feedback content, raw metric values, or search queries.
9. Enable browser Do Not Track in a separate test profile. Confirm the tracker does not load and no custom `web_vital` event is emitted.

Umami’s tracker supports SPA route detection, JavaScript custom events through `window.umami.track`, URL-search exclusion, and an explicit Do Not Track option.[1][2][3]

## 5. Verification Matrix

| Scenario | Expected result | Failure response |
|---|---|---|
| Feedback providers absent | Feedback form fields and submit action are disabled; direct support email remains available | Do not claim feedback is operational; retain fallback |
| CAPTCHA and mail configured | Endpoint reports available; one controlled submission succeeds | Disable/revert feedback availability if delivery cannot be verified |
| Feedback CAPTCHA invalid | Submission is rejected without delivery | Confirm the correct site/secret key pair and allowed domain |
| Analytics consent rejected | No Umami script and no custom events | Treat any tracking as a privacy defect and disable the tracker configuration |
| Analytics consent accepted | One tracker script loads over HTTPS; page views and coarse custom events are visible | Verify configuration values and browser-console errors |
| Do Not Track enabled | No tracker script and no `web_vital` events | Treat any collection as a privacy defect |

## 6. Rollback

To disable feedback delivery safely, remove the CAPTCHA or Resend production configuration and redeploy. The application automatically restores the disabled form and direct support-email fallback.

To disable analytics safely, remove either Umami public environment variable and redeploy. The application will not append the tracker script or send custom Web Vitals events.

## References

[1]: https://docs.umami.is/docs/tracker-configuration "Umami tracker configuration"
[2]: https://docs.umami.is/docs/track-events "Umami custom-event tracking"
[3]: https://docs.umami.is/docs/guides/track-single-page-apps "Umami single-page application tracking"

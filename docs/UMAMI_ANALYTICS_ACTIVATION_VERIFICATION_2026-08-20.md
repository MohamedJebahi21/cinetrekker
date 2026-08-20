# Umami Analytics Activation Verification

**Date:** 20 August 2026  
**Environment:** CineTrekker production at `https://cinetrekker.vercel.app`  
**Analytics workspace:** User-owned Umami Cloud Hobby plan, European Union data region

## Configuration completed

CineTrekker is now registered as `cinetrekker.vercel.app` in the user-owned Umami Cloud workspace. The public tracker script URL and website identifier are configured in Vercel for Production and Preview builds. The Content Security Policy permits only `https://cloud.umami.is` for the tracker script and the tracker connection; no broad new source wildcard was added.

> The tracker remains privacy-gated. It is inserted only after explicit cookie consent, and it is never inserted when the visitor has enabled Do Not Track.

## Production verification

The live site was tested in four isolated, unauthenticated browser contexts. Each scenario returned HTTP 200 from the CineTrekker homepage.

| Scenario | Stored consent | Do Not Track | Umami script in DOM | Umami network requests | Result |
|---|---|---:|---:|---:|---|
| No decision | None | No | 0 | 0 | **Pass** |
| Rejected | `rejected` | No | 0 | 0 | **Pass** |
| Do Not Track | `accepted` | Yes | 0 | 0 | **Pass** |
| Accepted | `accepted` | No | 1 | 1 | **Pass** |

The accepted-consent scenario loaded `https://cloud.umami.is/script.js` with the CineTrekker website ID. The three privacy-preserving scenarios installed no tracker script and made no request to Umami.

## Ongoing guardrails

The repository continues to enforce the consent contract in static and browser regression coverage. `scripts/verify-live-umami-consent-gate.mjs` records the same four production scenarios for a deliberate future re-check; it is intentionally not part of continuous integration because its accepted-consent scenario contacts production analytics.

## Remaining field-monitoring requirement

Analytics configuration is complete. **Field Core Web Vitals remains pending real visitor traffic.** Review mobile and desktop LCP and CLS after a representative traffic window in Search Console, CrUX, or the approved real-user monitoring source.

# Person Route Loading Diagnosis

## Production reproduction — 2026-08-14

The exact direct URL `https://cinetrekker.vercel.app/person/jenna-ortega-974169` was opened in a fresh browser route check. The static application bootstrap completed enough to set the page title to `Jenna Ortega | CineTrekker`, but the visible page remained on the **person-detail route skeleton** after a second settled-page inspection. The header, navigation, and route content did not become interactive.

This is separate from the deployed static `#app-shell` startup repair. The visual pattern is the person page’s internal loading UI, indicating that its data query remains pending or does not transition to an error state.

The repeated `Could not establish connection. Receiving end does not exist.` messages shown in the user screenshot are extension-originated browser messaging errors. They do not identify the CineTrekker request that is holding the route skeleton.

## Authorized production repair

The user authorized deployment of the direct-content-route cache and startup repair. Commit `d5a0766` (`Fix: prevent stale bundles on direct content routes`) was pushed to `main`; Vercel recognized it and started a Production build. The dashboard still showed the prior `147be61` deployment as Ready during the initial build polling window.

## Post-deployment check

Vercel marked commit `d5a0766` Ready in Production. A subsequent direct navigation to the Jenna Ortega URL still showed the raw static shell after the page settled. The next diagnostic step is to inspect the actual edge-generated HTML and boot-script response, because the expected recovery script did not visibly replace the shell.

## Final production verification

Commit `8541fcf` (`Fix: use SPA shell for direct content pages`) reached Vercel Production with Ready status. The direct Jenna Ortega URL now hydrates successfully: the browser exposes the complete profile, filmography, and interactive controls. A fresh Chromium diagnostic confirmed `data-cinetrekker-mounted="true"`, no static `#app-shell`, no recovery panel, and rendered Jenna Ortega content.

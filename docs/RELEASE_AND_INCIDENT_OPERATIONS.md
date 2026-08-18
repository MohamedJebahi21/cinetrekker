# CineTrekker Release and Incident Operations

**Owner:** CineTrekker product and deployment administrator  
**Support route:** `cinetrekker.contact@gmail.com`  
**Production URL:** `https://cinetrekker.vercel.app`

## Release Cadence

| Cadence | Required activity | Evidence to retain |
|---|---|---|
| Every code release | Run type check, production build, CI validation, smoke test, mobile regression, discovery layout gate, and visual-regression suite before merge. | Commit SHA, test output, and production smoke result |
| Every week | Review production errors, feedback availability, search quality, browser-push delivery status, and Web Vitals dashboard when Umami is configured. | Short release-health note with open findings and owner |
| Every month | Run `npm audit --omit=dev`, review dependency upgrade availability, verify feedback recipient ownership, and test the support email. | Dependency report and support-path confirmation |
| Before a broad launch or major social feature release | Use two disposable accounts to verify sign-in, sign-out, profile visibility, follow/unfollow restoration, comment access boundaries, and protected-route behavior. | Dated two-account test result with no customer account data |

## Release Checklist

1. Confirm the branch is clean and the intended files are the only release changes.
2. Run `npm run test:ci`.
3. Run `npm run build`.
4. Run `npm run test:smoke`.
5. Run `npm run test:e2e:mobile:search-regressions`.
6. Run `npx playwright test tests/discovery-layout-stability.spec.ts tests/visual-regression.spec.ts --project=chromium`.
7. Run `npm audit --omit=dev` and resolve or formally classify any runtime vulnerability.
8. Push the commit, wait for the production deployment, and check home, search, feedback, and one protected route in production.
9. If feedback is configured, confirm `GET /api/feedback` reports `available: true`; otherwise confirm the disabled form and email fallback are visible.
10. Record the commit SHA and any exception in the release log.

## Incident Severity and Response

| Severity | Example | First response | Recovery target |
|---|---|---|---|
| P0 — Critical | Authentication unavailable, data isolation failure, user actions corrupting progress, security exposure | Stop deployment rollout, preserve evidence, roll back to last known-good commit, disable affected integration if needed | Same day |
| P1 — High | Search unavailable, feedback path incorrectly claims success, push alerts sent without opt-in, sustained client errors | Reproduce, create a remediation branch, retain safe fallback, deploy after focused verification | 24 hours |
| P2 — Normal | Visual regression, degraded loading state, non-blocking mobile usability issue | Add to launch checklist, fix in next planned release, protect with a regression test | Next release |

## Rollback Procedure

1. Identify the last known-good production commit from GitHub and Vercel deployment history.
2. Redeploy that commit through the approved production deployment process.
3. Verify home, search, authentication entry, feedback fallback, and a protected route after rollback.
4. If the incident concerns a provider, remove or disable only the affected production environment configuration after confirming the application returns to its safe fallback.
5. Document the incident: impact, timeline, root cause, corrective action, and regression test added.

## Provider-Specific Safe Fallbacks

| Provider | Safe fallback |
|---|---|
| Feedback CAPTCHA or mail delivery | Feedback controls disable and direct users to `cinetrekker.contact@gmail.com` |
| Umami analytics | No tracker script or custom Web Vitals event is loaded without consent and valid public configuration |
| Browser push | No system permission prompt occurs except from the explicit Settings action; in-app notifications remain available |
| TMDB service | Discovery UI retains page shell and shows a recoverable unavailable state instead of unsafe or misleading data |

## Escalation Information to Capture

Collect only the minimum useful evidence: production URL, UTC time window, anonymized browser/platform, route, reproduction steps, visible error message, request reference if displayed, and release commit. Never attach access tokens, feedback text, email addresses, user IDs, screenshots containing private profile data, or browser-storage values.

# CineTrekker Desktop Audit Remediation Checklist

**Source evidence:** production audit at `1440×900` on 2026-08-21.
**Scope:** Implement every confirmed, actionable desktop finding while preserving consent choices, privacy gating, and existing mobile behavior.

| ID | Priority | Confirmed finding | Remediation | Status |
| --- | --- | --- | --- | --- |
| DESK-01 | P1 | The cookie-consent panel obscures the Feedback primary action and first Search results on a 1440px desktop viewport. | Retain consent controls and mobile-safe placement; render a compact bottom-end consent surface from the large desktop breakpoint upward, with vertically structured content. | Complete — locally verified |
| DESK-02 | P2 | The guest auth screen contains a 16px password-requirements trigger, and its remember-me control lacks a comfortably sized row-level hit area. | Increase the password-requirements trigger to a 32px desktop control; provide a 44px minimum auth checkbox row with an appropriately sized checkbox. | Complete — locally verified |
| DESK-03 | Regression | Future changes could restore the desktop consent obstruction or shrink auth controls. | Add source-level regression coverage for desktop consent positioning and auth hit-area contracts. | Complete — locally verified |

## Validation completed before release

The local release gate passed on 2026-08-21: `npm run test:unit`, `npm run test:ci`, and `npm run build`. A focused 1440px local production-build check additionally verified that the consent panel is bottom-end positioned and does not overlap Feedback submission, while the password-rules trigger is at least 32px, the remember-me row is at least 44px high, and its checkbox is at least 20px.

## Reviewed, no code change required

The full-page headless capture showed placeholder-heavy offscreen media rails after seven seconds. The card implementation deliberately uses offscreen rendering containment and lazy images, so a full-page screenshot does not reliably represent what a desktop user sees after scrolling. This is not treated as a confirmed production defect. The production audit found no route crashes, JavaScript console errors, horizontal overflow, unnamed interactive controls (outside the scoped auth control), or desktop route accessibility-landmark failures.

## Explicit non-changes

Cloudflare Turnstile feedback completion is not exercised in the automated environment. The existing real-browser CAPTCHA verification remains the required release check; no bypass is introduced.

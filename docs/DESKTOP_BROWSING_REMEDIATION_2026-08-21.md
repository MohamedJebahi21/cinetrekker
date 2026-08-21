# Desktop Browsing Remediation — 2026-08-21

## Finding

The authenticated `/year-in-review` route displays a clear **No Activity Yet** state for users without watches in the selected year. However, it contains no in-context action. Its only instruction is to start watching, which leaves the user at a retention dead end.

## Remediation

Add one keyboard-accessible, button-styled link inside the existing empty-state card:

> **Discover titles** → `/discover`

The action sends the user to the existing discovery route and does not modify watch history, ratings, lists, notification state, social graph, preferences, or browser-alert settings.

## Acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Empty-state route | A visible discovery action is present alongside the explanatory copy. |
| Semantics | The action is a single interactive control, implemented with `Button asChild` and one internal `Link`. |
| Data safety | Rendering or following the link does not directly mutate watch history or any user record. |
| Visual system | The CTA uses existing cinematic primary-button styling and preserves mobile compatibility. |
| Regression coverage | A focused source-level unit test asserts the empty-state copy, one `Button asChild`, `/discover` destination, and translated action label. |
| Release validation | The unit suite, CI-quality gate, production build, and passive live verification pass. |

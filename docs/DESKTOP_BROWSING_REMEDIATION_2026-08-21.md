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

## Notifications route — null legacy target crash

### Finding and root cause

The authenticated `/notifications` route consistently reached the global error boundary after initial loading. Safe in-page diagnostics captured the render exception:

> `TypeError: Cannot read properties of null (reading 'split')`

`parseNotificationTarget()` assumes every notification has a string `movie_id` and immediately calls `split`. A legacy or non-media notification with `movie_id: null` therefore crashes the entire inbox while `NotificationMediaThumb` is rendered.

### Remediation

Make the shared notification-target parser accept `string | null | undefined`. It should return `null` for absent or malformed identifiers instead of throwing. The existing title card then uses its intentional neutral media placeholder and does not navigate when no valid target exists.

### Acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Null target safety | `parseNotificationTarget(null)` returns `null`; it never calls `split` on a non-string value. |
| Malformed target safety | Existing invalid target values still return `null`. |
| Inbox resilience | One legacy notification without a title target cannot crash the Notifications route. |
| Data safety | No notification is marked read, deleted, created, or updated by parsing/rendering. |
| Regression coverage | A unit test covers valid, malformed, and null/undefined notification target values. |
| Release validation | The full unit suite, CI-quality gate, production build, and passive live inbox verification pass. |

## Homepage MediaCard accessible-name mismatch

### Production finding

A read-only desktop Lighthouse audit of the live homepage reported **Accessibility 100** overall but flagged `label-content-name-mismatch` for reusable title cards. Each detail link has an accessible name such as `"Rosebush Pruning - open details"`, while its visible text also contains metadata, rating, and the **Watchlist** and **Watched** action labels. The accessible name does not include that visible text, creating a control-name mismatch for voice-control and assistive-technology users.

### Remediation

Remove the unnecessary `aria-label` from the card-level detail `Link`. The visible card content, including its title and displayed metadata, will supply the accessible name naturally. Individual Watchlist and Watched controls retain their existing explicit labels.

### Acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Accessible-name source | The MediaCard detail link no longer overrides its visible content with a mismatched `aria-label`. |
| Action semantics | Individual inline Watchlist and Watched controls retain explicit title-specific accessible labels. |
| Visual behavior | Card navigation destination, card appearance, and quick-action behavior remain unchanged. |
| Regression coverage | A focused test asserts the card link has no `aria-label` override and the quick actions remain explicitly labelled. |
| Validation | Unit suite, release-quality gate, production build, and live Lighthouse retest pass. |

## Homepage MediaCard motion-cost reduction

### Production performance evidence

The post-release production desktop Lighthouse trace measured **2,250 ms Total Blocking Time**. Its largest long tasks include initial React work and `vendor-motion`, while the homepage renders multiple reusable MediaCards immediately. Each MediaCard eagerly creates two MotionValues, two transforms, and two springs—even before a visitor hovers a card—and wraps the card in a `motion.div` for an optional pointer-driven 3D tilt effect.

### Remediation

Replace the MediaCard `motion.div` wrapper and eager pointer-tilt MotionValues with a semantic static `div`. Existing CSS hover, active, focus, poster-scale, and quick-action transitions remain in place, so users retain visual feedback without per-card Framer Motion setup on first render.

### Acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Initial card work | MediaCard no longer imports or creates Framer Motion values, transforms, or springs. |
| Interaction behavior | Detail navigation, watchlist/watched actions, TV status flow, selection, and visual CSS hover/focus states are unchanged. |
| Data safety | Rendering cards performs no mutation; action handlers are unchanged. |
| Regression coverage | A focused test asserts there is no Framer Motion import or eager pointer-tilt implementation in MediaCard and verifies existing action handlers remain. |
| Release validation | Unit suite, full quality gate, production build, and production Lighthouse retest pass. |

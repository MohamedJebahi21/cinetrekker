# CineTrekker Visual-System Audit Notes

## Production home baseline

The live signed-in home page retains a strong cinematic dark foundation and a recognizable red CineTrekker accent. Its current visual language is weakened by repeated high-opacity radial red effects, multiple translucent/glass surfaces, near-black layers that lack a clear elevation ladder, and several glow-heavy interactive states. These choices make the interface feel assembled from individual effects rather than governed by a restrained product system.

The redesign direction is **editorial cinema at night**: a neutral graphite-to-ink background, a compact hierarchy of solid elevated surfaces, warm white typography, cool slate secondary text, and a single restrained vermilion accent reserved for key actions, active states, and meaningful status. The design will preserve the existing dark cinematic identity and red signature while removing excess glow, overused translucency, and high-motion flourish.

## Initial implementation priorities

1. Replace the dark theme’s near-black/purple surfaces with a cohesive ink, graphite, and charcoal elevation scale.
2. Reduce global radial overlays, backdrop blur, and glow-heavy shadows; make panels more opaque and borders quieter.
3. Refine the red accent to a deeper, more editorial vermilion used selectively for primary actions and active navigation.
4. Tighten button, panel, and hover treatments so interactions are crisp rather than animated or luminous.
5. Preserve accessibility: maintain warm-white foreground text, muted but legible secondary copy, and a high-visibility focus treatment.

## Scope

The redesign targets semantic color tokens and shared UI primitives first, allowing the change to improve the home, search, details, settings, and profile surfaces consistently without altering the underlying product features.

## Local implementation review — 2026-08-17

A local desktop review at `http://localhost:8081/` confirmed that the app loads past its initial startup shell and that the default dark theme now reads as an ink canvas with opaque graphite surfaces. The red accent is concentrated in the primary action, active discovery filter, restrained hero edge treatment, and small status marks rather than dominating the background. The top navigation, hero, discovery controls, and empty-state panel have clearer separation and remain legible at desktop width.

The local unauthenticated discovery feed entered its existing request-error state. This was a data-loading condition in the local environment, not a visual regression, and is excluded from visual acceptance while browser smoke testing remains in scope.

| Area | Visual result | Follow-up |
|---|---|---|
| Dark canvas and surfaces | Ink canvas and opaque graphite panels establish a clearer product hierarchy. | Verify at narrow mobile width. |
| Accent usage | Vermilion is visible but no longer dominates large background fields. | Verify focus and hover states. |
| Navigation | Header controls remain readable without glassy transparency. | Check search, settings, and profile routes. |
| Data-dependent feed | The local anonymous discovery request entered its existing error state. | Retain smoke-test coverage; do not treat as a design regression. |

## Route review — 2026-08-17

The local search route confirms that the refined system holds on a filter-heavy discovery surface: the query field, filter bar, skeleton cards, and header use distinct but quiet ink/graphite layers. The original-title guidance remains readable as secondary information and the primary border treatment is restrained.

The settings route correctly redirects an anonymous session to the existing sign-in gate. The resulting sign-in screen confirms the same palette remains coherent for a dense account form: the split card uses opaque surfaces, warm text, and a single focused vermilion action. Authenticated settings and profile data will be covered by automated browser regression tests because this local review has no signed-in session.

| Route | Result | Scope decision |
|---|---|---|
| `/search` | Pass — search field, filters, loading cards, and content hierarchy are visually consistent. | Retain. |
| `/settings` | Expected redirect to `/login` for an anonymous user. | No authentication behavior changed. |
| `/login` | Pass — the primary form remains readable, calm, and clearly action-led. | Retain. |

## Validation plan

Review the refined theme locally at desktop and mobile breakpoints across public routes. Run type checking, a production build, and existing browser regression tests before committing and deploying the redesign.

## Production deployment check — 2026-08-17

Commit `8d2b50d` was pushed to `main`. The first production-token inspection immediately after the push still returned the preceding color system (`--background: 228 18% 7%`, `--card: 228 16% 11%`, and `--primary: 353 70% 56%`). After the deployment window, a production reload rendered the expected signed-in home experience, including Up Next and Continue Watching, without a client-visible regression.

Production token inspection then confirmed that the editorial noir release is live: `--background: 222 15% 7%`, `--card: 222 12% 11%`, `--secondary: 222 10% 14%`, and `--primary: 356 68% 48%`. These values match the committed release palette.

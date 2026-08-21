# CineTrekker Product Refinement Standard

**Objective:** Make CineTrekker feel cleaner, more professional, and more useful while preserving its dark cinematic identity, red accent, user data, and established tracking behavior.

## Product rules

CineTrekker pages must answer three questions in order: **Where am I? What is the most useful next action? What context helps me decide?** Decorative treatment must support that sequence, never compete with it. The red accent is reserved for the active destination, primary action, progress, urgency, and selected state; it is not a default border or background for every panel.

| Layer | Standard | Purpose |
| --- | --- | --- |
| Page frame | One compact context label, one clear title, optional plain-language supporting sentence, and at most one primary action. | Establish orientation without a large dashboard header on every route. |
| Utility row | Search, filters, tabs, counts, and sort controls use a calm shared toolbar directly below the page frame. | Make task controls easy to find without competing with the title. |
| Content sections | One sentence or less of explanatory copy; consistent section gap; a quiet text action only when a deeper route exists. | Let content, not containers, organize the page. |
| Cards | One surface, one information hierarchy, one primary action. Nested boxes, repeated labels, and duplicate metrics are removed. | Improve scan speed and reduce visual noise. |
| Empty states | One clear reason, one outcome-oriented action, and deferred secondary guidance. | Turn low-data states into useful next steps rather than blank dashboards. |
| Progressive disclosure | Zero-value analytics, advanced filters, and optional context stay secondary until the user needs them. | Keep first-use surfaces practical and approachable. |

## Shared visual system

| Token or pattern | Standard | Application |
| --- | --- | --- |
| Shell | Existing `ct-page-shell` and `page-container` remain the common frame. | All routed pages retain responsive padding and cinematic depth. |
| Primary surface | `ct-panel` / `ct-panel-strong` is used for task entry and meaningful summary; ordinary sections should not add another full panel by default. | Search, personal summary, and configurable views. |
| Toolbar | `ct-toolbar` is the shared utility row for filters, count, view choice, and sort. | Discovery, library, calendar, and insight surfaces. |
| Kicker | `ct-kicker` is optional and must identify real context, not decorate every heading. | Editorial pages, personal queues, and focused workspaces. |
| Action hierarchy | Filled button = one primary commitment; outline button = secondary task; quiet link = deeper navigation. | Avoids two visually equivalent actions in every card. |
| Motion | CSS transform/opacity only, under 300ms, with reduced-motion support. | Hover feedback and quiet state transitions. |

## Workflow application order

| Release group | Main focus | Expected benefit |
| --- | --- | --- |
| Shared foundation | Navigation density, page headers, toolbars, shared card/action patterns. | Consistent orientation and lower visual noise across all routes. |
| Discovery and tracking | Discover, Search, Trending, details, Watchlist, Watched, Calendar, Continue Watching. | Faster title decisions and progress management. |
| Personal and social | Profile, stats, achievements, quests, people, following, recommendations, notifications. | Focused motivation and progressively revealed insight. |
| Account and policy | Settings, accessibility, feedback, authentication, About, privacy, terms, cookies. | Clearer settings and trustworthy, readable supporting pages. |

## Non-negotiable safeguards

No refinement may silently change watched status, episode history, list membership, ratings, privacy, follows, preferences, notification state, or consent. Browser alerts remain opt-in and must never occur on page load. The three existing themes—Light, Dark, and OLED—must preserve semantic contrast and intentional surfaces. Every interactive control remains keyboard reachable and descriptive.

# Discover Workflow Refinement

**Scope:** The Discover page’s hierarchy between the spotlight, category navigation, mood discovery, and first media rail.

## Verified issue

The page’s cinematic spotlight was effective, but it was immediately followed by two high-density control systems: eight equal-weight category cards and ten visible mood chips. These controls were useful, yet their simultaneous prominence delayed the first media rail and made the route feel busier than the discovery task requires.

## Refinement

The spotlight, all eight category destinations, all ten mood options, the explicit mood-results route, and every media rail are retained. Category navigation is consolidated into one compact, horizontally resilient utility row. Mood discovery becomes a clearly labelled optional control that exposes the existing picker only when the visitor chooses it; an active mood remains visible with its clear action and **See All Results** route.

| Criterion | Expected outcome |
| --- | --- |
| Discovery paths | Spotlight detail and explore actions, all category links, all mood options, and rail links remain available. |
| Visual hierarchy | The hero remains the editorial focus; category browsing is supportive; mood choice is progressively disclosed; the first rail follows sooner in the idle state. |
| Accessibility | The mood toggle publishes `aria-expanded` and `aria-controls`; the revealed picker has a named region; links retain visible focus treatment. |
| Responsive behavior | Category links scroll horizontally rather than forcing cramped card columns; mood targets remain at least 44 pixels high. |
| Data safety | No title, list, watched-status, rating, social, notification, language, theme, or other preference behavior changes. |

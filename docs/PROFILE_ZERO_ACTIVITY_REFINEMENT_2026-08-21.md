# Profile Zero-Activity Refinement

**Scope:** The private Profile overview when an account has no watched entries, watchlist entries, or pinned favorites.

## Verified issue

The profile already provided a premium identity card and helpful task tabs, but a zero-activity account displayed several simultaneous placeholder systems: zero-value metrics, milestones, a preliminary taste archetype, four viewing-state counters, next-achievement progress, and a weekly recap. These elements were accurate, but they made the first-use profile feel like an inactive dashboard rather than a personal starting point.

## Refinement

The Profile now derives a local `isProfileInactive` condition from existing watched, watchlist, and pinned-favorite state. In that condition, the identity hero retains account context and rank progress but replaces zero-value metric and milestone clusters with a concise first-title cue. The Overview replaces taste, tracking, achievement, and recap blocks with one discovery-led action. Once activity or a pinned favorite exists, the complete existing analytics, milestones, viewing-state links, and weekly recap remain available.

| Criterion | Expected outcome |
| --- | --- |
| Inactive profile | The Overview prioritizes one discovery action and does not display zero-value analytic clusters. |
| Active profile | Existing persona, viewing state, achievement progress, recap, tabs, favorites, and profile editing remain available. |
| Identity hero | Name, photo workflow, bio, rank progress, and public-profile link remain available in both states. |
| Data safety | The refinement is derived from existing data only; it does not save, edit, upload, change visibility, alter favorites, or mutate watch data. |
| Accessibility | Existing semantic links and buttons remain; the primary inactive-state action is a normal navigation link. |

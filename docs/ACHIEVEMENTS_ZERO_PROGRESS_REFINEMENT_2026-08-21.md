# Achievements Zero-Progress Refinement

**Scope:** The Achievements route when an account has no watch history and no unlocked achievements.

## Verified issue

The full milestones system is a useful long-term retention mechanic. At zero progress, showing all 21 locked cards alongside category, search, and status controls made the first-use page feel dense before the user had a meaningful way to begin.

## Refinement

The page now derives an `isStarterState` only after the user-list state resolves. In that state it retains the premium header and reward context, presents a concise explanatory panel, highlights three first milestones—first movie, first rating, and five genres—and offers a primary **Discover titles** action plus an explicit **View full roadmap** option. Choosing the roadmap restores the existing filter bar and all milestones. As soon as the user has history or an unlocked achievement, the existing full workspace appears unchanged.

| Criterion | Expected outcome |
| --- | --- |
| Zero progress | Three meaningful starter milestones replace a 21-card locked grid and inactive filters. |
| Full roadmap | All existing cards, search, category controls, and status filtering remain available on request. |
| Returning user | Any watched title or unlocked reward shows the unchanged full milestone workspace. |
| Data safety | The refinement changes only layout state; no achievement, watch history, rating, social state, or preference is mutated. |
| Retention | The next action is clear while the long-term reward path remains visible and accessible. |

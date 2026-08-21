# Quests Zero-Progress Refinement

**Scope:** The full Monthly Quests route for an account with no watched titles, no watchlist items, and no completed quests.

## Verified issue

The quest system supports repeat engagement, but a new account immediately saw eight locked mission cards and eight repeated activity links. This reduced the clarity of the first mission and weakened the board’s role as a motivating monthly path.

## Refinement

`CineQuestHub` now supports an opt-in starter experience used only on the full Quests route. Once user-list loading resolves, an entirely inactive account sees three starter missions, one **Discover titles** action, and an explicit **View all quests** control. The starter cards suppress their repeated activity links; the discovery action is the single primary path. Requesting the full board restores all missions and their normal actions. Homepage quest previews and active accounts retain their existing behavior.

| Criterion | Expected outcome |
| --- | --- |
| Zero-progress Quests page | Three starter missions and one discovery-led action replace eight competing activity links. |
| Full mission board | The complete existing board and each card’s normal activity link remain available on request. |
| Active account | Any watched item, watchlist item, or completed quest leaves the normal board unchanged. |
| Shared component safety | The starter behavior is opt-in, so homepage previews are unaffected. |
| Data safety | No quest is started, completed, claimed, logged, or otherwise mutated by the refinement. |

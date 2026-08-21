# Shared Navigation Refinement

**Scope:** Desktop UnifiedNav header.

## Verified issue

The current desktop header exposes independent icon controls for notifications, account, settings, language, theme, and the full navigation menu. Each control is useful, but presenting all six at equal visual weight competes with the global search field and weakens the page-context hierarchy on every route.

## Refinement

The header will retain notifications, account, global search, page context, and full navigation. Settings, language, and theme are consolidated into one labelled **Preferences** menu. The menu keeps a direct Settings route, grouped language choices, and grouped theme choices. This removes persistent icon clutter without removing any preference capability.

| Before | After |
| --- | --- |
| Separate settings, language, and theme header controls | One Preferences menu with the same explicit controls |
| Six equal-weight desktop utility controls | Four focused utilities: notification, account, preferences, menu |
| Preferences compete with global search | Search and current-page context have more visual space |

## Acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Navigation | Notifications, account, global search, page label, and menu remain available. |
| Preferences | Settings link, each supported language, and Dark/Light/OLED theme choices remain keyboard accessible. |
| Theme behavior | Existing theme state and theme tokens are unchanged. |
| Data safety | No watched, list, rating, follow, notification, or preference mutation occurs on page load. |
| Responsive design | The existing mobile header and mobile menu remain unchanged. |
| Validation | Focused regression coverage, unit suite, release gate, and live desktop verification pass. |

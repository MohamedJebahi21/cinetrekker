# CineTrekker Profile Improvement Checklist

This checklist converts the competitive audit into visible, testable changes. Work is ordered so that each local improvement can be reviewed on `localhost` before the next begins. Items that require a Supabase migration or another remote-service change are explicitly blocked pending separate authorization.

| Order | Work item | Evidence of completion | Scope | Status |
|---:|---|---|---|:---:|
| 1 | Replace the repeated rank card with real viewing state: current, completed, planned, and paused/dropped. | The Overview shows four live count cards linked to Watchlist or Watched. | Local UI; existing list data | Local complete |
| 2 | Turn Recently Watched into a clearer activity surface. | The heading becomes Recent Activity, with date, rating, media type, note preview, and monthly activity context. | Local UI; existing watched data | Local complete |
| 3 | Consolidate profile hero rewards. | Keep one level treatment and show an understandable next milestone instead of repeated rank UI. | Local UI; existing watched data | Local complete |
| 4 | Make favourites a concise public taste signal. | Added a compact Top Picks strip to Overview; extended movie/series shelves now live only in Favorites. | Local UI; existing pinned favourites | Local complete |
| 5 | Move Actor Matches out of the primary profile flow. | Actor Matches now appears only under Taste & Stats and never ahead of activity. | Local UI | Local complete |
| 6 | Reduce the overview analytics wall. | Rating, decade, and crew charts now live only in Taste & Stats. | Local UI | Local complete |
| 7 | Add human-readable takeaways to existing taste charts. | Decade, rating, and crew sections now state a verified data-backed insight or retain clear empty states. | Local UI; existing watched data | Local complete |
| 8 | Add visible earned milestones. | The hero now shows earned milestone chips and the overview shows a next-unlock callout; the generic achievement link is removed. | Local UI; existing watched data | Local complete |
| 9 | Add a compact seven-day / this-month profile recap. | A safe 7-day card now shows recent titles, active days, estimated watch time, and an empty state. | Local UI; existing watched data | Local complete |
| 10 | Add a profile Year in Review entry point. | The overview recap now links directly to the existing annual recap route. | Local UI; existing route | Local complete |
| 11 | Improve activity into a diary-style history. | The full history supports dated events, ratings, note/review preview, and media/episode context where the data exists. | Local UI; may expose existing fields only | Not started |
| 12 | Add a public-list showcase to the public profile. | Public profile presents user-curated lists rather than only favorite posters. | Requires data model and Supabase migration approval | Blocked |
| 13 | Add follower/following and interaction context to profile overview. | The page presents real follower counts, recent interactions, and connection links. | Requires social RPC migration approval | Blocked |
| 14 | Add an opt-in taste overlap comparison. | A user can compare rating/genre overlap with an allowed connection. | Requires privacy design and data model approval | Blocked |
| 15 | Add granular public/private/unlisted visibility controls. | Separate visibility for profile, activity, favourites, lists, ratings, and watchlist. | Requires Supabase schema/RLS migration approval | Blocked |
| 16 | Add annual recap generation or sharing enhancements. | Year in Review can be surfaced/shareable based on genuine yearly activity. | Local UI first; remote persistence only if needed | Not started |

## Implementation principles

The profile will remain **activity-first**: current tracking state and recent events precede visual analytics. Existing charts will not be deleted; they will be moved to the dedicated Taste & Stats context. No remote database, authentication, or deployment settings will be changed without separate explicit confirmation.

## First visible batch

The first batch is Items **1–3**. It changes the Overview only: replacing duplicated rank content with view-state cards, making the activity section more useful, and showing an understandable next reward. The patch will be supplied only after sandbox validation, and each batch will be independently reviewable on localhost.

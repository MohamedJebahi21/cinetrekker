# CineTrekker Engagement Feature Audit — Working Notes

## Existing high-value surfaces confirmed

- `src/pages/Calendar.tsx` is already a substantial release calendar, not a missing feature. It supports week, month, and agenda views; upcoming movie and on-air TV data; followed-show enrichment; search; movie/TV filtering; followed-only filtering; network and minimum-rating filters; date navigation; today shortcut; release spotlight; watchlist/follow actions; detail modals; and responsive mobile layouts.
- `src/pages/Index.tsx` already implements the home retention stack. Authenticated users see Continue Watching, Fresh Discovery tabs (trending today, trending week, new releases), watchlist preview, personalized recommendations (`BecauseYouLiked` and genre rail), a discovery hub, Suggested People, and Home Stats Snapshot. Guests receive local watchlist onboarding, account-sync messaging, discovery, and signup prompts.
- `src/pages/Achievements.tsx` already provides a substantial gamification layer with milestone ladders for watching, ratings, genres, watch time, special unlocks, progress filters, totals, and a shareable achievement card. A generic “add achievements” recommendation would duplicate existing functionality.
- `src/pages/YearInReview.tsx` already provides a yearly recap / Wrapped-style experience with available years, watch totals, genre and monthly charts, and top-rated titles. A generic “add Wrapped” recommendation would duplicate existing functionality.
- `src/pages/UserProfile.tsx` already provides public profiles, follow/unfollow, social-proof stats, pinned favorites, public comments, followers, and following tabs. The social graph exists and needs deeper interaction loops rather than basic profile/follow implementation.
- `src/pages/Notifications.tsx` already provides a notification inbox with unread/read/all filters, counts, mark-all-read, delete, timestamps, thumbnails, and navigation.
- `src/pages/Following.tsx` already provides followed-title tracking with movie/TV/upcoming filters, search, sorting, release status, stats, enriched details, and share/unfollow controls.
- `src/hooks/useEngagementLoop.ts` already tracks a lightweight local streak/comeback signal and session starts, but this does not yet appear to be a durable, prominent, social, or notification-backed daily habit system.

## Initial product interpretation

CineTrekker already has breadth: discovery, calendar, watch progress, lists, recommendations, profiles, comments, follows, notifications, achievements, stats, and annual recap. The highest-impact opportunity is not adding another destination page. It is connecting existing surfaces into a recurring loop: a user receives a meaningful prompt, performs a low-friction action, gets immediate personal/social feedback, and has a reason to return the next day.

## Likely gaps to validate in the remaining audit

1. Whether there is a true friend/community activity feed rather than profile-specific comments and notifications only.
2. Whether users can react to or discuss activity with low-friction actions beyond writing comments.
3. Whether achievements, stats, and year-in-review are visible in the core home/profile loop or isolated destinations.
4. Whether the calendar supports user-specific reminders or notifications, not only browsing/filtering.
5. Whether recommendations support lightweight daily prompts, “surprise me,” mood/time constraints, or explicit feedback loops.
6. Whether onboarding asks enough preference questions to make the first session feel personal quickly.
7. Whether social proof is displayed consistently across discovery cards after the new RPC integration.
8. Whether existing engagement analytics measure the full retention funnel, including repeat sessions and social actions.

## Local browser audit — guest homepage

- The first-visit homepage has a clear Netflix-style dark hero with two CTAs, a three-step onboarding story, Fresh Discovery tabs, Discovery Hub shortcuts, and footer/legal links.
- In the sandbox, Fresh Discovery degraded from skeletons to a readable retry state because the local TMDB/Supabase environment is not configured; this is an environment limitation, not evidence that the production feed is broken.
- The guest homepage currently emphasizes exploration and signup, but there is no visible daily challenge, friend activity, streak status, or “what changed since last visit” prompt in the above-fold experience.
- The current loop is strong for discovery and account conversion but weaker for return motivation: after a user has already explored and saved titles, the homepage needs a compact reason to return today and a visible social/progression payoff.

## Local browser audit — calendar

- The Calendar route is already a polished multi-view release timeline with Week, Month, and Agenda modes, date navigation, Today shortcut, search, media type/network/rating filters, stats cards, and a public browsing explanation.
- The page offers a Followed-only concept and direct watchlist/follow actions in populated states, but it does not currently present a visible user-specific reminder schedule, “next episode tonight” alert, calendar subscription/export, or lightweight social proof around what friends are watching.
- In the sandbox, the page correctly rendered its structured header, controls, stats, and a centered retry state when the TMDB proxy returned invalid data. The audit should not recommend building another calendar; it should recommend connecting this one to reminders, personal priorities, and social activity.

# CineTrekker Engagement & Retention Roadmap

CineTrekker already possesses a robust architectural foundation. Unlike typical early-stage movie trackers that only offer basic watchlists, CineTrekker ships with a multi-view release calendar (`src/pages/Calendar.tsx`), an annual cinematic recap experience (`src/pages/YearInReview.tsx`), a dynamic gamification and milestone ladder (`src/pages/Achievements.tsx`), public user profiles and comments (`src/pages/UserProfile.tsx`), title follow notifications (`src/components/FollowNotificationMonitor.tsx`), and real-time social engagement badges across discovery rails (`src/components/MediaCard.tsx`).

However, these powerful features currently operate largely as isolated destinations. To transform CineTrekker into a daily habit that users love and open every day, the application needs **recurring retention loops** that connect discovery, tracking, and social proof into the primary homepage and daily interaction flows.

---

## Strategic Analysis of Existing Features vs. Retention Gaps

| Existing Feature | Current State | The Retention Gap |
| :--- | :--- | :--- |
| **Release Calendar** (`/calendar`) | Fully functional week/month/agenda views with TMDB enrichment and network filters. | It requires proactive visits. Users do not receive a morning prompt or a daily "What's releasing today for your followed shows?" highlight on their home feed. |
| **Achievements & Milestones** (`/achievements`) | Dynamic milestone tracking across watch counts, ratings, genres, and watch time with badge sharing. | Milestones live on a separate page. Users only discover earned achievements when they manually navigate to `/achievements` rather than receiving celebration moments in the app. |
| **Social Graph & Comments** (`UserProfile` & `MediaComments`) | Public profiles, follow/unfollow actions, nested comments, and comment likes. | There is no unified **Community Activity Feed** showing what friends or followed users watched, reviewed, or commented on today. |
| **Home Stats Snapshot** (`HomeStatsSnapshot`) | Displays total watched, watchlist count, watching count, and streak days. | The streak counter is passive. It does not tie into daily check-ins, streak protection, or unlockable tier rewards that motivate daily app launches. |

---

## Proposed High-Impact Enhancements

To maximize daily engagement and make users fall in love with the application, we propose three distinct pathways. Each leverages existing infrastructure without adding unnecessary bloat.

### Option A: The Daily "Today's Releases" Home Banner & Notification Bridge
*   **What it does:** Elevates today’s releases from followed shows and watchlist items into an interactive banner directly at the top of the authenticated homepage (`Index.tsx`). 
*   **Why it drives daily return:** When a user opens CineTrekker in the morning, the home screen immediately tells them: *"Two of your followed shows have new episodes today. Tap to mark as watched."*
*   **Implementation Effort:** Medium (Queries existing calendar/followed titles and renders an above-fold actionable card).

### Option B: Social Activity Feed & "Friend Ticker"
*   **What it does:** Introduces a community activity stream on the homepage or profile feed where users can see what people they follow are watching, rating, or commenting on, complete with one-tap "Like" or "Add to Watchlist" buttons.
*   **Why it drives daily return:** It harnesses social proof and FOMO. CineTrekker transforms from a solitary utility into a vibrant cinematic community.
*   **Implementation Effort:** Large (Extends Supabase social queries to fetch activity from followed user IDs).

### Option C: Gamified Daily Check-In & Streak Rewards
*   **What it does:** Upgrades the existing local streak counter (`useEngagementLoop.ts`) into an interactive daily reward system. Checking in or logging an episode grants daily XP towards cinematic ranks and unlocks exclusive profile flair.
*   **Why it drives daily return:** Leverages psychological loss aversion and clear status progression, giving users a tangible reason to open the app every single day.
*   **Implementation Effort:** Medium (Builds upon existing achievement calculation logic and local engagement state).

---

## Recommendation & Next Step

To achieve the highest impact on daily retention with clean, maintainable code, **Option A (The Daily Release & Followed Show Home Bridge)** is the recommended starting point because it immediately connects the calendar and follow systems to the homepage return loop.

Please let me know which direction you would like to pursue (**Option A**, **Option B**, or **Option C**), and I will proceed with implementing it for your review!

## Implementation status — Option A

Option A is implemented in `src/components/home/DailyReleaseHighlight.tsx` and integrated into the authenticated homepage in `src/pages/Index.tsx`, directly above Fresh Discovery. The component reuses the unified `useTitleFollows` and `useUserLists` data sources, checks followed and saved movie/TV titles against TMDB details, filters releases to the current day, prioritizes followed titles, and provides a clear route to the full Calendar. It includes loading, retry, no-radar, no-release, responsive card, keyboard-focus, and reduced-complexity states without modifying Supabase schema or external provider configuration.

Validation completed: `npm run type-check` passed, `npm run build` passed, and the complete `npm run test` suite passed, including 11 security tests, strict localization verification, and four Playwright Chromium smoke tests. The test environment has no authenticated user or valid TMDB data, so the populated authenticated card state should receive one visual verification after the user logs in locally.

## Implementation status — Option B

Option B is implemented in `src/components/home/CommunityActivityFeed.tsx` and integrated into the authenticated homepage in `src/pages/Index.tsx`. It uses the existing follow graph, public-profile summary RPC, public-profile comment RPC, and TMDB detail services to surface recent comments from people the user follows. It includes profile and title links, spoiler-safe comment previews, relative timestamps, likes count, empty onboarding, loading, retry, and responsive states. This first social-feed slice intentionally avoids a new database table or unapproved provider migration.

Validation completed: `npm run type-check` passed, `npm run build` passed, and the full `npm run test` suite passed, including security, localization, and Playwright smoke coverage. A production account with followed public profiles and comments should receive one visual check to confirm the populated feed, while accounts without social activity will see the intentional onboarding state.

## Implementation status — Option C

Option C is implemented in `src/components/home/DailyCheckInCard.tsx`. The existing local engagement loop now exposes `checkedInToday`, derives a visible rank ladder from streak length, records a privacy-safe `daily_checkin` event, shows seven-day streak progress, communicates comeback/streak/nudge context, and routes the user to watched activity with a clear “Log something” action. The streak remains local by design; no external table, scheduled job, email, or push provider was added.

Combined validation completed after all three options: `npm run type-check` passed, `npm run build` passed, and the full `npm run test` suite passed, including 11 security tests, strict localization checks, and four Chromium smoke tests. Populated authenticated states still benefit from a manual visual check using an account with followed titles, public followed profiles, and at least one comment.

## Final local browser verification

The local guest homepage still renders the existing first-visit hero, navigation, discovery tabs, onboarding steps, and retry state after all three authenticated-only engagement components were added. The sandbox still lacks working TMDB data, so Fresh Discovery falls back to its existing retry UI. Because the three new surfaces are gated by the authenticated user state, the guest route remains unaffected. The populated Daily Release, Community Pulse, and Daily Check-In states should be visually checked with a logged-in account in the user’s local environment before release.

## Phase 2 implementation — Curated Collections

The existing collections schema and hook were audited instead of duplicated. The typed collections data layer now supports descriptions, editing, deletion, collection-item invalidation, schema-missing handling, and safe normalization. A protected `/collections` route and `/collections/:collectionId` detail route were added with a premium curation-studio UI, creation/edit dialogs, title search, add-to-collection actions, responsive media grids, empty states, and navigation/command-palette entry points. Collections remain private by default and no external Supabase changes were applied; the required tables already exist in tracked migrations.

Validation completed: `npm run type-check` passed and `npm run build` passed. A full test suite will run after all four Phase 2 features are complete.

## Phase 2 implementation — Taste Match and Cine-Quests

Taste Match is implemented in `src/components/social/TasteMatchCard.tsx` and inserted into other users’ public profiles. It compares shared favorite-title keys and favorite genres using the existing public profile summary and authenticated profile data, presents a compatibility score, links shared titles, and gracefully asks users to add favorites when there is not enough data.

Monthly Cine-Quests are implemented in `src/lib/cineQuests.ts`, `src/components/quests/CineQuestCard.tsx`, `src/components/quests/CineQuestHub.tsx`, and `src/pages/Quests.tsx`. The quests refresh by calendar month, derive progress from existing watched/rated/watchlist activity, show limited-reward badge language, record completion once per month locally, and appear both on the authenticated homepage and a protected `/quests` route. No new external tables or scheduled jobs were added.

Validation completed so far: `npm run type-check` passed for both features. The production build will be rerun after Daily Trivia is integrated.

## Phase 2 implementation — Daily Trivia

Daily Trivia is implemented in `src/lib/dailyTrivia.ts` and `src/components/home/DailyTriviaCard.tsx`, then integrated into the authenticated homepage. It uses a deterministic question rotation by local calendar day, a curated static question set, one answer per day, explanation feedback, a small trivia streak, and a copyable result. State and answer analytics are local/privacy-safe; no external API or AI feature was introduced.

Validation completed: `npm run type-check` passed for the full Phase 2 implementation. Production build and full CI/browser validation are the remaining checks.

## Final local route verification

The new `/collections` route resolves locally and preserves the existing protected-route sign-in gate. The new `/quests` route also resolves and redirects unauthenticated visitors to `/login`. The sandbox browser had no authenticated account, so the populated Collections, Taste Match, Cine-Quests, and Daily Trivia states require one manual check using a signed-in local account.

Final automated validation: production build passed, TypeScript checks passed, all 11 security tests passed, strict localization checks passed across six locales, and the four Chromium smoke tests passed.

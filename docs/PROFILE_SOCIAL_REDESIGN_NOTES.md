# Profile and Social Experience — Local Design Notes

## Current behavior observed locally

The signed-in `/profile` route correctly redirects unauthenticated visitors to `/login`. Its full account profile UI cannot be visually assessed without a test account, so the redesign will preserve the existing authenticated profile functionality while extending the public social experience through the existing `/user/:userId` route.

## Existing local capabilities

| Capability | Current implementation | Gap to address locally |
| --- | --- | --- |
| Own profile | `/profile` has a cinematic cover, avatar upload, achievement level, viewing statistics, favorites, taste insights, and profile editing. | The personal dashboard is strong but does not clearly expose a public-facing social identity or a route to discover people. |
| Public profile | `/user/:userId` exists with a basic avatar card, follow button, and a recently watched area. | The layout is sparse, reads private profile data through a broad query, and does not surface social proof, favorites, public activity, or comments. |
| User follows | `follows` is referenced in `socialService` for follow/unfollow and follow-state checks. | Counts and an accessible follower/following presentation are absent; local migrations for this table are not present in the repository. |
| Comments | Title comment cards support author links, likes, replies, spoiler handling, and deletion. | They do not consistently resolve a public profile safely, and public profile pages do not aggregate a user’s visible comments. |
| Privacy | `get_public_profile(uuid)` is defined in a local migration and exposes a curated profile slice only for public profiles or the owner. | The public profile page currently bypasses this safe RPC; the read path must be changed before richer discovery features can be safely offered. |

## Local implementation boundary

The work will add frontend behavior and database migrations only. No Supabase database changes, storage changes, or deployment actions will be applied without separate authorization.

## Selected experience design

The redesign will use a **cinematic social profile** pattern: a restrained backdrop, prominent avatar and identity block, action-oriented follow control, and a compact social-proof rail. It borrows the familiar hierarchy of modern media and community products without copying any single brand: identity and relationship actions first, then curated taste, public activity, and connections.

| Surface | Design decision | User outcome |
| --- | --- | --- |
| My Profile (`/profile`) | Preserve the existing dashboard, but add an explicit public-profile control and a direct entry point to the public version. | Users understand what other people can see and can manage their social identity confidently. |
| Public Profile (`/user/:userId`) | Replace the sparse two-column layout with a full hero, profile summary, follow action, social counts, favorites, discussion activity, and connection navigation. | A profile feels credible, browseable, and useful instead of being an isolated card. |
| People directory (`/people`) | Add a searchable directory of public cinephile profiles with tasteful profile cards and follow state. | Visitors can find people, not only encounter a profile through a comment. |
| Comments | Keep replies, likes, spoiler protection, and author links; repair author-avatar resolution through curated public profile reads and add a concise sign-in affordance for guests. | Comment threads become a reliable path to an author’s profile and social interaction. |
| Privacy and data access | Replace broad profile reads with curated database functions that return only public identity, preference, and aggregate social data. | Public browsing does not reveal date of birth, moderation settings, or private watchlist data. |

## Local database contract to add

A new migration will introduce read-only, security-definer functions for public profile summary, public profile directory, public profile connections, and public profile comments. It will not be applied in this task. The frontend will fail gracefully with a clear social-unavailable state until that migration is applied to Supabase with user approval.

## Local browser validation

The new `/people` route loads successfully in the local browser with the intended cinematic community header, search control, responsive loading skeleton, and polished empty state. In the current local database state, the public-directory query settles to no records, which correctly renders: “No public profiles to show yet.” This is expected until the local migration is applied and one or more profiles are marked public.
The local `/user/:userId` route was also tested with a non-existent UUID. After its loading state, it settles into a centered **Profile not found** message with explanatory privacy-aware text and a named **Go home** link. The route retains the application’s skip link, one main content area, and no unlabelled interactive controls in the tested signed-out state.

## Mobile compatibility validation

The social-profile routes were validated at the configured **Pixel 7** and **iPhone 14** mobile browser profiles. The People directory and the public-profile unavailable state remained within the viewport width at both mobile sizes; the People search control measured at least 44 px high and retains an accessible label.

A local WebKit loading failure was found during testing. The Vite development CSP included `upgrade-insecure-requests`, which caused WebKit to request local Vite module endpoints through HTTPS although the local server is HTTP. The local-only directive was removed from `vite.config.ts`; Vercel’s production CSP remains separate. After this change, the focused mobile suite passed in both mobile Chrome and mobile Safari.

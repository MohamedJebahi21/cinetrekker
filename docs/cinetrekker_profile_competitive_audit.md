# CineTrekker Profile: Competitive Audit

## Executive read

CineTrekker already has **more visual analytics than most trackers**. Its main weakness is not a missing chart; it is that the profile reads as a long personal dashboard before it reads as a **living watch identity**. The strongest competitors make a profile return-worthy through dated activity, clear viewing state, social proof, earned recognition, and a compact annual/monthly story—not by placing every possible insight on one page.

## What the benchmark says

| Platform | Profile content and structure | Why it feels rewarding to revisit | Do not copy |
|---|---|---|---|
| **Trakt** | Modern profiles are connected to profile activity, follower activity, history/progress, screen time, all-time stats, and month/year recaps. | Viewing streaks, seven-day screen time with peak hours, recaps, and social context make recent behavior feel alive. [1] | Hiding core watched/list state behind more clicks. Trakt community feedback on its V3 migration explicitly criticizes large imagery and weakened at-a-glance tracking. [1] |
| **TV Time** | Historically combined personal stats, ratings, spoiler-safe community reactions, custom lists/posters, and badges. | Its **Rewind** turned a full year of tracked shows, movies, characters, and genres into a shareable personal story. [2] [3] | Treat it as a **historical pattern**, not a current product benchmark: TV Time announced its July 2026 shutdown. [1] |
| **Letterboxd** | A compact identity layer leads to separate Profile, Films, Diary, Watchlist, Lists, and activity areas; favorites, bio, and lists are strong taste signals. | The dated **Diary**, reviews, likes, follows, lists, annual stats, and year-end framing continually create new reasons to return. [4] [5] | Do not gate the basic profile loop behind complex dashboards. Keep the main log simple and make analytics a secondary destination. |
| **SIMKL** | Emphasizes advanced stats, custom lists/collections, favorite-list presentation, advanced sorting, and public/private/unlisted visibility. | Control and personalization make the profile feel owned rather than merely calculated. [6] | Avoid overloading the profile with configuration options; privacy and sorting belong in clear settings/list controls. |
| **Serializd** | Profile activity is built around clear states—currently watching, watched, watchlist, paused, dropped—plus diary, reviews, and following. | Every state changes the user’s profile, alerts, home modules, recommendations, and social feed. [7] [8] | Do not collapse all viewing into one generic “watched” total; TV tracking needs visible current and paused state. |
| **IMDb** | Aggregates ratings, reviews, lists, Watchlist, check-ins, polls, badges, and ratings insights; privacy is handled by content type. | Earned badges and public taste comparison make aggregate data socially meaningful. [9] | Avoid its broad, fragmented account surface; a media tracker should not require separate destinations to understand one’s core identity. |
| **MyAnimeList** | Makes status counts, time watched, mean score, history, favorites, badges, friends, contribution counts, and comments highly visible. | It rewards collection completion and community status with granular progress and visible social proof. [10] | Avoid its text-heavy sidebar, oversized free-form profile blocks, and many low-signal counters competing for attention. |

> **Common pattern:** Profiles that last are **timeline-first and state-aware**. Analytics support the story; they do not replace it.

---

# 1. REMOVE

- **Actor Matches from the core profile flow — Priority: High.** It is novel but weakly related to the user’s actual viewing identity, requires explanation, and consumes prominent space that competitors reserve for activity, current progress, and social proof. Keep it only as an optional discovery experiment, not a profile section.

- **The duplicate “Cinephile” progression treatment — Priority: High.** The header already shows a level badge and progress bar; the later **Cinephile Ranks** card repeats the same concept. Consolidate into one compact progression module with a real next reward. IMDb and MAL make earned badges or status visible, rather than repeating the same rank in several forms. [9] [10]

- **The long-tail analytics wall on the main profile — Priority: High.** Rating distribution, decade distribution, and crew insights are individually credible, but together make the profile feel like a static report. Move them behind **Taste & Stats** or an expandable “See all insights” surface. Letterboxd and IMDb both separate deeper analytics from the immediate identity/activity layer. [5] [9]

- **Low-information empty/placeholder poster slots — Priority: Medium.** In the supplied page, unfinished favorite shelves visually outweigh real content. Replace empty poster cards with one concise, purposeful “Add favorites” prompt; do not make missing content look like a broken carousel.

- **Any generic achievement link without visible proof — Priority: Medium.** “View All Achievements” is not rewarding on its own. Either show a small earned-badge strip and current unlock progress, or remove the link from the hero until achievement objects are present.

# 2. IMPROVE

- **Header metrics: improve from lifetime totals to viewing state.** CineTrekker currently highlights movies watched, ratings, and watch time. Serializd and MAL make the actionable split obvious: **currently watching, completed, watchlist, paused/on hold, dropped**, plus episode progress. Add a compact state row and retain lifetime totals as secondary. [7] [10]

- **Recently Watched: improve from a poster shelf to a dated activity log.** The current carousel is visually attractive but low-context. Letterboxd and Serializd treat a dated log as the profile’s core: show title, episode/season when applicable, watched date, rating/review excerpt, and whether it was a rewatch. A “View all activity” link should lead to a filterable diary/history. [4] [7]

- **Favorites: improve the social signal.** CineTrekker has strong favorite-pinning controls, but it splits films and series into large editing-oriented shelves. Borrow Letterboxd/MAL’s public-taste convention: expose a small, immediately recognizable **Top Picks** strip near the identity header; place extended editing and separate movie/TV shelves behind Favorites. [4] [10]

- **Achievements and level: improve the reward loop.** TV Time, IMDb, and MAL expose earned badges, not just a numerical rank. Show the latest 3–5 earned badges, one “next unlock,” and the action that advances it. The rank should explain a benefit or milestone, not merely label the account. [2] [9] [10]

- **Taste & Stats: improve explanation and comparison.** CineTrekker has rating, decade, genre, and crew analytics—an excellent base. IMDb does this better by presenting ratings behavior over time and by enabling public taste comparison. Add plain-language takeaways (for example, “You rate 1990s thrillers highest”) and make every chart answer a question; keep raw chart detail one click deeper. [9]

- **Public-profile privacy: improve granularity.** CineTrekker has a good public-profile switch. SIMKL and IMDb go further with separate public/private/unlisted controls for lists, activity, ratings, and Watchlist. Preserve the simple master switch, then add per-surface controls only where sharing is meaningful. [6] [9]

- **Tabs: improve information architecture.** Keep the existing Overview / Favorites / Taste & Stats / Edit split, but enforce it. The supplied page still reads as one long dashboard. Overview should be identity + current state + recent activity; Favorites should own all shelves; Taste & Stats should own charts and crew analysis; Edit should be strictly account/profile management.

# 3. ADD

| Add | Why it is common / valuable | Priority | Effort |
|---|---|---:|:---:|
| **Activity / Diary / Reviews tab** | Central to Letterboxd, Serializd, Trakt, and MAL. A date-backed record creates repeat visits, meaningful history, and shareable opinion. [1] [4] [7] [10] | P0 | M |
| **TV status and progress summary** | “Currently watching,” “up next,” completed, paused, dropped, and episode progress are foundational to Serializd and MAL. [7] [10] | P0 | S–M |
| **Visible badge strip + next unlock** | Badges create concrete reward and social proof across TV Time, IMDb, and MAL. [2] [9] [10] | P0 | M |
| **Monthly / annual recap card** | Trakt’s Month/Year in Review and TV Time Rewind convert tracking into a celebratory return event. CineTrekker can surface a compact card that links to its existing Year in Review. [1] [3] | P1 | M |
| **Seven-day screen time and viewing streak** | Trakt uses short-horizon activity and peak hours to make stats immediately relevant; this complements CineTrekker’s lifetime watch time. [1] | P1 | S–M |
| **Social proof module** | Add followers/following, recent comments/reviews received, and a “friends watched/rated this” cue. Letterboxd, Serializd, Trakt, and MAL all connect activity to people. [1] [4] [8] [10] | P1 | M |
| **Public custom-list showcase** | Public lists are a core taste artifact on Letterboxd, Trakt, and SIMKL, and are more expressive than a generic favorite shelf. [1] [4] [6] | P1 | M |
| **Taste comparison / overlap** | A private or opt-in comparison with a friend makes existing rating/genre data socially useful, following IMDb’s public ratings-insight pattern. [9] | P2 | L |
| **Content-level visibility controls** | Separate visibility for activity, favorites/lists, ratings, and watchlist supports safer sharing as social features expand. [6] [9] | P2 | M |

## Recommended sequence

1. **Make Overview activity-first:** add status summary and dated diary/activity, then move low-frequency charts out of the main flow.
2. **Make rewards visible:** replace duplicated rank UI with earned badges + next unlock.
3. **Make the profile socially useful:** expose public favorites/lists, connections, and lightweight interaction context.
4. **Make analytics episodic:** use a monthly card and annual recap to bring users back, instead of expecting them to revisit static charts.

## References

[1]: https://forums.trakt.tv/t/trakt-product-update-june-mid-july-2026/116109 "Trakt Product Update – June & Mid-July 2026"
[2]: https://apps.apple.com/iq/app/tv-time-track-shows-movies/id431065232 "TV Time: Track Shows & Movies — App Store listing"
[3]: https://whipmedia.com/news/tv-time-unveils-tv-time-rewind-2022/ "TV Time Unveils TV Time Rewind 2022"
[4]: https://letterboxd.com/about/ "Letterboxd FAQ and product guidance"
[5]: https://letterboxd.com/welcome/ "Welcome to Letterboxd"
[6]: https://docs.simkl.org/how-to-use-simkl/account-and-billing/subscription-plans/pro "SIMKL Pro documentation"
[7]: https://serializd.com/about?q=tracking "Serializd tracking statuses FAQ"
[8]: https://www.serializd.com/ "Serializd product overview"
[9]: https://help.imdb.com/article/imdb/general-information/faq-for-the-your-profile-feature/GJSRJTR7G24USEPC "IMDb FAQ for the Your Profile feature"
[10]: https://myanimelist.net/profile/anime-prime "MyAnimeList public profile example"

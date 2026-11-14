import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("CookieConsent coordinate with QuickStart via synchronous check and custom events", () => {
  const cookieSource = fs.readFileSync("src/components/CookieConsent.tsx", "utf-8");
  const quickStartSource = fs.readFileSync("src/components/OnboardingQuickStart.tsx", "utf-8");

  assert.match(cookieSource, /cinetrekker:quickstart-state/);
  assert.match(cookieSource, /isQuickStartEligible\(\)/);
  assert.match(quickStartSource, /cinetrekker:quickstart-state/);
  assert.match(cookieSource, /if \(choice \|\| isQuickStartActive\) \{\s*return null;\s*\}/);
});

test("Notification links include #comments hash for reply and comment notifications", () => {
  const linkSource = fs.readFileSync("src/lib/notificationLinks.ts", "utf-8");
  assert.match(linkSource, /type === "reply" \|\| type === "comment"/);
  assert.match(linkSource, /#comments/);

  const detailsSource = fs.readFileSync("src/pages/Details.tsx", "utf-8");
  assert.match(detailsSource, /window\.location\.hash === "#comments"/);
  assert.match(detailsSource, /getElementById\("comments"\)/);
});

test("Home page does not render Discovery Hub or HomeStatsSnapshot for authenticated users", () => {
  const indexSource = fs.readFileSync("src/pages/Index.tsx", "utf-8");

  // In authenticated branch (before ": ("), neither discoveryHubSection nor HomeStatsSnapshot is rendered
  const [authBranch, guestBranch] = indexSource.split(') : (');
  assert.ok(authBranch);
  assert.ok(guestBranch);

  assert.doesNotMatch(authBranch, /\{discoveryHubSection\}/);
  assert.doesNotMatch(authBranch, /<HomeStatsSnapshot/);
  assert.doesNotMatch(guestBranch, /<HomeStatsSnapshot/);
});

test("Profile page renders HomeStatsSnapshot in the overview section", () => {
  const profileSource = fs.readFileSync("src/pages/Profile.tsx", "utf-8");

  assert.match(profileSource, /import\("@\/components\/home\/HomeStatsSnapshot"\)/);
  assert.match(profileSource, /<HomeStatsSnapshot/);
  assert.match(profileSource, /watched=\{watched\}/);
  assert.match(profileSource, /watchlist=\{watchlist\}/);
});

test("DailyCheckInCard uses clean and restrained styling", () => {
  const checkInSource = fs.readFileSync("src/components/home/DailyCheckInCard.tsx", "utf-8");

  assert.doesNotMatch(checkInSource, /via-background\/95/);
  assert.doesNotMatch(checkInSource, /text-3xl font-black/);
  assert.match(checkInSource, /border-border\/60 bg-card\/60/);
});

test("NotificationBell renders all unread notifications in scrollable container without duplicate unread pills", () => {
  const bellSource = fs.readFileSync("src/components/NotificationBell.tsx", "utf-8");

  assert.doesNotMatch(bellSource, /slice\(0, 3\)/);
  assert.doesNotMatch(bellSource, /notifications\.moreUnread/);
  assert.match(bellSource, /max-h-\[22rem\] sm:max-h-\[28rem\] space-y-2 overflow-y-auto overscroll-contain/);
  assert.match(bellSource, /unreadNotifications\.map/);
});

test("CommunityActivityFeed uses CineTrekker dark restrained styling without amber accents", () => {
  const feedSource = fs.readFileSync("src/components/home/CommunityActivityFeed.tsx", "utf-8");

  assert.doesNotMatch(feedSource, /text-amber-400/);
  assert.doesNotMatch(feedSource, /bg-amber-400/);
  assert.match(feedSource, /text-primary/);
  assert.match(feedSource, /border-border\/60 bg-card\/60/);
});

test("GuestSyncBanner uses refined dark styling without heavy multi-stop gradients or yellow glows", () => {
  const bannerSource = fs.readFileSync("src/components/GuestSyncBanner.tsx", "utf-8");

  assert.doesNotMatch(bannerSource, /rgba\(234,179,8/);
  assert.doesNotMatch(bannerSource, /bg-gradient-to-r/);
  assert.match(bannerSource, /border-border\/60/);
});

test("ContinueWatching uses clean and restrained dark styling without heavy gradients or floating orbs", () => {
  const cwSource = fs.readFileSync("src/components/ContinueWatching.tsx", "utf-8");

  assert.doesNotMatch(cwSource, /radial-gradient/);
  assert.doesNotMatch(cwSource, /blur-3xl/);
  assert.doesNotMatch(cwSource, /shadow-\[0_16px_38px/);
  assert.match(cwSource, /border-border\/60 bg-card\/60/);
});

test("Continue Watching only includes shows with at least one watched episode", () => {
  const hookSource = fs.readFileSync("src/hooks/useContinueWatchingViewModel.ts", "utf-8");

  assert.doesNotMatch(hookSource, /show\.isFollowed\s*\|\|\s*show\.watchedEpisodeCount\s*>\s*0/);
  assert.doesNotMatch(hookSource, /vm\.isFollowed\s*\|\|\s*vm\.watchedEpisodeCount\s*>\s*0/);
  assert.match(hookSource, /show\.watchedEpisodeCount > 0 &&\s*!completedShowIds\.has\(show\.showId\)/);
  assert.match(hookSource, /vm\.watchedEpisodeCount > 0 &&\s*!completedShowIds\.has\(vm\.showId\)/);
});
test("Profile and HomeStatsSnapshot use restrained dark styling without legacy radial glows or amber accents", () => {
  const snapshotSource = fs.readFileSync("src/components/home/HomeStatsSnapshot.tsx", "utf-8");
  const heroSource = fs.readFileSync("src/components/profile/ProfileIdentityHero.tsx", "utf-8");
  const actorMatchesSource = fs.readFileSync("src/components/profile/ActorMatchesSection.tsx", "utf-8");
  const profilePageSource = fs.readFileSync("src/pages/Profile.tsx", "utf-8");

  assert.doesNotMatch(snapshotSource, /radial-gradient/);
  assert.doesNotMatch(snapshotSource, /linear-gradient/);
  assert.match(snapshotSource, /border-border\/60 bg-card\/60/);

  assert.doesNotMatch(heroSource, /text-amber-400/);
  assert.doesNotMatch(heroSource, /text-blue-400/);
  assert.match(heroSource, /border-border\/60 bg-card\/60/);

  assert.doesNotMatch(actorMatchesSource, /text-yellow-500/);
  assert.doesNotMatch(actorMatchesSource, /bg-green-500/);

  assert.doesNotMatch(profilePageSource, /text-yellow-500/);
  assert.doesNotMatch(profilePageSource, /#E50914/);
});

test("Profile page recent activity resolves media previews and avoids raw mediaId fallbacks", () => {
  const profileSource = fs.readFileSync("src/pages/Profile.tsx", "utf-8");

  // Verifies that recentlyWatched is included in previewLookupItems for preview queries
  assert.match(profileSource, /previewLookupItems = useMemo\(\(\) => \{[\s\S]*?\.\.\.recentlyWatched/);

  // Verifies that watched entries are sorted by date descending before capping for insights
  assert.match(profileSource, /const sortedWatchedEntries = useMemo\(\s*\(\) =>\s*\[\.\.\.uniqueWatchedEntries\]\.sort/);
  assert.match(profileSource, /const capped = sortedWatchedEntries\.slice\(0, 120\);/);

  // Verifies that Recent Activity uses mediaTitle from preview/insight and does not fall back to raw #mediaId
  assert.doesNotMatch(profileSource, /insight\?\.title \|\| `#\$\{item\.mediaId\}`/);
  assert.match(profileSource, /const mediaTitle = preview\?\.title \|\| insight\?\.title;/);
  assert.match(profileSource, /if \(isLoadingMedia\) \{/);
});

test("Watchlist page and filters use restrained dark styling and keep existing actions", () => {
  const watchlistSource = fs.readFileSync("src/pages/Watchlist.tsx", "utf-8");
  const filtersSource = fs.readFileSync("src/components/WatchlistFilters.tsx", "utf-8");

  // Restrained dark surface styling
  assert.doesNotMatch(filtersSource, /bg-gradient-to-r/);
  assert.match(filtersSource, /border-border\/60 bg-card\/(?:60|70)/);
  assert.match(filtersSource, /hasActiveFilters/);

  // Watchlist keeps essential queue progress and actions
  assert.match(watchlistSource, /completionRate/);
  assert.match(watchlistSource, /handleBulkMarkWatched/);
  assert.match(watchlistSource, /handleBulkRemove/);
  assert.match(watchlistSource, /<RandomPicker/);
  assert.match(watchlistSource, /watchlistPage\.pickTonight/);
  assert.match(watchlistSource, /exportToJSON/);
  assert.match(watchlistSource, /exportToCSV/);
  assert.match(watchlistSource, /handleImport/);
});

test("Navigation overhaul items 1-8: focused product map, first-class calendar, discover tabs, and guest filtering", () => {
  const routesSource = fs.readFileSync("src/navigation/routes.ts", "utf-8");
  const navSource = fs.readFileSync("src/components/UnifiedNav.tsx", "utf-8");
  const discoverSource = fs.readFileSync("src/pages/Discover.tsx", "utf-8");
  const homeSource = fs.readFileSync("src/pages/Index.tsx", "utf-8");
  const profileSource = fs.readFileSync("src/pages/Profile.tsx", "utf-8");

  // 1 & 2: Authenticated burger groups are concise (Tracking & Library, Explore & Account) and include Calendar
  assert.match(routesSource, /authenticatedBurgerGroups/);
  assert.match(routesSource, /path: "\/calendar"/);
  assert.match(routesSource, /path: "\/collections"/);

  // 4: Guest burger groups hide empty-account destinations and show only Discover and Calendar
  assert.match(routesSource, /guestBurgerGroups/);
  // Guest group should not include profile, following, collections, recommendations, stats, achievements, quests, year-in-review
  const guestGroupMatch = routesSource.match(/export const guestBurgerGroups: NavigationGroup\[\] = (\[[\s\S]*?\]);/);
  assert.ok(guestGroupMatch, "guestBurgerGroups must be defined");
  const guestGroupContent = guestGroupMatch[1];
  assert.ok(guestGroupContent.includes('"/discover"'), "guest menu includes discover");
  assert.ok(guestGroupContent.includes('"/calendar"'), "guest menu includes calendar");
  for (const emptyDest of ["/profile", "/following", "/collections", "/recommendations", "/stats", "/achievements", "/quests", "/year-in-review"]) {
    assert.ok(!guestGroupContent.includes(`"${emptyDest}"`), `guest menu hides empty-account destination ${emptyDest}`);
  }

  // 5: Gamification pile folded into Profile
  assert.match(profileSource, /to="\/stats"/);
  assert.match(profileSource, /to="\/achievements"/);
  assert.match(profileSource, /to="\/quests"/);
  assert.match(profileSource, /to="\/year-in-review"/);

  // 6: No duplicate Home or Search in burger groups; no duplicate Watchlist/Watched/Profile shortcuts in XP card
  const authGroupMatch = routesSource.match(/export const authenticatedBurgerGroups: NavigationGroup\[\] = (\[[\s\S]*?\]);/);
  assert.ok(authGroupMatch, "authenticatedBurgerGroups must be defined");
  const authGroupContent = authGroupMatch[1];
  assert.ok(!authGroupContent.includes('r.path === "/"'), "burger groups drop home");
  assert.ok(!authGroupContent.includes('r.path === "/search"'), "burger groups drop search");
  assert.ok(!authGroupContent.includes('r.path === "/genres"'), "burger groups drop genres");
  assert.ok(!authGroupContent.includes('r.path === "/decades"'), "burger groups drop decades");
  assert.ok(!authGroupContent.includes('r.path === "/trending"'), "burger groups drop trending");
  assert.ok(!authGroupContent.includes('r.path === "/achievements"'), "burger groups drop achievements");

  // XP card no longer repeats Watchlist, Watched, and Profile shortcuts
  assert.doesNotMatch(navSource, /Quick shortcuts to Watchlist, Watched, and Profile/);

  // 7: People is present in authenticated burger groups
  assert.ok(authGroupContent.includes('r.path === "/people"'), "People is included in authenticated burger groups");

  // 3: Discover page supports tabs (Today / Week / For you / New) and Home See All points to tabs
  assert.match(discoverSource, /role="tablist"/);
  assert.match(discoverSource, /activeTab === "today"/);
  assert.match(discoverSource, /activeTab === "week"/);
  assert.match(discoverSource, /activeTab === "for-you"/);
  assert.match(discoverSource, /activeTab === "new"/);
  assert.match(homeSource, /showMoreLink="\/discover\?tab=today"/);
  assert.match(homeSource, /showMoreLink="\/discover\?tab=week"/);
  assert.match(homeSource, /showMoreLink="\/discover\?tab=new"/);
});

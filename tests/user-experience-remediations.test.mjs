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

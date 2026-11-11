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

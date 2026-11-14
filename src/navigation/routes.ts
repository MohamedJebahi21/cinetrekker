import type { LucideIcon } from "lucide-react";
import Award from "lucide-react/dist/esm/icons/award";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import CheckSquare from "lucide-react/dist/esm/icons/check-square";
import Compass from "lucide-react/dist/esm/icons/compass";
import Film from "lucide-react/dist/esm/icons/film";
import FolderHeart from "lucide-react/dist/esm/icons/folder-heart";
import House from "lucide-react/dist/esm/icons/house";
import Layers from "lucide-react/dist/esm/icons/layers";
import Settings from "lucide-react/dist/esm/icons/settings";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import User from "lucide-react/dist/esm/icons/user";
import Users from "lucide-react/dist/esm/icons/users";

export type NavigationGroupId = "tracking" | "explore" | "library" | "discovery" | "insights" | "community";

export interface NavigationRoute {
  path: string;
  labelKey: string;
  defaultLabel: string;
  icon: LucideIcon;
  group: NavigationGroupId;
  descKey: string;
  defaultDesc: string;
  bottomNav?: boolean;
}

export interface NavigationGroup {
  id: NavigationGroupId;
  titleKey: string;
  defaultTitle: string;
  links: NavigationRoute[];
}

// All registered application route definitions (used for metadata, breadcrumb labels, and bottom nav).
// Relative order for core paths ["/", "/watchlist", "/discover", "/search"] is preserved for test suites.
export const allRouteDefinitions: NavigationRoute[] = [
  { path: "/", labelKey: "nav.home", defaultLabel: "Home", icon: House, group: "explore", bottomNav: true, descKey: "navDescription.home", defaultDesc: "Your personal feed and tonight's picks." },
  { path: "/watchlist", labelKey: "nav.watchlist", defaultLabel: "Watchlist", icon: Bookmark, group: "tracking", bottomNav: true, descKey: "navDescription.watchlist", defaultDesc: "Queue of titles you want to watch." },
  { path: "/discover", labelKey: "nav.discover", defaultLabel: "Discover", icon: Compass, group: "explore", bottomNav: true, descKey: "navDescription.discover", defaultDesc: "Explore releases, trending, and picks." },
  { path: "/search", labelKey: "nav.search", defaultLabel: "Search", icon: Compass, group: "explore", bottomNav: true, descKey: "navDescription.search", defaultDesc: "Find movies, series, or people." },
  { path: "/watched", labelKey: "nav.watched", defaultLabel: "Watched", icon: CheckSquare, group: "tracking", descKey: "navDescription.watched", defaultDesc: "Your logged watch history." },
  { path: "/calendar", labelKey: "nav.calendar", defaultLabel: "Calendar", icon: CalendarDays, group: "tracking", descKey: "navDescription.calendar", defaultDesc: "TV schedule and movie release tracker." },
  { path: "/collections", labelKey: "nav.collections", defaultLabel: "Collections", icon: FolderHeart, group: "tracking", descKey: "navDescription.collections", defaultDesc: "Curate themed lists worth sharing." },
  { path: "/people", labelKey: "nav.people", defaultLabel: "People", icon: Users, group: "explore", descKey: "navDescription.people", defaultDesc: "Follow fellow cinephiles." },
  { path: "/profile", labelKey: "nav.profile", defaultLabel: "Profile", icon: User, group: "explore", descKey: "navDescription.profile", defaultDesc: "Manage your account, rank, and stats." },
  { path: "/settings", labelKey: "nav.settings", defaultLabel: "Settings", icon: Settings, group: "explore", descKey: "navDescription.settings", defaultDesc: "Account, privacy, and notifications." },
  // Standalone/deep-link routes preserved for metadata & direct URL access
  { path: "/trending", labelKey: "nav.trending", defaultLabel: "Trending", icon: Film, group: "explore", descKey: "navDescription.trending", defaultDesc: "What's popular right now." },
  { path: "/recommendations", labelKey: "nav.recommendations", defaultLabel: "Recommendations", icon: Film, group: "explore", descKey: "navDescription.recommendations", defaultDesc: "Taste-matched suggestions for your next watch." },
  { path: "/genres", labelKey: "nav.genres", defaultLabel: "Genres", icon: Layers, group: "explore", descKey: "navDescription.genres", defaultDesc: "Browse by specific film categories." },
  { path: "/decades", labelKey: "nav.decades", defaultLabel: "Decades", icon: CalendarDays, group: "explore", descKey: "navDescription.decades", defaultDesc: "Travel through cinema history." },
  { path: "/stats", labelKey: "nav.stats", defaultLabel: "Stats", icon: Award, group: "explore", descKey: "navDescription.stats", defaultDesc: "Detailed analysis of your viewing habits." },
  { path: "/achievements", labelKey: "nav.achievements", defaultLabel: "Achievements", icon: Award, group: "explore", descKey: "navDescription.achievements", defaultDesc: "Trophies and milestones unlocked." },
  { path: "/quests", labelKey: "nav.quests", defaultLabel: "Monthly Quests", icon: Trophy, group: "explore", descKey: "navDescription.quests", defaultDesc: "Time-limited challenges and rewards." },
  { path: "/year-in-review", labelKey: "nav.yearInReview", defaultLabel: "Year In Review", icon: Award, group: "explore", descKey: "navDescription.yearInReview", defaultDesc: "Your personal annual wrapped recap." },
  { path: "/awards", labelKey: "nav.awards", defaultLabel: "Awards", icon: Award, group: "explore", descKey: "navDescription.awards", defaultDesc: "Browse award winners and nominees." },
  { path: "/following", labelKey: "nav.following", defaultLabel: "Following", icon: User, group: "tracking", descKey: "navDescription.following", defaultDesc: "Titles you are tracking for updates." },
];

export const menuLinks = allRouteDefinitions;

// Core product map for authenticated users (Discover, Watchlist, Watched, Calendar, Collections, People, Profile, Settings)
export const authenticatedBurgerGroups: NavigationGroup[] = [
  {
    id: "tracking",
    titleKey: "nav.libraryTracking",
    defaultTitle: "Tracking & Library",
    links: [
      allRouteDefinitions.find((r) => r.path === "/watchlist")!,
      allRouteDefinitions.find((r) => r.path === "/watched")!,
      allRouteDefinitions.find((r) => r.path === "/calendar")!,
      allRouteDefinitions.find((r) => r.path === "/collections")!,
    ],
  },
  {
    id: "explore",
    titleKey: "nav.exploreCommunity",
    defaultTitle: "Explore & Account",
    links: [
      allRouteDefinitions.find((r) => r.path === "/discover")!,
      allRouteDefinitions.find((r) => r.path === "/people")!,
      allRouteDefinitions.find((r) => r.path === "/profile")!,
      allRouteDefinitions.find((r) => r.path === "/settings")!,
    ],
  },
];

// Guest burger map: hides empty-account destinations, provides clean discovery and schedule
export const guestBurgerGroups: NavigationGroup[] = [
  {
    id: "explore",
    titleKey: "nav.explore",
    defaultTitle: "Explore",
    links: [
      allRouteDefinitions.find((r) => r.path === "/discover")!,
      allRouteDefinitions.find((r) => r.path === "/calendar")!,
    ],
  },
];

// Compatibility exports
export const navigationGroups: NavigationGroup[] = authenticatedBurgerGroups;
export const primaryNavigationGroups: NavigationGroup[] = authenticatedBurgerGroups;

export const mobileBottomRoutes = ["/", "/discover", "/search", "/watchlist"]
  .map((path) => allRouteDefinitions.find((route) => route.path === path))
  .filter((route): route is NavigationRoute => Boolean(route));

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
import Trophy from "lucide-react/dist/esm/icons/trophy";
import User from "lucide-react/dist/esm/icons/user";

export type NavigationGroupId = "library" | "community" | "discovery" | "insights";

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

const routeDefinitions: NavigationRoute[] = [
  { path: "/", labelKey: "nav.home", defaultLabel: "Home", icon: House, group: "library", bottomNav: true, descKey: "navDescription.home", defaultDesc: "Your personal feed and tonight's picks." },
  { path: "/profile", labelKey: "nav.profile", defaultLabel: "Profile", icon: User, group: "library", descKey: "navDescription.profile", defaultDesc: "Manage your account, rank, and stats." },
  { path: "/watchlist", labelKey: "nav.watchlist", defaultLabel: "Watchlist", icon: Bookmark, group: "library", bottomNav: true, descKey: "navDescription.watchlist", defaultDesc: "Your list of titles to watch." },
  { path: "/collections", labelKey: "nav.collections", defaultLabel: "Collections", icon: FolderHeart, group: "library", descKey: "navDescription.collections", defaultDesc: "Curate themed lists worth sharing." },
  { path: "/watched", labelKey: "nav.watched", defaultLabel: "Watched", icon: CheckSquare, group: "library", descKey: "navDescription.watched", defaultDesc: "Your logged watch history." },
  { path: "/following", labelKey: "nav.following", defaultLabel: "Following", icon: User, group: "library", descKey: "navDescription.following", defaultDesc: "Titles you are tracking for updates." },
  { path: "/people", labelKey: "nav.people", defaultLabel: "People", icon: User, group: "community", descKey: "navDescription.people", defaultDesc: "Discover public profiles and follow fellow cinephiles." },
  { path: "/discover", labelKey: "nav.discover", defaultLabel: "Discover", icon: Compass, group: "discovery", bottomNav: true, descKey: "navDescription.discover", defaultDesc: "Explore recommendations and releases." },
  { path: "/trending", labelKey: "nav.trending", defaultLabel: "Trending", icon: Film, group: "discovery", descKey: "navDescription.trending", defaultDesc: "What's popular right now." },
  { path: "/search", labelKey: "nav.search", defaultLabel: "Search", icon: Compass, group: "discovery", bottomNav: true, descKey: "navDescription.search", defaultDesc: "Find movies, series, or people." },
  { path: "/recommendations", labelKey: "nav.recommendations", defaultLabel: "Recommendations", icon: Film, group: "discovery", descKey: "navDescription.recommendations", defaultDesc: "Taste-matched suggestions for your next watch." },
  { path: "/genres", labelKey: "nav.genres", defaultLabel: "Genres", icon: Layers, group: "discovery", descKey: "navDescription.genres", defaultDesc: "Browse by specific film categories." },
  { path: "/decades", labelKey: "nav.decades", defaultLabel: "Decades", icon: CalendarDays, group: "discovery", descKey: "navDescription.decades", defaultDesc: "Travel through cinema history." },
  { path: "/calendar", labelKey: "nav.calendar", defaultLabel: "Calendar", icon: CalendarDays, group: "insights", descKey: "navDescription.calendar", defaultDesc: "TV schedule and movie release tracker." },
  { path: "/stats", labelKey: "nav.stats", defaultLabel: "Stats", icon: Award, group: "insights", descKey: "navDescription.stats", defaultDesc: "Detailed analysis of your viewing habits." },
  { path: "/achievements", labelKey: "nav.achievements", defaultLabel: "Achievements", icon: Award, group: "insights", descKey: "navDescription.achievements", defaultDesc: "Trophies and milestones unlocked." },
  { path: "/quests", labelKey: "nav.quests", defaultLabel: "Monthly Quests", icon: Trophy, group: "insights", descKey: "navDescription.quests", defaultDesc: "Time-limited challenges and rewards." },
  { path: "/year-in-review", labelKey: "nav.yearInReview", defaultLabel: "Year In Review", icon: Award, group: "insights", descKey: "navDescription.yearInReview", defaultDesc: "Your personal annual wrapped recap." },
  { path: "/awards", labelKey: "nav.awards", defaultLabel: "Awards", icon: Award, group: "insights", descKey: "navDescription.awards", defaultDesc: "Browse award winners and nominees." },
];

const groupMetadata: Omit<NavigationGroup, "links">[] = [
  { id: "library", titleKey: "nav.personalLibrary", defaultTitle: "Personal Library" },
  { id: "community", titleKey: "nav.community", defaultTitle: "Community" },
  { id: "discovery", titleKey: "nav.discoveryExplore", defaultTitle: "Discovery & Explore" },
  { id: "insights", titleKey: "nav.insightsAwards", defaultTitle: "Insights & Awards" },
];

export const navigationGroups: NavigationGroup[] = groupMetadata.map((group) => ({
  ...group,
  links: routeDefinitions.filter((route) => route.group === group.id),
}));

export const primaryNavigationGroups = navigationGroups.filter((group) => group.id !== "community");
export const menuLinks = routeDefinitions;
export const mobileBottomRoutes = ["/", "/discover", "/search", "/watchlist"]
  .map((path) => routeDefinitions.find((route) => route.path === path))
  .filter((route): route is NavigationRoute => Boolean(route));

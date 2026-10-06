import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const TitleStatus = lazy(() => import("./pages/TitleStatus"));

const Search = lazy(() => import("./pages/Search"));
const Trending = lazy(() => import("./pages/Trending"));
const Details = lazy(() => import("./pages/Details"));
const Person = lazy(() => import("./pages/Person"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Watched = lazy(() => import("./pages/Watched"));
const Following = lazy(() => import("./pages/Following"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const People = lazy(() => import("./pages/People"));
const Settings = lazy(() => import("./pages/Settings"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const AccessibilitySettings = lazy(() => import("./pages/AccessibilitySettings"));
const ServiceStatus = lazy(() => import("./pages/ServiceStatus"));
const TrustCenter = lazy(() => import("./pages/TrustCenter"));
const Partnerships = lazy(() => import("./pages/Partnerships"));
const Measurement = lazy(() => import("./pages/Measurement"));
const Calendar = lazy(() => import("./pages/Calendar"));
const EnhancedStats = lazy(() => import("./pages/EnhancedStats"));
const GenreBrowser = lazy(() => import("./pages/GenreBrowser"));
const Discover = lazy(() => import("./pages/Discover"));
const MovieTracker = lazy(() => import("./pages/MovieTracker"));
const DecadeExplorer = lazy(() => import("./pages/DecadeExplorer"));
const Achievements = lazy(() => import("./pages/Achievements"));
const PrintWatchlist = lazy(() => import("./pages/PrintWatchlist"));
const AwardWinners = lazy(() => import("./pages/AwardWinners"));
const YearInReview = lazy(() => import("./pages/YearInReview"));
const Collections = lazy(() => import("./pages/Collections"));
const Quests = lazy(() => import("./pages/Quests"));

function RouteSpinner() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isLibraryRoute = ["/watchlist", "/watched", "/profile", "/stats", "/calendar"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isDetailRoute = /^\/(movie|tv|person)\//.test(pathname);
  const isHomeRoute = pathname === "/";

  if (isHomeRoute) {
    return (
      <div
        className="w-full"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">{t("common.loadingPage", "Loading page...")}</span>
        {/* Desktop & responsive Hero Spotlight skeleton */}
        <section className="w-full border-b border-border/30 bg-background" aria-busy="true">
          <div className="relative min-h-[54svh] overflow-hidden bg-card/45 skeleton-shimmer sm:min-h-[60svh] md:min-h-[550px] lg:min-h-[600px]">
            <div className="absolute inset-y-0 left-0 flex w-full max-w-[700px] flex-col justify-end p-6 sm:justify-center sm:p-8 lg:p-16">
              <div className="h-4 w-32 rounded-md skeleton-shimmer" />
              <div className="mt-5 h-8 w-4/5 rounded-md skeleton-shimmer lg:h-12" />
              <div className="mt-5 h-4 w-full rounded-md skeleton-shimmer" />
              <div className="mt-3 h-4 w-3/4 rounded-md skeleton-shimmer" />
              <div className="mt-7 h-11 w-40 rounded-full skeleton-shimmer" />
            </div>
          </div>
        </section>
        {/* Home content rail skeleton matching desktop poster aspect ratios */}
        <div className="page-container space-y-6 pb-24 pt-6 sm:pt-7 md:space-y-8 md:pb-0 md:pt-8">
          <section className="ct-panel min-h-[420px] p-4 md:min-h-[520px] md:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="h-6 w-48 rounded-md skeleton-shimmer" />
                <div className="h-4 w-72 rounded-md skeleton-shimmer" />
              </div>
              <div className="h-9 w-24 rounded-full skeleton-shimmer" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="min-w-[calc(50vw-1rem)] sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px] xl:min-w-[240px]"
                >
                  <div className="aspect-[2/3] rounded-xl border border-border/50 bg-card/50 skeleton-shimmer" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-container min-h-[calc(100dvh-4rem)] pt-24 pb-24 md:pb-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{t("common.loadingPage", "Loading page...")}</span>
      {isDetailRoute ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(13rem,20rem)_1fr] lg:items-start">
          <div className="aspect-[2/3] rounded-2xl bg-card/65 skeleton-shimmer" />
          <div className="space-y-4 pt-2">
            <div className="h-4 w-28 rounded-full skeleton-shimmer" />
            <div className="h-10 max-w-xl rounded-xl skeleton-shimmer" />
            <div className="h-4 max-w-2xl rounded-full skeleton-shimmer" />
            <div className="h-4 max-w-xl rounded-full skeleton-shimmer" />
            <div className="flex gap-3 pt-3"><div className="h-11 w-32 rounded-xl skeleton-shimmer" /><div className="h-11 w-32 rounded-xl skeleton-shimmer" /></div>
          </div>
        </div>
      ) : (
        <div className="space-y-7">
          <div className="space-y-3">
            <div className="h-3 w-24 rounded-full skeleton-shimmer" />
            <div className="h-9 w-56 rounded-xl skeleton-shimmer" />
            <div className="h-4 max-w-lg rounded-full skeleton-shimmer" />
          </div>
          <div className={isLibraryRoute ? "media-grid" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
            {Array.from({ length: isLibraryRoute ? 8 : 6 }).map((_, index) => (
              <div
                key={index}
                className={isLibraryRoute ? "aspect-[2/3] rounded-2xl bg-card/65 skeleton-shimmer" : "h-44 rounded-2xl border border-border/50 bg-card/65 skeleton-shimmer"}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export default function AppRoutes() {
  return (
    <Routes>
          <Route
            path="/"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Index />
              </Suspense>
            }
          />
          <Route
            path="/search"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Search />
              </Suspense>
            }
          />
          <Route
            path="/trending"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Trending />
              </Suspense>
            }
          />
          <Route
            path="/movie/:slug"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Details />
              </Suspense>
            }
          />
          <Route
            path="/tv/:slug"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Details />
              </Suspense>
            }
          />
          <Route
            path="/person/:slug"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Person />
              </Suspense>
            }
          />
          <Route
            path="/privacy"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Privacy />
              </Suspense>
            }
          />
          <Route
            path="/about"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <About />
              </Suspense>
            }
          />
          <Route
            path="/feedback"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Feedback />
              </Suspense>
            }
          />
          <Route
            path="/terms"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Terms />
              </Suspense>
            }
          />
          <Route
            path="/cookies"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Cookies />
              </Suspense>
            }
          />
          <Route
            path="/auth"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Auth />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            path="/signup"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Signup />
              </Suspense>
            }
          />
          <Route
            path="/auth/callback"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <AuthCallback />
              </Suspense>
            }
          />

          <Route
            path="/discover"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Discover />
              </Suspense>
            }
          />
          <Route
            path="/movie-tracker"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <MovieTracker />
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Profile />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/:userId"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <UserProfile />
              </Suspense>
            }
          />
          <Route
            path="/people"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <People />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Settings />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/watchlist"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Watchlist />
              </Suspense>
            }
          />
          <Route
            path="/collections"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Collections />
              </Suspense>
            }
          />
          <Route
            path="/collections/:collectionId"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Collections />
              </Suspense>
            }
          />
          <Route
            path="/watched"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Watched />
              </Suspense>
            }
          />
          <Route
            path="/following"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Following />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Notifications />
              </Suspense>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Recommendations />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Calendar />
              </Suspense>
            }
          />
          <Route
            path="/upcoming"
            element={<Navigate to="/calendar" replace />}
          />

          <Route
            path="/movies"
            element={<Navigate to="/search?type=movie&sort=popularity.desc" replace />}
          />

          <Route
            path="/tv"
            element={<Navigate to="/search?type=tv&sort=popularity.desc" replace />}
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <EnhancedStats />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enhanced-stats"
            element={<Navigate to="/stats" replace />}
          />
          <Route
            path="/statistics"
            element={<Navigate to="/stats" replace />}
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Achievements />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quests"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Quests />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/print-watchlist"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <PrintWatchlist />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route
            path="/genres"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <GenreBrowser />
              </Suspense>
            }
          />
          <Route
            path="/decades"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <DecadeExplorer />
              </Suspense>
            }
          />
          <Route
            path="/awards"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <AwardWinners />
              </Suspense>
            }
          />
          <Route
            path="/year-in-review"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <YearInReview />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/watch-history"
            element={<Navigate to="/watched" replace />}
          />
          <Route
            path="/accessibility"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <AccessibilitySettings />
              </Suspense>
            }
          />
          <Route
            path="/status"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <ServiceStatus />
              </Suspense>
            }
          />
          <Route
            path="/trust"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <TrustCenter />
              </Suspense>
            }
          />
          <Route
            path="/partnerships"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Partnerships />
              </Suspense>
            }
          />
          <Route
            path="/measurement"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Measurement />
              </Suspense>
            }
          />

          <Route
            path="*"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <TitleStatus />
              </Suspense>
            }
          />
        </Routes>
  );
}

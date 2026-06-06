import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import {
  Routes,
  Route,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserListsProvider } from "@/contexts/UserListsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ContentPolicyProvider } from "@/contexts/content-policy-context";
import ScrollToTop from "@/components/ScrollToTop";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import SEO from "@/components/SEO";
import { websiteJsonLd } from "@/lib/schema";
import { siteMetadata } from "@/lib/metadata";
import { applyAccessibilityPreferencesToRoot } from "@/lib/accessibility-preferences";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { trackEngagementEvent } from "@/lib/engagement";
import { UnifiedNav } from "@/components/UnifiedNav";
const KeyboardShortcuts = lazy(() => import("@/components/KeyboardShortcuts"));
const CommandPalette = lazy(() => import("@/components/CommandPalette"));
const Index = lazy(() => import("./pages/Index"));
const GlobalLoader = lazy(() =>
  import("@/components/GlobalLoader").then((mod) => ({
    default: mod.GlobalLoader,
  })),
);
const FollowNotificationMonitor = lazy(
  () =>
    import("@/components/FollowNotificationMonitor").then((mod) => ({
      default: mod.FollowNotificationMonitor,
    })),
);
const Footer = lazy(() =>
  import("@/components/Footer").then((mod) => ({ default: mod.Footer })),
);
const MobileBottomNav = lazy(() =>
  import("@/components/MobileBottomNav").then((mod) => ({
    default: mod.MobileBottomNav,
  })),
);
const CookieConsent = lazy(() =>
  import("@/components/CookieConsent").then((mod) => ({
    default: mod.CookieConsent,
  })),
);

const Auth = lazy(() => import("./pages/Auth"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Logout = lazy(() => import("./pages/Logout"));
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
const Settings = lazy(() => import("./pages/Settings"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const AccessibilitySettings = lazy(() => import("./pages/AccessibilitySettings"));
const Calendar = lazy(() => import("./pages/Calendar"));
const EnhancedStats = lazy(() => import("./pages/EnhancedStats"));
const GenreBrowser = lazy(() => import("./pages/GenreBrowser"));
const Discover = lazy(() => import("./pages/Discover"));
const DecadeExplorer = lazy(() => import("./pages/DecadeExplorer"));
const Achievements = lazy(() => import("./pages/Achievements"));
const PrintWatchlist = lazy(() => import("./pages/PrintWatchlist"));
const AwardWinners = lazy(() => import("./pages/AwardWinners"));
const YearInReview = lazy(() => import("./pages/YearInReview"));
const isVercelHost =
  typeof window !== "undefined" &&
  /(?:^|\.)vercel\.app$/i.test(window.location.hostname);
const shouldLoadVercelAnalytics =
  import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS === "true" ||
  (import.meta.env.PROD && isVercelHost);
const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((mod) => ({
    default: mod.Analytics,
  })),
);

function NetworkMonitor() {
  const { isOnline } = useNetworkStatus();
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div
      className="sticky top-0 z-[90] border-b border-primary/25 bg-primary/10 px-4 py-2 text-center text-sm text-primary backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      {t(
        "common.offlineBanner",
        "You're offline. Browsing still works, but syncing actions may be delayed.",
      )}
    </div>
  );
}

function RouteSpinner() {
  const { t } = useTranslation();

  return (
    <div
      className="page-container pt-20 flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="sr-only">{t("common.loadingPage", "Loading page...")}</span>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div key={location.pathname}>
        <Routes location={location}>
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
            path="/movie/:id/:slug?"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Details />
              </Suspense>
            }
          />
          <Route
            path="/tv/:id/:slug?"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Details />
              </Suspense>
            }
          />
          <Route
            path="/person/:id/:slug?"
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
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route
            path="/signup"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Signup />
              </Suspense>
            }
          />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route
            path="/logout"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <Logout />
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
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Watchlist />
                </Suspense>
              </ProtectedRoute>
            }
          />
          {/*
           * /watched is intentionally public — guest users can mark titles as
           * watched locally (stored in localStorage) before creating an account.
           * Authenticated users get their server-synced history. Both cases
           * are handled transparently by useUserLists / useWatchedFilters.
           */}
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
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Notifications />
                </Suspense>
              </ProtectedRoute>
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
              <ProtectedRoute>
                <Suspense fallback={<RouteSpinner />}>
                  <Calendar />
                </Suspense>
              </ProtectedRoute>
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
            path="*"
            element={
              <Suspense fallback={<RouteSpinner />}>
                <TitleStatus />
              </Suspense>
            }
          />
        </Routes>
    </div>
  );
}

const App = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { hasAcceptedConsent } = useCookieConsent();
  const [enableEnhancements, setEnableEnhancements] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const refreshableQueryKeys = new Set([
    "details",
    "trending",
    "trending-movies",
    "trending-tv",
    "popular",
    "top-rated",
    "nowPlaying",
    "airingToday",
    "videos",
    "search",
    "search-dropdown",
    "search-overlay",
    "genres",
    "genre-media",
    "watch-providers",
    "watchProviders",
    "tv-details",
    "tv-seasons",
    "season-details",
    "home-critical",
    "followed-titles-details",
    "print-watchlist",
    "recommendations",
    "continue-watching",
    "new-episodes",
  ]);

  useEffect(() => {
    applyAccessibilityPreferencesToRoot();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && !event.key.startsWith("cinetrekker_")) return;
      applyAccessibilityPreferencesToRoot();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const openAuthPrompt = () => setAuthPromptOpen(true);
    window.addEventListener(
      "cinetrekker:auth-required",
      openAuthPrompt as EventListener,
    );

    return () => {
      window.removeEventListener(
        "cinetrekker:auth-required",
        openAuthPrompt as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const handleSignOut = () => {
      queryClient.clear();
    };

    window.addEventListener("cinetrekker:sign-out", handleSignOut);
    return () => window.removeEventListener("cinetrekker:sign-out", handleSignOut);
  }, [queryClient]);

  useEffect(() => {
    let idleId: number | null = null;
    let frameId: number | null = null;

    const enable = () => setEnableEnhancements(true);

    if (typeof window !== "undefined") {
      const w = window as any;
      if ("requestIdleCallback" in w) {
        idleId = w.requestIdleCallback(enable, { timeout: 1500 });
      } else {
        frameId = w.requestAnimationFrame(enable);
      }
    }

    return () => {
      const w = window as any;
      if (idleId !== null && "cancelIdleCallback" in w) {
        w.cancelIdleCallback(idleId);
      }
      if (frameId !== null) {
        w.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    trackEngagementEvent("page_view", {
      path: location.pathname,
      hasQuery: location.search.length > 0,
    });
  }, [location.pathname, location.search]);

  const { handlers, containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const head = query.queryKey[0];
          const key = typeof head === "string" ? head : "";
          return refreshableQueryKeys.has(key);
        },
      });
    },
    threshold: 100,
    maxPull: 150,
  });

  const handleBoundaryRetry = async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const head = query.queryKey[0];
        const key = typeof head === "string" ? head : "";
        return refreshableQueryKeys.has(key);
      },
    });

    await queryClient.refetchQueries({
      type: "active",
      predicate: (query) => {
        const head = query.queryKey[0];
        const key = typeof head === "string" ? head : "";
        return refreshableQueryKeys.has(key);
      },
    });
  };

  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <ContentPolicyProvider>
            <UserListsProvider>
              <ErrorBoundary onRetry={handleBoundaryRetry}>
                {enableEnhancements && (
                  <Suspense fallback={null}>
                    <KeyboardShortcuts />
                  </Suspense>
                )}
                {enableEnhancements && (
                  <Suspense fallback={null}>
                    <CommandPalette />
                  </Suspense>
                )}
                <Sonner position="bottom-right" />
                <SEO
                  jsonLd={websiteJsonLd({
                    name: siteMetadata.siteName,
                    url: siteMetadata.canonical,
                    description: siteMetadata.description,
                  })}
                  title={siteMetadata.title}
                  description={siteMetadata.description}
                  keywords={siteMetadata.keywords}
                />
                {enableEnhancements && (
                  <Suspense fallback={null}>
                    <GlobalLoader />
                  </Suspense>
                )}
                {enableEnhancements && <NetworkMonitor />}
                {enableEnhancements && (
                  <Suspense fallback={null}>
                    <FollowNotificationMonitor />
                  </Suspense>
                )}
                <div className="ct-page-shell flex min-h-[100dvh] flex-col">
                  <UnifiedNav />
                  <ScrollToTop />
                  <main
                    id="main"
                    tabIndex={-1}
                    ref={containerRef}
                    className={`flex-1 ${
                      hasAcceptedConsent
                        ? "pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-10"
                        : "pb-[max(10rem,var(--ct-cookie-consent-offset,10rem))] md:pb-10"
                    }`}
                    {...handlers}
                  >
                    <ErrorBoundary onRetry={handleBoundaryRetry}>
                      <AnimatedRoutes />
                    </ErrorBoundary>
                  </main>
                  <Suspense fallback={null}>
                    <Footer />
                  </Suspense>
                  <Suspense fallback={null}>
                    <MobileBottomNav />
                  </Suspense>
                </div>

                <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
                  <DialogContent className="max-w-sm border-border bg-card text-card-foreground">
                    <DialogHeader>
                      <DialogTitle>
                        {t("authPrompt.title", "Create a free account to save your watchlist")}
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        {t(
                          "authPrompt.description",
                          "Save titles, mark them watched, and keep your progress synced across devices.",
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setAuthPromptOpen(false)}
                      >
                        {t("authPrompt.notNow", "Not now")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAuthPromptOpen(false);
                          navigate("/login");
                        }}
                      >
                        {t("nav.signIn", "Sign In")}
                      </Button>
                      <Button
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {
                          setAuthPromptOpen(false);
                          navigate("/signup");
                        }}
                      >
                        {t("authPrompt.createAccount", "Create Account")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </ErrorBoundary>
            </UserListsProvider>
          </ContentPolicyProvider>
        </AuthProvider>
      </TooltipProvider>
      {enableEnhancements && shouldLoadVercelAnalytics && hasAcceptedConsent && (
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <CookieConsent />
      </Suspense>
    </ThemeProvider>
  );
};

export default App;

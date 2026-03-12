import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { UserListsProvider } from "@/contexts/user-lists-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ContentPolicyProvider } from "@/contexts/content-policy-context";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import ScrollToTop from "@/components/ScrollToTop";
import { UnifiedNav } from "@/components/UnifiedNav";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalLoader } from "@/components/GlobalLoader";
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
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const TitleStatus = lazy(() => import("./pages/TitleStatus"));

const Search = lazy(() => import("./pages/Search"));
const Trending = lazy(() => import("./pages/Trending"));
const Details = lazy(() => import("./pages/Details"));
const LocationDetails = lazy(() => import("./pages/LocationDetails"));
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
const Calendar = lazy(() => import("./pages/Calendar"));
const EnhancedStats = lazy(() => import("./pages/EnhancedStats"));
const GenreBrowser = lazy(() => import("./pages/GenreBrowser"));
const DecadeExplorer = lazy(() => import("./pages/DecadeExplorer"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Collections = lazy(() => import("./pages/Collections"));
const PrintWatchlist = lazy(() => import("./pages/PrintWatchlist"));
const AwardWinners = lazy(() => import("./pages/AwardWinners"));
const YearInReview = lazy(() => import("./pages/YearInReview"));
const AccessibilitySettings = lazy(
  () => import("./pages/AccessibilitySettings"),
);
const isVercelHost =
  typeof window !== "undefined" && /(?:^|\.)vercel\.app$/i.test(window.location.hostname);
const shouldLoadVercelAnalytics =
  import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS === "true" ||
  (import.meta.env.PROD && isVercelHost);
const Analytics = shouldLoadVercelAnalytics
  ? lazy(() =>
      import("@vercel/analytics/react").then((mod) => ({
        default: mod.Analytics,
      })),
    )
  : null;

function NetworkMonitor() {
  useNetworkStatus();
  return null;
}

function RouteSpinner() {
  return (
    <div
      className="page-container pt-20 flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}

function AnimatedRoutes() {
  return (
    <div className="animate-fade-in">
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
          path="/movie/:id"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <Details />
            </Suspense>
          }
        />
        <Route
          path="/movie/:id/locations"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <LocationDetails />
            </Suspense>
          }
        />
        <Route
          path="/tv/:id"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <Details />
            </Suspense>
          }
        />
        <Route
          path="/tv/:id/locations"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <LocationDetails />
            </Suspense>
          }
        />
        <Route
          path="/person/:id"
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
        <Route
          path="/watched"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteSpinner />}>
                <Watched />
              </Suspense>
            </ProtectedRoute>
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
          path="/stats"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteSpinner />}>
                <EnhancedStats />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/enhanced-stats" element={<Navigate to="/stats" replace />} />
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
          path="/collections"
          element={
            <Suspense fallback={<RouteSpinner />}>
              <Collections />
            </Suspense>
          }
        />
        <Route path="/trek-lists" element={<Navigate to="/" replace />} />
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
        <Route path="/watch-history" element={<Navigate to="/watched" replace />} />
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
  const [enableEnhancements, setEnableEnhancements] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

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
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const enable = () => setEnableEnhancements(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(enable, 200);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const { handlers, containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries();
    },
    threshold: 100,
    maxPull: 150,
  });

  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <ContentPolicyProvider>
            <UserListsProvider>
              <ErrorBoundary>
                {enableEnhancements && <KeyboardShortcuts />}
                <Sonner position="bottom-right" />
                <SEO
                  jsonLd={websiteJsonLd({
                    name: siteMetadata.siteName,
                    url: siteMetadata.canonical,
                    description: siteMetadata.description,
                  })}
                  title={siteMetadata.title}
                  description={siteMetadata.description}
                />
                {enableEnhancements && <GlobalLoader />}
                {enableEnhancements && <NetworkMonitor />}
                <div className="flex min-h-[100dvh] flex-col">
                  <UnifiedNav />
                  <ScrollToTop />
                  <main
                    id="main"
                    tabIndex={-1}
                    ref={containerRef}
                    className="flex-1 pb-0 md:pb-10"
                    {...handlers}
                  >
                    <ErrorBoundary>
                      <AnimatedRoutes />
                    </ErrorBoundary>
                  </main>
                  <BottomNav />
                  <Footer />
                </div>

                <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
                  <DialogContent className="max-w-sm border-border bg-card text-card-foreground">
                    <DialogHeader>
                      <DialogTitle>Sign in required</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Please sign in to add titles to your watchlist.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setAuthPromptOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {
                          setAuthPromptOpen(false);
                          navigate("/login");
                        }}
                      >
                        Sign In
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </ErrorBoundary>
            </UserListsProvider>
          </ContentPolicyProvider>
        </AuthProvider>
      </TooltipProvider>
      {enableEnhancements && Analytics && (
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      )}
    </ThemeProvider>
  );
};

export default App;

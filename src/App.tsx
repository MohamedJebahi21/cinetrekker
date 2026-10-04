import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserListsProvider } from "@/contexts/UserListsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ContentPolicyProvider } from "@/contexts/content-policy-context";
import ScrollToTop from "@/components/ScrollToTop";
import { UnifiedNav } from "@/components/UnifiedNav";
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
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { UmamiAnalytics } from "@/components/UmamiAnalytics";
import { scheduleIdleTask } from "@/lib/idleCallback";
const AppRoutes = lazy(() => import("./AppRoutes"));
const KeyboardShortcuts = lazy(() => import("@/components/KeyboardShortcuts"));
const CommandPalette = lazy(() => import("@/components/CommandPalette"));
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
      className="sticky top-0 z-[90] border-b border-primary/25 bg-primary px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] text-center text-sm text-primary-foreground"
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

const App = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
    const { cancel } = scheduleIdleTask(() => setEnableEnhancements(true), {
      timeout: 1500,
    });

    return cancel;
  }, []);

  const { handlers, containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({
        predicate: (query: { queryKey: readonly unknown[] }) => {
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
      predicate: (query: { queryKey: readonly unknown[] }) => {
        const head = query.queryKey[0];
        const key = typeof head === "string" ? head : "";
        return refreshableQueryKeys.has(key);
      },
    });

    await queryClient.refetchQueries({
      type: "active",
      predicate: (query: { queryKey: readonly unknown[] }) => {
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
                <WebVitalsReporter />
                <UmamiAnalytics />
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
                  <a href="#main" className="skip-link rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    {t("common.skipToMainContent", "Skip to main content")}
                  </a>
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
                      <AppRoutes />
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
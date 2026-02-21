import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { AuthProvider } from "@/contexts/auth-context";
import { UserListsProvider } from "@/contexts/user-lists-context";
import { ThemeProvider } from "@/contexts/theme-context";
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import ScrollToTop from '@/components/ScrollToTop';
import { UnifiedNav } from "@/components/UnifiedNav";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import SEO from '@/components/SEO';
import { websiteJsonLd } from '@/lib/schema';
import { siteMetadata } from '@/lib/metadata';
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const TitleStatus = lazy(() => import("./pages/TitleStatus"));

const Search = lazy(() => import("./pages/Search"));
const Details = lazy(() => import("./pages/Details"));
const Person = lazy(() => import("./pages/Person"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Watched = lazy(() => import("./pages/Watched"));
const Following = lazy(() => import("./pages/Following"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Stats = lazy(() => import("./pages/Stats"));
const EnhancedStats = lazy(() => import("./pages/EnhancedStats"));
const GenreBrowser = lazy(() => import("./pages/GenreBrowser"));
const DecadeExplorer = lazy(() => import("./pages/DecadeExplorer"));
const AdvancedSearch = lazy(() => import("./pages/AdvancedSearch"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Collections = lazy(() => import("./pages/Collections"));
const PrintWatchlist = lazy(() => import("./pages/PrintWatchlist"));
const AwardWinners = lazy(() => import("./pages/AwardWinners"));
const YearInReview = lazy(() => import("./pages/YearInReview"));
const WatchHistory = lazy(() => import("./pages/WatchHistory"));
const AccessibilitySettings = lazy(() => import("./pages/AccessibilitySettings"));

const pageVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function NetworkMonitor() {
  useNetworkStatus();
  return null;
}

function RouteSpinner() {
  return (
    <div className="page-container pt-20 flex items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="enter" exit="exit">
        <Routes location={location}>
          <Route path="/" element={<Suspense fallback={<RouteSpinner />}><Index /></Suspense>} />
          <Route path="/search" element={<Suspense fallback={<RouteSpinner />}><Search /></Suspense>} />
          <Route path="/movie/:id" element={<Suspense fallback={<RouteSpinner />}><Details /></Suspense>} />
          <Route path="/tv/:id" element={<Suspense fallback={<RouteSpinner />}><Details /></Suspense>} />
          <Route path="/person/:id" element={<Suspense fallback={<RouteSpinner />}><Person /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<RouteSpinner />}><Privacy /></Suspense>} />
          <Route path="/about" element={<Suspense fallback={<RouteSpinner />}><About /></Suspense>} />
          <Route path="/feedback" element={<Suspense fallback={<RouteSpinner />}><Feedback /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<RouteSpinner />}><Terms /></Suspense>} />
          <Route path="/cookies" element={<Suspense fallback={<RouteSpinner />}><Cookies /></Suspense>} />
          <Route path="/auth" element={<Suspense fallback={<RouteSpinner />}><Auth /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<RouteSpinner />}><Login /></Suspense>} />
          <Route path="/signup" element={<Suspense fallback={<RouteSpinner />}><Signup /></Suspense>} />
          <Route path="/auth/callback" element={<Suspense fallback={<RouteSpinner />}><AuthCallback /></Suspense>} />
          
          <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Profile /></Suspense></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Settings /></Suspense></ProtectedRoute>} />
          <Route path="/watchlist" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Watchlist /></Suspense></ProtectedRoute>} />
          <Route path="/watched" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Watched /></Suspense></ProtectedRoute>} />
          <Route path="/following" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Following /></Suspense></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Recommendations /></Suspense></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Calendar /></Suspense></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Stats /></Suspense></ProtectedRoute>} />
          <Route path="/enhanced-stats" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><EnhancedStats /></Suspense></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><Achievements /></Suspense></ProtectedRoute>} />
          <Route path="/print-watchlist" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><PrintWatchlist /></Suspense></ProtectedRoute>} />
          
          <Route path="/genres" element={<Suspense fallback={<RouteSpinner />}><GenreBrowser /></Suspense>} />
          <Route path="/decades" element={<Suspense fallback={<RouteSpinner />}><DecadeExplorer /></Suspense>} />
          <Route path="/advanced-search" element={<Suspense fallback={<RouteSpinner />}><AdvancedSearch /></Suspense>} />
          <Route path="/collections" element={<Suspense fallback={<RouteSpinner />}><Collections /></Suspense>} />
          <Route path="/awards" element={<Suspense fallback={<RouteSpinner />}><AwardWinners /></Suspense>} />
          <Route path="/year-in-review" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><YearInReview /></Suspense></ProtectedRoute>} />
          <Route path="/watch-history" element={<ProtectedRoute><Suspense fallback={<RouteSpinner />}><WatchHistory /></Suspense></ProtectedRoute>} />
          <Route path="/accessibility" element={<Suspense fallback={<RouteSpinner />}><AccessibilitySettings /></Suspense>} />
          
          <Route path="*" element={<Suspense fallback={<RouteSpinner />}><TitleStatus /></Suspense>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => {
  const queryClient = useQueryClient();
  const { handlers, containerStyle } = usePullToRefresh({
    onRefresh: async () => { await queryClient.invalidateQueries(); },
    threshold: 100,
    maxPull: 150,
  });

  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <UserListsProvider>
            <ErrorBoundary>
              <Toaster />
              <KeyboardShortcuts />
              <Sonner position="bottom-right" />
              <SEO
                jsonLd={websiteJsonLd({
                  name: siteMetadata.siteName,
                  url: siteMetadata.canonical,
                  description: siteMetadata.description,
                })}
                title={siteMetadata.title}
                description={siteMetadata.description}
                canonical={siteMetadata.canonical}
              />
              <GlobalLoader />
              <NetworkMonitor />
              <div className="flex min-h-screen flex-col">
                <UnifiedNav />
                <ScrollToTop />
                <main id="main" tabIndex={-1} className="flex-1 pb-0" style={containerStyle} {...handlers}>
                  <ErrorBoundary>
                    <AnimatedRoutes />
                  </ErrorBoundary>
                </main>
                <Footer />
              </div>
            </ErrorBoundary>
          </UserListsProvider>
        </AuthProvider>
      </TooltipProvider>
      <Analytics />
    </ThemeProvider>
  );
};

export default App;
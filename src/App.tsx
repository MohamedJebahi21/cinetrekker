import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { useTranslation } from 'react-i18next';
import { lazy, Suspense } from 'react';
import MovieSkeleton from '@/components/ui/MovieSkeleton';
import LoadingFallback from '@/components/ui/LoadingFallback';
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
import { PageSkeleton } from "@/components/PageSkeleton";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import SEO from '@/components/SEO';
import { websiteJsonLd } from '@/lib/schema';
import { siteMetadata } from '@/lib/metadata';

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
// We import TitleStatus to handle missing routes safely
import TitleStatus from "./pages/TitleStatus";

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

const HeroSection = lazy(() => import('@/components/HeroSection'));
const MediaGrid = lazy(() => import('@/components/MediaGrid'));

const pageVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function NetworkMonitor() {
  useNetworkStatus();
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="enter" exit="exit">
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<Suspense fallback={<LoadingFallback variant="grid" count={12} />}><Search /></Suspense>} />
          <Route path="/movie/:id" element={<Suspense fallback={<LoadingFallback variant="grid" count={6} />}><Details /></Suspense>} />
          <Route path="/tv/:id" element={<Suspense fallback={<LoadingFallback variant="grid" count={6} />}><Details /></Suspense>} />
          <Route path="/person/:id" element={<Suspense fallback={<LoadingFallback variant="page" />}><Person /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<LoadingFallback variant="page" />}><Privacy /></Suspense>} />
          <Route path="/about" element={<Suspense fallback={<LoadingFallback variant="page" />}><About /></Suspense>} />
          <Route path="/feedback" element={<Suspense fallback={<LoadingFallback variant="page" />}><Feedback /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<LoadingFallback variant="page" />}><Terms /></Suspense>} />
          <Route path="/cookies" element={<Suspense fallback={<LoadingFallback variant="page" />}><Cookies /></Suspense>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<LoadingFallback variant="grid" count={8} />}><Profile /></Suspense></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Settings /></Suspense></ProtectedRoute>} />
          <Route path="/watchlist" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Watchlist /></Suspense></ProtectedRoute>} />
          <Route path="/watched" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Watched /></Suspense></ProtectedRoute>} />
          <Route path="/following" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Following /></Suspense></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><Suspense fallback={<div className="page-container pt-20"><div className="media-grid"><MovieSkeleton /></div></div>}><Recommendations /></Suspense></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Calendar /></Suspense></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><Suspense fallback={<div className="page-container pt-20"><div className="media-grid"><MovieSkeleton /></div></div>}><Stats /></Suspense></ProtectedRoute>} />
          <Route path="/enhanced-stats" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><EnhancedStats /></Suspense></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><Achievements /></Suspense></ProtectedRoute>} />
          <Route path="/print-watchlist" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><PrintWatchlist /></Suspense></ProtectedRoute>} />
          
          <Route path="/genres" element={<Suspense fallback={<LoadingFallback variant="grid" count={12} />}><GenreBrowser /></Suspense>} />
          <Route path="/decades" element={<Suspense fallback={<LoadingFallback variant="grid" count={12} />}><DecadeExplorer /></Suspense>} />
          <Route path="/advanced-search" element={<Suspense fallback={<LoadingFallback variant="grid" count={12} />}><AdvancedSearch /></Suspense>} />
          <Route path="/collections" element={<Suspense fallback={<PageSkeleton />}><Collections /></Suspense>} />
          <Route path="/awards" element={<Suspense fallback={<LoadingFallback variant="grid" count={12} />}><AwardWinners /></Suspense>} />
          <Route path="/year-in-review" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><YearInReview /></Suspense></ProtectedRoute>} />
          <Route path="/watch-history" element={<ProtectedRoute><Suspense fallback={<PageSkeleton />}><WatchHistory /></Suspense></ProtectedRoute>} />
          <Route path="/accessibility" element={<Suspense fallback={<PageSkeleton />}><AccessibilitySettings /></Suspense>} />
          
          <Route path="*" element={<TitleStatus />} />
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
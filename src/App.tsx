import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { lazy, Suspense } from 'react';
import MovieSkeleton from '@/components/ui/MovieSkeleton';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { AuthProvider } from "@/contexts/AuthContext";
import { UserListsProvider } from "@/contexts/UserListsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import ScrollToTop from '@/components/ScrollToTop';
import ScrollTopButton from '@/components/ScrollTopButton';
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalLoader } from "@/components/GlobalLoader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import SEO from '@/components/SEO';
import { websiteJsonLd } from '@/lib/schema';

// Critical pages - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Heavy pages - lazy load to reduce initial bundle
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

// Page transition variants - subtle and fast
const pageVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Network status monitor component
function NetworkMonitor() {
  useNetworkStatus();
  return null;
}

// Reusable skeleton grid used as Suspense fallback across routes
// Use LoadingFallback for Suspense fallbacks

function AnimatedRoutes() {
  const location = useLocation();
  console.log("🛣️  AnimatedRoutes rendering for path:", location.pathname);
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        <Routes location={location}>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/search" element={
            <Suspense fallback={<LoadingFallback variant="grid" count={12} />}>
              <Search />
            </Suspense>
          } />
          <Route path="/movie/:id" element={
            <Suspense fallback={<LoadingFallback variant="grid" count={6} />}>
              <Details />
            </Suspense>
          } />
          <Route path="/tv/:id" element={
            <Suspense fallback={<LoadingFallback variant="grid" count={6} />}>
              <Details />
            </Suspense>
          } />
          <Route path="/person/:id" element={
            <Suspense fallback={<LoadingFallback variant="page" />}>
              <Person />
            </Suspense>
          } />
          <Route path="/privacy" element={
            <Suspense fallback={<LoadingFallback variant="page" />}>
              <Privacy />
            </Suspense>
          } />
          <Route path="/about" element={
            <Suspense fallback={<LoadingFallback variant="page" />}>
              <About />
            </Suspense>
          } />
          <Route path="/feedback" element={
            <Suspense fallback={<LoadingFallback variant="page" />}>
              <Feedback />
            </Suspense>
          } />
          <Route path="/terms" element={
            <Suspense fallback={<LoadingFallback variant="page" />}>
              <Terms />
            </Suspense>
          } />
          <Route path="/cookies" element={
            <Suspense fallback={<LoadingFallback variant="page" />}>
              <Cookies />
            </Suspense>
          } />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingFallback variant="grid" count={8} />}>
                <Profile />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/watchlist" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <Watchlist />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/watched" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <Watched />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/following" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <Following />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/recommendations" element={
            <ProtectedRoute>
              <Suspense fallback={
                <div className="page-container pt-20">
                  <div className="media-grid">
                    <MovieSkeleton />
                  </div>
                </div>
              }>
                <Recommendations />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <Calendar />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/stats" element={
            <ProtectedRoute>
              <Suspense fallback={
                <div className="page-container pt-20">
                  <div className="media-grid">
                    <MovieSkeleton />
                  </div>
                </div>
              }>
                <Stats />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/enhanced-stats" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <EnhancedStats />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/achievements" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <Achievements />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/print-watchlist" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <PrintWatchlist />
              </Suspense>
            </ProtectedRoute>
          } />
          
          {/* Public discovery routes */}
          <Route path="/genres" element={
            <Suspense fallback={<LoadingFallback variant="grid" count={12} />}>
              <GenreBrowser />
            </Suspense>
          } />
          <Route path="/decades" element={
            <Suspense fallback={<LoadingFallback variant="grid" count={12} />}>
              <DecadeExplorer />
            </Suspense>
          } />
          <Route path="/advanced-search" element={
            <Suspense fallback={<LoadingFallback variant="grid" count={12} />}>
              <AdvancedSearch />
            </Suspense>
          } />
          <Route path="/collections" element={
            <Suspense fallback={<PageSkeleton />}>
              <Collections />
            </Suspense>
          } />
          <Route path="/awards" element={
            <Suspense fallback={<LoadingFallback variant="grid" count={12} />}>
              <AwardWinners />
            </Suspense>
          } />
          <Route path="/year-in-review" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <YearInReview />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/watch-history" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <WatchHistory />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/accessibility" element={
            <Suspense fallback={<PageSkeleton />}>
              <AccessibilitySettings />
            </Suspense>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Security: Route Protection
 * Protected routes require authentication.
 */
const App = () => {
  console.log("📱 App component is rendering...");
  console.log("🎨 Setting up providers...");
  
  try {
    return (
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <UserListsProvider>
              <ErrorBoundary>
                <Toaster />
                <KeyboardShortcuts />
                <Sonner position="bottom-right" />
                <SEO jsonLd={websiteJsonLd()} title="CineTrekker — Track Your Movies & TV Shows" description="Track movies and TV shows you love" canonical="https://cinetrekker.vercel.app" />
                <GlobalLoader />
                <NetworkMonitor />
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <ScrollToTop />
                  <ScrollTopButton />
                  <main id="main" tabIndex={-1} className="flex-1 pb-16 md:pb-0">
                    <ErrorBoundary>
                      <AnimatedRoutes />
                    </ErrorBoundary>
                  </main>
                  <BottomNav />
                  <Footer />
                </div>
              </ErrorBoundary>
            </UserListsProvider>
          </AuthProvider>
        </TooltipProvider>
        {/* Vercel Analytics */}
        <Analytics />
      </ThemeProvider>
    );
  } catch (err) {
    console.error("❌ FATAL ERROR in App component:", err);
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
        <h1 style={{ color: '#dc2626' }}>❌ App Component Error</h1>
        <pre style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', overflow: 'auto' }}>
          {err instanceof Error ? err.stack : String(err)}
        </pre>
      </div>
    );
  }
};

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { lazy, Suspense } from 'react';
import { AuthProvider } from "@/contexts/AuthContext";
import { UserListsProvider } from "@/contexts/UserListsContext";
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
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Heavy pages - lazy load to reduce initial bundle
const Search = lazy(() => import("./pages/Search"));
const Details = lazy(() => import("./pages/Details"));
const Person = lazy(() => import("./pages/Person"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Watched = lazy(() => import("./pages/Watched"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const Profile = lazy(() => import("./pages/Profile"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Stats = lazy(() => import("./pages/Stats"));

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
            <Suspense fallback={<PageSkeleton />}>
              <Search />
            </Suspense>
          } />
          <Route path="/movie/:id" element={
            <Suspense fallback={<PageSkeleton />}>
              <Details />
            </Suspense>
          } />
          <Route path="/tv/:id" element={
            <Suspense fallback={<PageSkeleton />}>
              <Details />
            </Suspense>
          } />
          <Route path="/person/:id" element={
            <Suspense fallback={<PageSkeleton />}>
              <Person />
            </Suspense>
          } />
          <Route path="/privacy" element={
            <Suspense fallback={<PageSkeleton />}>
              <Privacy />
            </Suspense>
          } />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
                <Profile />
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
          <Route path="/recommendations" element={
            <ProtectedRoute>
              <Suspense fallback={<PageSkeleton />}>
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
              <Suspense fallback={<PageSkeleton />}>
                <Stats />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Security: Route Protection
 * Protected routes require authentication and email verification.
 */
const App = () => {
  console.log("📱 App component is rendering...");
  console.log("🎨 Setting up providers...");
  
  try {
    return (
      <>
        <TooltipProvider>
          <AuthProvider>
            <UserListsProvider>
              <ErrorBoundary>
              <Toaster />
              <Sonner position="bottom-right" />
              <SEO jsonLd={websiteJsonLd()} title="CineTrekker — Track Your Movies & TV Shows" description="Track movies and TV shows you love" canonical="https://cinetrekker.lovable.app" />
              <BrowserRouter>
                <GlobalLoader />
                <NetworkMonitor />
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1 pb-16 md:pb-0">
                    <ErrorBoundary>
                      <AnimatedRoutes />
                    </ErrorBoundary>
                  </main>
                  <BottomNav />
                  <Footer />
                </div>
              </BrowserRouter>
            </ErrorBoundary>
          </UserListsProvider>
        </AuthProvider>
      </TooltipProvider>
      
      {/* Vercel Analytics */}
      <Analytics />
    </>
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

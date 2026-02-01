import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserListsProvider } from "@/contexts/UserListsContext";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Details from "./pages/Details";
import Person from "./pages/Person";
import Watchlist from "./pages/Watchlist";
import Watched from "./pages/Watched";
import Recommendations from "./pages/Recommendations";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Calendar from "./pages/Calendar";
import Stats from "./pages/Stats";
import NotFound from "./pages/NotFound";
import SEO from '@/components/SEO';
import { websiteJsonLd } from '@/lib/schema';

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
          <Route path="/search" element={<Search />} />
          <Route path="/movie/:id" element={<Details />} />
          <Route path="/tv/:id" element={<Details />} />
          <Route path="/person/:id" element={<Person />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected routes */}
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/watchlist" element={
            <ProtectedRoute><Watchlist /></ProtectedRoute>
          } />
          <Route path="/watched" element={
            <ProtectedRoute><Watched /></ProtectedRoute>
          } />
          <Route path="/recommendations" element={
            <ProtectedRoute><Recommendations /></ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute><Calendar /></ProtectedRoute>
          } />
          <Route path="/stats" element={
            <ProtectedRoute><Stats /></ProtectedRoute>
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

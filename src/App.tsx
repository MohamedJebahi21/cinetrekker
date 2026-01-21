import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserListsProvider } from "@/contexts/UserListsContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import Calendar from "./pages/Calendar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Security: Route Protection
 * 
 * Protected routes require authentication and email verification.
 * Public routes are accessible without authentication.
 * 
 * Protected: /profile, /watchlist, /watched, /recommendations, /calendar
 * Public: /, /search, /movie/:id, /tv/:id, /person/:id, /privacy, /auth
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UserListsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/movie/:id" element={<Details />} />
                  <Route path="/tv/:id" element={<Details />} />
                  <Route path="/person/:id" element={<Person />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Protected routes - require authentication and email verification */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/watchlist" element={
                    <ProtectedRoute>
                      <Watchlist />
                    </ProtectedRoute>
                  } />
                  <Route path="/watched" element={
                    <ProtectedRoute>
                      <Watched />
                    </ProtectedRoute>
                  } />
                  <Route path="/recommendations" element={
                    <ProtectedRoute>
                      <Recommendations />
                    </ProtectedRoute>
                  } />
                  <Route path="/calendar" element={
                    <ProtectedRoute>
                      <Calendar />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </UserListsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

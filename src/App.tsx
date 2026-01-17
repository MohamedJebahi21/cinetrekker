import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserListsProvider } from "@/contexts/UserListsContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
                  <Route path="/" element={<Index />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/movie/:id" element={<Details />} />
                  <Route path="/tv/:id" element={<Details />} />
                  <Route path="/person/:id" element={<Person />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/watched" element={<Watched />} />
                  <Route path="/recommendations" element={<Recommendations />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/auth" element={<Auth />} />
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

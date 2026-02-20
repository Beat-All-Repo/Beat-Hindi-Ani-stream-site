import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import VerificationGate from "@/components/VerificationGate";
import Index from "./pages/Index";
import AnimeDetail from "./pages/AnimeDetail";
import Watch from "./pages/Watch";
import SearchPage from "./pages/SearchPage";
import GenrePage from "./pages/GenrePage";
import AuthPage from "./pages/AuthPage";
import OwnerPanel from "./pages/OwnerPanel";
import VerifyPage from "./pages/VerifyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/owner" element={<OwnerPanel />} />
            <Route path="/" element={<VerificationGate><Index /></VerificationGate>} />
            <Route path="/anime/:name" element={<VerificationGate><AnimeDetail /></VerificationGate>} />
            <Route path="/watch/:name/:episode" element={<VerificationGate><Watch /></VerificationGate>} />
            <Route path="/search" element={<VerificationGate><SearchPage /></VerificationGate>} />
            <Route path="/genre/:genre" element={<VerificationGate><GenrePage /></VerificationGate>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

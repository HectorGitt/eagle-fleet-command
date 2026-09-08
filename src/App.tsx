import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FleetProvider } from "@/context/FleetContext";
import Index from "./pages/Index";
import FleetOverview from "./pages/FleetOverview";
import MaintenanceAI from "./pages/MaintenanceAI";
import FuelAnalytics from "./pages/FuelAnalytics";
import Scheduling from "./pages/Scheduling";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* next-themes was already a dependency and sonner.tsx already called
        useTheme(), but no provider was ever mounted - so the theme was stuck
        and the toasts never matched the shell. */}
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FleetProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<FleetOverview />} />
              <Route path="/live-map" element={<Index />} />
              <Route path="/maintenance" element={<MaintenanceAI />} />
              <Route path="/fuel-analytics" element={<FuelAnalytics />} />
              <Route path="/scheduling" element={<Scheduling />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </FleetProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

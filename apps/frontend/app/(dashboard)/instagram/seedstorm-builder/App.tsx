import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import Navigation from "../components/Navigation";

// Import project guard to verify integrity on app start
import "@/lib/projectGuard";

// Pages
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import CreatorDatabase from "./pages/CreatorDatabase";
import CampaignBuilder from "./pages/CampaignBuilder";
import CampaignHistory from "./pages/CampaignHistory";
import ClientDashboard from "./pages/ClientDashboard";
import QualityAssurance from "./pages/QualityAssurance";
import WorkflowManagement from "./pages/WorkflowManagement";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthSyncGate from "./components/AuthSyncGate";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <AuthSyncGate>
                      <Navigation />
                      <HomePage />
                    </AuthSyncGate>
                  </ProtectedRoute>
                } />
                <Route path="/creators" element={
                  <ProtectedRoute>
                    <AuthSyncGate>
                      <Navigation />
                      <CreatorDatabase />
                    </AuthSyncGate>
                  </ProtectedRoute>
                } />
                <Route path="/campaign-builder" element={
                  <ProtectedRoute>
                    <AuthSyncGate>
                      <Navigation />
                      <CampaignBuilder />
                    </AuthSyncGate>
                  </ProtectedRoute>
                } />
                <Route path="/campaigns" element={
                  <ProtectedRoute>
                    <AuthSyncGate>
                      <Navigation />
                      <CampaignHistory />
                    </AuthSyncGate>
                  </ProtectedRoute>
                } />
                <Route path="/qa" element={
                  <ProtectedRoute>
                    <AuthSyncGate>
                      <Navigation />
                      <QualityAssurance />
                    </AuthSyncGate>
                  </ProtectedRoute>
                } />
                <Route path="/workflow" element={
                  <ProtectedRoute>
                    <AuthSyncGate>
                      <Navigation />
                      <WorkflowManagement />
                    </AuthSyncGate>
                  </ProtectedRoute>
                } />
                <Route path="/client/:campaignToken" element={<ClientDashboard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

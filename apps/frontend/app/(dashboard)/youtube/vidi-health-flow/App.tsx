import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import Help from "./pages/Help";
import CampaignIntake from "./pages/CampaignIntake";
import CampaignDetail from "./pages/CampaignDetail";
import Campaigns from "./pages/Campaigns";
import Clients from "./pages/Clients";
import VendorPayments from "./pages/VendorPayments";
import Users from "./pages/Users";
import SystemHealth from "./pages/SystemHealth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Index />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/help" element={
              <ProtectedRoute>
                <AppLayout>
                  <Help />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/campaign-intake" element={
              <ProtectedRoute requiredRole="manager">
                <AppLayout>
                  <CampaignIntake />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/campaigns" element={
              <ProtectedRoute>
                <AppLayout>
                  <Campaigns />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/campaigns/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <CampaignDetail />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute>
                <AppLayout>
                  <Clients />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/vendor-payments" element={
              <ProtectedRoute requiredRole="manager">
                <AppLayout>
                  <VendorPayments />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout>
                  <Users />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/system-health" element={
              <ProtectedRoute requiredRole="admin">
                <AppLayout>
                  <SystemHealth />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
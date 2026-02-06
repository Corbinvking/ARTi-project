import { Toaster } from "./ui/toaster";
import { Toaster as Sonner } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GuidedTour } from "./components/HelpSystem";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { UserManager } from "./components/UserManager";
import Index from "./pages/Index";
import PlaylistsPage from "./pages/PlaylistsPage";
import CampaignBuilder from "./pages/CampaignBuilder";
import CampaignHistoryPage from "./pages/CampaignHistoryPage";
import CampaignSubmissionsPage from "./pages/CampaignSubmissionsPage";
import ClientsPage from "./pages/ClientsPage";
import CampaignIntakePage from "./pages/CampaignIntakePage";
import AuthPage from "./pages/AuthPage";
import SalespersonDashboard from "./pages/SalespersonDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import VendorPlaylistsPage from "./pages/VendorPlaylistsPage";
import VendorRequestsPage from "./pages/VendorRequestsPage";
import MLDashboardPage from "./pages/MLDashboardPage";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/campaign-intake" element={<CampaignIntakePage />} />
            
            {/* Protected routes for admin/manager/operator */}
            <Route path="/" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']}>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout>
                  <UserManager />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/playlists" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']}>
                <PlaylistsPage />
              </ProtectedRoute>
            } />
            <Route path="/campaign/new" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']}>
                <CampaignBuilder />
              </ProtectedRoute>
            } />
            <Route path="/campaign-builder/review/:submissionId" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']}>
                <CampaignBuilder />
              </ProtectedRoute>
            } />
            <Route path="/campaign/edit/:campaignId" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']}>
                <CampaignBuilder />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator', 'salesperson']}>
                <ClientsPage />
              </ProtectedRoute>
            } />
            <Route path="/campaigns" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator', 'salesperson']}>
                <CampaignHistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/submissions" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']}>
                <CampaignSubmissionsPage />
              </ProtectedRoute>
            } />
            <Route path="/ml-dashboard" element={
              <ProtectedRoute requiredRoles={['admin', 'manager', 'operator']}>
                <MLDashboardPage />
              </ProtectedRoute>
            } />
            
            {/* Salesperson dashboard */}
            <Route path="/salesperson" element={
              <ProtectedRoute requiredRoles={['salesperson']}>
                <SalespersonDashboard />
              </ProtectedRoute>
            } />
            
            {/* Vendor portal */}
            <Route path="/vendor" element={
              <ProtectedRoute requiredRoles={['vendor']}>
                <VendorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/vendor/playlists" element={
              <ProtectedRoute requiredRoles={['vendor']}>
                <VendorPlaylistsPage />
              </ProtectedRoute>
            } />
            <Route path="/vendor/requests" element={
              <ProtectedRoute requiredRoles={['vendor']}>
                <VendorRequestsPage />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          <GuidedTour />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;








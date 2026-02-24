// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

// Public pages
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ResetPassword from "@/pages/auth/ResetPassword";

// Protected pages
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Automations from "@/pages/Automations";
import Analytics from "@/pages/Analytics";
import WhatsAppIntegration from "@/pages/WhatsAppIntegration";
import TeamManagement from "@/pages/TeamManagement";
import NotificationsCenter from "@/pages/NotificationsCenter";
import SettingsPage from "@/pages/Settings";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/auth/ForgotPassword";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ErrorBoundary>
                        <Dashboard />
                      </ErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/leads"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ErrorBoundary>
                        <Leads />
                      </ErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/automations"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ErrorBoundary>
                        <Automations />
                      </ErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ErrorBoundary>
                        <Analytics />
                      </ErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/whatsapp"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ErrorBoundary>
                        <WhatsAppIntegration />
                      </ErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/team"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ErrorBoundary>
                        <TeamManagement />
                      </ErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ErrorBoundary>
                        <NotificationsCenter />
                      </ErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ErrorBoundary>
                        <SettingsPage />
                      </ErrorBoundary>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </LanguageProvider>
  );
};

export default App;
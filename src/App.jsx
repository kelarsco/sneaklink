import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { FloatingActivityCenter } from "@/components/FloatingActivityCenter";
import NavigationLoader from "@/components/NavigationLoader";
import Homepage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import EmailVerification from "./pages/EmailVerification";
import Account from "./pages/Account";
import Payment from "./pages/Payment";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import NotFound from "./pages/NotFound";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import StaffAcceptInvite from "./pages/StaffAcceptInvite";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <NavigationLoader>
              <AuthProvider>
                <Toaster />
                <Sonner />
                <FloatingActivityCenter />
                <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/account" 
                  element={
                    <ProtectedRoute>
                      <Account />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/payment" 
                  element={
                    <ProtectedRoute>
                      <Payment />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                
                {/* Staff Routes */}
                <Route path="/staff/accept-invite" element={<StaffAcceptInvite />} />
                
                {/* Admin Routes */}
                <Route path="/manager/login" element={<AdminLogin />} />
                <Route 
                  path="/manager" 
                  element={
                    <AdminProtectedRoute>
                      <DashboardLayout>
                        <AdminOverview />
                      </DashboardLayout>
                    </AdminProtectedRoute>
                  } 
                />
                <Route 
                  path="/manager/users" 
                  element={
                    <AdminProtectedRoute>
                      <DashboardLayout>
                        <AdminUsers />
                      </DashboardLayout>
                    </AdminProtectedRoute>
                  } 
                />
                <Route 
                  path="/manager/support" 
                  element={
                    <AdminProtectedRoute>
                      <DashboardLayout>
                        <AdminSupport />
                      </DashboardLayout>
                    </AdminProtectedRoute>
                  } 
                />
                <Route 
                  path="/manager/staff" 
                  element={
                    <AdminProtectedRoute>
                      <DashboardLayout>
                        <AdminStaff />
                      </DashboardLayout>
                    </AdminProtectedRoute>
                  } 
                />
                <Route 
                  path="/manager/subscriptions" 
                  element={
                    <AdminProtectedRoute>
                      <DashboardLayout>
                        <AdminSubscriptions />
                      </DashboardLayout>
                    </AdminProtectedRoute>
                  } 
                />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </NavigationLoader>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;


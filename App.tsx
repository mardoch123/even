
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { SearchPage } from './pages/SearchPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ClientDashboard } from './pages/ClientDashboard';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { ProviderProfilePage } from './pages/ProviderProfilePage';
import { ProviderPromotePage } from './pages/ProviderPromotePage';
import { MessagesPage } from './pages/MessagesPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { EventsPage } from './pages/EventsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { WalletPage } from './pages/WalletPage';
import { StripePaymentPage } from './pages/StripePaymentPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { StaticPage } from './pages/StaticPage';
import { PricingPage } from './pages/PricingPage';
import { ContactSalesPage } from './pages/ContactSalesPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { TestimonialsPage } from './pages/TestimonialsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { OfflineBlockerPage } from './pages/OfflineBlockerPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { OrdersPage } from './pages/OrdersPage';
import { SmartAssistant } from './components/SmartAssistant';
import { AuthProvider } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ConnectivityProvider, useConnectivity } from './contexts/ConnectivityContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';

// Admin Components
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminModeration } from './pages/admin/AdminModeration';
import { AdminEvents } from './pages/admin/AdminEvents';
import { AdminSubscriptions } from './pages/admin/AdminSubscriptions';
import { AdminContent } from './pages/admin/AdminContent';
import { AdminAds } from './pages/admin/AdminAds';

const ConnectivityManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline, isSyncing, pendingActions } = useConnectivity();

  // THRESHOLD: If more than 2 actions are pending, block the UI to prevent conflicts
  if (!isOnline && pendingActions.length > 2) {
      return <OfflineBlockerPage />;
  }

  return (
    <>
        {/* Soft Banner for minor offline state */}
        {(!isOnline || isSyncing || pendingActions.length > 0) && (
            <div className={`fixed bottom-0 left-0 right-0 z-[100] px-4 py-3 shadow-lg transition-all duration-500 transform translate-y-0 flex items-center justify-center gap-3 ${
            !isOnline ? 'bg-gray-900 text-white' : 'bg-green-600 text-white'
            }`}>
            {!isOnline ? (
                <>
                <WifiOff size={18} className="animate-pulse" />
                <span className="font-medium text-sm">
                    Vous êtes hors ligne. 
                    {pendingActions.length > 0 ? (
                    <span className="ml-1 font-bold text-yellow-400">{pendingActions.length} action(s) en attente.</span>
                    ) : (
                    " Mode lecture seule."
                    )}
                </span>
                </>
            ) : (
                <>
                <RefreshCw size={18} className="animate-spin" />
                <span className="font-medium text-sm">Connexion rétablie. Synchronisation de {pendingActions.length} éléments...</span>
                </>
            )}
            </div>
        )}
        {children}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConnectivityProvider>
          <CurrencyProvider>
            <LanguageProvider>
              <HashRouter>
                <div className="min-h-screen flex flex-col font-sans text-eveneo-dark">
                  <ConnectivityManager>
                      <Routes>
                        {/* Admin Routes (Protected) */}
                        <Route path="/admin" element={
                          <ProtectedRoute requiredRole={UserRole.ADMIN}>
                            <AdminLayout />
                          </ProtectedRoute>
                        }>
                          <Route index element={<AdminDashboard />} />
                          <Route path="dashboard" element={<AdminDashboard />} />
                          <Route path="users" element={<AdminUsers />} />
                          <Route path="moderation" element={<AdminModeration />} />
                          <Route path="events" element={<AdminEvents />} />
                          <Route path="subscriptions" element={<AdminSubscriptions />} />
                          <Route path="content" element={<AdminContent />} />
                          <Route path="ads" element={<AdminAds />} />
                        </Route>

                        {/* Standard App Routes */}
                        <Route path="*" element={
                          <>
                            <Navbar />
                            <main className="flex-grow relative">
                              <Routes>
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/onboarding" element={<OnboardingPage />} />
                                
                                {/* Dedicated Public Pages */}
                                <Route path="/pricing" element={<PricingPage />} />
                                <Route path="/contact-sales" element={<ContactSalesPage />} />
                                <Route path="/how-it-works" element={<HowItWorksPage />} />
                                <Route path="/testimonials" element={<TestimonialsPage />} />
                                
                                {/* Static Pages */}
                                <Route path="/page/:type" element={<StaticPage />} />
                                
                                {/* Public Provider Profile */}
                                <Route path="/provider/:id" element={<ProviderProfilePage />} />
                                <Route path="/provider/:id/reviews" element={<ReviewsPage />} />
                                
                                {/* Secured Client Routes */}
                                <Route path="/dashboard/client" element={
                                  <ProtectedRoute requiredRole={UserRole.CLIENT}>
                                    <ClientDashboard />
                                  </ProtectedRoute>
                                } />
                                
                                {/* Secured Provider Routes */}
                                <Route path="/dashboard/provider" element={
                                  <ProtectedRoute requiredRole={UserRole.PROVIDER}>
                                    <ProviderDashboard />
                                  </ProtectedRoute>
                                } />
                                <Route path="/promote" element={
                                  <ProtectedRoute requiredRole={UserRole.PROVIDER}>
                                    <ProviderPromotePage />
                                  </ProtectedRoute>
                                } />

                                {/* Shared Secured Routes */}
                                <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
                                <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                                <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                                <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                                <Route path="/event/:id" element={<ProtectedRoute><EventDetailsPage /></ProtectedRoute>} />
                                <Route path="/checkout/:id" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                                <Route path="/portfolio" element={<ProtectedRoute requiredRole={UserRole.PROVIDER}><PortfolioPage /></ProtectedRoute>} />
                                <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                                <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
                                <Route path="/payment/stripe" element={<ProtectedRoute><StripePaymentPage /></ProtectedRoute>} />
                              </Routes>
                              {/* Floating Smart Assistant available on all standard pages */}
                              <SmartAssistant />
                            </main>
                            <Footer />
                          </>
                        } />
                      </Routes>
                  </ConnectivityManager>
                </div>
              </HashRouter>
            </LanguageProvider>
          </CurrencyProvider>
        </ConnectivityProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;

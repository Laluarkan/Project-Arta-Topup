import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

// LandingPage dimuat langsung (bukan lazy) karena ini halaman pertama yang dilihat
// pengguna (route "/"), jadi tidak perlu menunggu chunk terpisah + loading fallback.
import LandingPage from './pages/LandingPage';

// Semua halaman lain di-lazy-load per route supaya bundle awal jauh lebih kecil
// (mengatasi temuan PageSpeed "Kurangi JavaScript yang tidak digunakan").
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const DetailPage = lazy(() => import('./pages/DetailPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailNoticePage = lazy(() => import('./pages/VerifyEmailNoticePage'));
const WalletTopupPage = lazy(() => import('./pages/WalletTopupPage'));
const WalletHistoryPage = lazy(() => import('./pages/WalletHistoryPage'));
const VerifyEmailProcessPage = lazy(() => import('./pages/VerifyEmailProcessPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TicketPage = lazy(() => import('./pages/TicketPage'));
const PromoPage = lazy(() => import('./pages/PromoPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

const AdminWalletTopup = lazy(() => import('./pages/admin/AdminWalletTopup'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProduct = lazy(() => import('./pages/admin/AdminProduct'));
const AdminTransaction = lazy(() => import('./pages/admin/AdminTransaction'));
const AdminUser = lazy(() => import('./pages/admin/AdminUser'));
const AdminPromo = lazy(() => import('./pages/admin/AdminPromo'));
const AdminTicket = lazy(() => import('./pages/admin/AdminTicket'));
const AdminAuditLog = lazy(() => import('./pages/admin/AdminAuditLog'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminCategory = lazy(() => import('./pages/admin/AdminCategory'));

function RouteFallback() {
  return (
    <div className="w-full min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  // Layout h-screen+overflow-hidden HANYA untuk panel admin (sidebar tetap, konten yang scroll).
  // Halaman biasa pakai scroll dokumen normal, supaya tidak ke-clip di layar pendek/mobile.
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className={isAdminRoute ? 'flex h-screen overflow-hidden bg-white' : ''}>
      <main>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/categories" element={<CategoryPage />} />
        <Route path="/detail/:id" element={<DetailPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email-notice" element={<VerifyEmailNoticePage />} />
        <Route path="/wallet/topup" element={<ProtectedRoute><WalletTopupPage /></ProtectedRoute>} />
        <Route path="/wallet/history" element={<ProtectedRoute><WalletHistoryPage /></ProtectedRoute>} />
        <Route path="/admin/wallet-topups" element={<AdminRoute><AdminWalletTopup /></AdminRoute>} />
        <Route path="/verify-email/:id/:hash" element={<VerifyEmailProcessPage />} />
        <Route path="/status/:id" element={<StatusPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/tickets" element={<TicketPage />} />
        <Route path="/promo" element={<PromoPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><AdminCategory /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProduct /></AdminRoute>} />
        <Route path="/admin/transactions" element={<AdminRoute><AdminTransaction /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUser /></AdminRoute>} />
        <Route path="/admin/vouchers" element={<AdminRoute><AdminPromo /></AdminRoute>} />
        <Route path="/admin/tickets" element={<AdminRoute><AdminTicket /></AdminRoute>} />
        <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLog /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
      </Routes>
      </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

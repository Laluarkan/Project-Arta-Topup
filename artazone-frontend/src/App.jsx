import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CategoryPage from './pages/CategoryPage';
import DetailPage from './pages/DetailPage';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailNoticePage from './pages/VerifyEmailNoticePage';
import WalletTopupPage from './pages/WalletTopupPage';
import WalletHistoryPage from './pages/WalletHistoryPage';
import AdminWalletTopup from './pages/admin/AdminWalletTopup';
import VerifyEmailProcessPage from './pages/VerifyEmailProcessPage';
import StatusPage from './pages/StatusPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import TicketPage from './pages/TicketPage';
import PromoPage from './pages/PromoPage';
import HelpPage from './pages/HelpPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProduct from './pages/admin/AdminProduct';
import AdminTransaction from './pages/admin/AdminTransaction';
import AdminUser from './pages/admin/AdminUser';
import AdminPromo from './pages/admin/AdminPromo';
import AdminTicket from './pages/admin/AdminTicket';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminSettings from './pages/admin/AdminSettings';
import AdminCategory from './pages/admin/AdminCategory';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-white">
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
      </div>
    </Router>
  );
}

export default App;
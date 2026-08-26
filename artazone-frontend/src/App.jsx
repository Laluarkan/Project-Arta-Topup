import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CategoryPage from './pages/CategoryPage';
import DetailPage from './pages/DetailPage';
import AuthPage from './pages/AuthPage';
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

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/status/:id" element={<StatusPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/tickets" element={<TicketPage />} />
          <Route path="/promo" element={<PromoPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/categories" element={<AdminCategory />} />
          <Route path="/admin/products" element={<AdminProduct />} />
          <Route path="/admin/transactions" element={<AdminTransaction />} />
          <Route path="/admin/users" element={<AdminUser />} />
          <Route path="/admin/vouchers" element={<AdminPromo />} />
          <Route path="/admin/tickets" element={<AdminTicket />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLog />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
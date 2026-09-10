/* eslint-disable no-useless-assignment */
/* eslint-disable no-unused-vars */
import { Navigate } from 'react-router-dom';

/**
 * Bungkus route yang WAJIB login (user biasa maupun admin).
 * Kalau tidak ada token, redirect ke /auth.
 */
export function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

/**
 * Bungkus route khusus admin (/admin/*).
 * Wajib login DAN rolenya admin/super-admin.
 *
 * Catatan: ini cuma pengaman di sisi tampilan (UX), bukan satu-satunya lapisan
 * keamanan. Perlindungan yang sesungguhnya tetap di backend lewat middleware
 * role:super-admin|admin pada setiap endpoint /api/admin/*. Jadi walaupun
 * seseorang berhasil mengakali guard ini, API tetap menolak requestnya.
 */
export function AdminRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    user = null;
  }

  const roleNames = (user?.roles || []).map(r => r.name);
  const isAdmin = roleNames.includes('admin') || roleNames.includes('super-admin');

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
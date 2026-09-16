import { Link, useLocation } from 'react-router-dom';

export default function AdminSidebar() {
  const location = useLocation();

  const menuItems = [
    { name: 'Admin Dashboard', path: '/admin/dashboard' },
    { name: 'Rekonsiliasi Keuangan', path: '/admin/reconciliation' },
    { name: 'Managemen Kategory', path: '/admin/categories' },
    { name: 'Manajemen Produk', path: '/admin/products' },
    { name: 'Manajemen Transaksi', path: '/admin/transactions' },
    { name: 'Review Top Up Manual', path: '/admin/wallet-topups' },
    { name: 'Manajemen User', path: '/admin/users' },
    { name: 'Voucher & Promo', path: '/admin/vouchers' },
    { name: 'Komplain (CS)', path: '/admin/tickets' },
    { name: 'Audit Log', path: '/admin/audit-logs' },
    { name: 'Pengaturan Sistem', path: '/admin/settings' },
  ];

  return (
    <div className="w-64 bg-ink text-white h-screen flex flex-col shrink-0 overflow-y-auto">
      <div className="p-6">
        <Link to="/" className="font-display font-700 text-2xl text-white">
          ArTa<span className="text-gold-400">Zone</span>
        </Link>
        <p className="text-xs text-white/50 mt-1">Admin Panel</p>
      </div>

      <div className="flex-1 px-4 pb-6 space-y-1">
        <p className="text-[10px] font-bold text-white/40 tracking-widest mb-3 ml-2 mt-4">ADMIN</p>
        {menuItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`block px-4 py-3 text-sm font-bold rounded-lg transition-colors ${
              location.pathname === item.path 
                ? 'bg-gold-400 text-ink' 
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
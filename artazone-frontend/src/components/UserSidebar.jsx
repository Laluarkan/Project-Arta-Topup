import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

export default function UserSidebar() {
  const [balance, setBalance] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    axios.get('https://artazone-api.onrender.com/api/user', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setBalance(res.data.balance))
      .catch(() => {});
  }, [token]);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Riwayat Saldo', path: '/wallet/history' },
    { name: 'Tiket Komplain', path: '/tickets' },
    { name: 'Pengaturan Profil', path: '/settings' },
  ];

  return (
    <div className="lg:col-span-1 space-y-2">
      <div className="card p-5 mb-6 bg-violet-50 border-violet-200">
        <p className="text-xs text-ink/50 font-bold mb-1">Total Saldo</p>
        <p className="font-display font-700 text-2xl text-violet-700">
          {balance === null ? '...' : formatRupiah(balance)}
        </p>
        <button onClick={() => navigate('/wallet/topup')} className="btn-accent w-full py-2 text-xs mt-3">
          + Isi Saldo
        </button>
      </div>

      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`block w-full text-left px-4 py-3 text-sm font-bold rounded-lg ${
            location.pathname === item.path ? 'bg-ink text-white' : 'text-ink/60 hover:bg-ink/5'
          }`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
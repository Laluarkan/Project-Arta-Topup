import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import UserSidebar from '../components/UserSidebar';

const formatRupiah = (num) => 'Rp' + Number(num || 0).toLocaleString('id-ID');

const TYPE_LABEL = {
  topup: { label: 'Isi Saldo', color: 'text-green-600', sign: '+' },
  deduction: { label: 'Checkout', color: 'text-red-600', sign: '-' },
  refund: { label: 'Refund', color: 'text-green-600', sign: '+' },
};

export default function WalletHistoryPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }

    axios.get(`https://artazone-api.onrender.com/api/user/wallet-transactions?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (res.data.status === 'success') {
        setItems(res.data.data.data || []);
        setLastPage(res.data.data.last_page || 1);
      }
    }).finally(() => setIsLoading(false));
  }, [token, navigate, page]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="flex-1 max-w-6xl w-full mx-auto p-8 grid lg:grid-cols-4 gap-8">
        <UserSidebar />

        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-700">Riwayat Saldo</h1>
            <Link to="/wallet/topup" className="btn-accent px-4 py-2 text-xs">+ Isi Saldo</Link>
          </div>

          {isLoading ? (
            <p className="text-sm text-ink/50">Memuat...</p>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-ink/50">Belum ada riwayat mutasi saldo.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const meta = TYPE_LABEL[item.type] || { label: item.type, color: 'text-ink', sign: '' };
                return (
                  <div key={item.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink">{meta.label}</p>
                      <p className="text-xs text-ink/50">{new Date(item.created_at).toLocaleString('id-ID')}</p>
                      <p className="text-xs text-ink/40">Ref: {item.reference_id}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${meta.color}`}>{meta.sign}{formatRupiah(item.amount)}</p>
                      <p className="text-xs text-ink/40">Saldo: {formatRupiah(item.balance_after)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lastPage > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost px-4 py-2 text-xs disabled:opacity-30">← Sebelumnya</button>
              <span className="text-xs text-ink/50 py-2">Halaman {page} dari {lastPage}</span>
              <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)} className="btn-ghost px-4 py-2 text-xs disabled:opacity-30">Selanjutnya →</button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
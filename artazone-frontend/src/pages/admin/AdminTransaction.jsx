/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminTransaction() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchTransactions = () => {
    axios.get('http://127.0.0.1:8000/api/admin/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setTransactions(res.data.data))
    .catch(err => console.error(err))
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchTransactions();
  }, [navigate, token]);

  const handleUpdateStatus = async (id, newStatus) => {
    if (!window.confirm(`PERINGATAN: Memaksa ubah status transaksi menjadi ${newStatus}? (Jika FAILED, saldo pembeli akan otomatis di-refund).`)) return;
    
    try {
      await axios.put(`http://127.0.0.1:8000/api/admin/transactions/${id}/status`, 
        { status: newStatus }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTransactions();
      alert(`Status berhasil diubah menjadi ${newStatus}`);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Terjadi kesalahan sistem. Gagal memperbarui status.');
    }
  };

  const handleRetryTopup = async (id) => {
    if (!window.confirm(`Proses ulang transaksi ini ke Server Digiflazz? (Pastikan saldo modal Anda cukup).`)) return;
    
    try {
      alert('Sedang memproses ulang ke Digiflazz...');
      await axios.post(`http://127.0.0.1:8000/api/admin/transactions/${id}/retry`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTransactions();
      alert('Perintah Retry terkirim. Silakan periksa statusnya dalam beberapa detik.');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Gagal memproses ulang. Terjadi kesalahan sistem.');
    }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'SUCCESS': return <span className="bg-ink text-gold-400 text-[10px] font-bold px-2 py-1 rounded-md">SUKSES</span>;
      case 'PAID': return <span className="bg-blue-100 border-2 border-blue-700 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md">DIPROSES</span>;
      case 'PENDING': return <span className="bg-white border-2 border-ink text-ink text-[10px] font-bold px-2 py-1 rounded-md">PENDING</span>;
      case 'FAILED': return <span className="bg-red-100 border-2 border-red-700 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md">GAGAL</span>;
      default: return <span className="bg-ink/10 text-ink text-[10px] font-bold px-2 py-1 rounded-md">{status}</span>;
    }
  };

  const filteredTransactions = transactions.filter(trx => {
    const matchSearch = (trx.trx_id.toLowerCase().includes(search.toLowerCase()) || 
                        (trx.user?.email || '').toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'ALL' || trx.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-700 text-2xl">Manajemen Transaksi</h1>
        </div>

        <div className="card p-0 bg-white overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <div className="p-4 border-b-2 border-ink flex gap-4 bg-ink/5">
            <input 
              type="text"
              placeholder="Cari TRX ID atau Email User..."
              className="flex-1 border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select 
              className="border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">DIPROSES (PAID)</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b-2 border-ink text-[10px] tracking-widest text-ink/50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold">WAKTU</th>
                  <th className="p-4 font-bold">TRX ID</th>
                  <th className="p-4 font-bold">USER</th>
                  <th className="p-4 font-bold">PRODUK</th>
                  <th className="p-4 font-bold">TOTAL</th>
                  <th className="p-4 font-bold text-center">STATUS</th>
                  <th className="p-4 font-bold text-center">AKSI ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {filteredTransactions.map(trx => (
                  <tr key={trx.id} className="hover:bg-violet-50/50">
                    <td className="p-4 text-xs">{formatDate(trx.created_at)}</td>
                    <td className="p-4 font-mono text-xs" title={trx.trx_id}>{trx.trx_id.substring(0, 8)}...</td>
                    <td className="p-4">{trx.user?.email || 'Guest'}</td>
                    <td className="p-4 text-xs font-bold">{trx.product?.product_name || 'Produk Dihapus'}</td>
                    <td className="p-4 font-bold">{formatRupiah(trx.amount)}</td>
                    <td className="p-4 text-center">{getStatusBadge(trx.status)}</td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => handleRetryTopup(trx.trx_id)}
                          disabled={trx.status === 'SUCCESS' || trx.status === 'PENDING'}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1 min-w-[70px]"
                          title="Kirim ulang pesanan ke Server Digiflazz"
                        >
                          🔄 RETRY
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(trx.trx_id, 'FAILED')}
                          disabled={trx.status === 'FAILED'}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          title="Batalkan transaksi secara paksa & refund saldo"
                        >
                          ❌ REFUND
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan="7" className="p-8 text-center text-ink/50">Transaksi tidak ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
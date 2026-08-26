import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    axios.get('http://127.0.0.1:8000/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setData(res.data.data);
    })
    .catch(err => {
      console.error(err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        navigate('/');
      }
    })
    .finally(() => setIsLoading(false));
  }, [navigate, token]);

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'SUCCESS': 
      case 'PAID': return <span className="bg-ink text-gold-400 text-[10px] font-bold px-2 py-1 rounded-md">SUKSES</span>;
      case 'PENDING': return <span className="bg-white border-2 border-ink text-ink text-[10px] font-bold px-2 py-1 rounded-md">PENDING</span>;
      case 'FAILED': return <span className="bg-red-100 border-2 border-red-700 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md">GAGAL</span>;
      default: return <span className="bg-ink/10 text-ink text-[10px] font-bold px-2 py-1 rounded-md">{status}</span>;
    }
  };

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><p>Memuat Dashboard...</p></div>;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-700 text-2xl">Admin Dashboard</h1>
          <span className="badge">SUPER ADMIN</span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card p-5 bg-white">
            <p className="text-xs text-ink/50 font-bold mb-1">Omzet Hari Ini</p>
            <p className="font-display font-700 text-2xl">{formatRupiah(data?.stats?.omzet)}</p>
          </div>
          <div className="card p-5 bg-white border-violet-600">
            <p className="text-xs text-violet-600/70 font-bold mb-1">Estimasi Profit</p>
            <p className="font-display font-700 text-2xl text-violet-700">{formatRupiah(data?.stats?.profit)}</p>
          </div>
          <div className="card p-5 bg-white">
            <p className="text-xs text-ink/50 font-bold mb-1">Transaksi Pending</p>
            <p className="font-display font-700 text-2xl">{data?.stats?.pending_trx}</p>
          </div>
          <div className="card p-5 bg-white">
            <p className="text-xs text-ink/50 font-bold mb-1">User Aktif</p>
            <p className="font-display font-700 text-2xl">{data?.stats?.active_users}</p>
          </div>
        </div>

        <div className="space-y-8">
          
          <div>
            <h2 className="text-sm font-bold text-ink/70 mb-3">Transaksi Terbaru</h2>
            <div className="card p-0 bg-white overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink/5 border-b-2 border-ink text-[10px] tracking-widest text-ink/50">
                  <tr>
                    <th className="p-4 font-bold">ID</th>
                    <th className="p-4 font-bold">USER</th>
                    <th className="p-4 font-bold">PRODUK</th>
                    <th className="p-4 font-bold">TOTAL</th>
                    <th className="p-4 font-bold">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/5">
                  {data?.transactions?.map(trx => (
                    <tr key={trx.id} className="hover:bg-violet-50/50">
                      <td className="p-4 font-mono text-xs">{trx.trx_id.substring(0, 8)}</td>
                      <td className="p-4">{trx.user?.email || 'Guest'}</td>
                      <td className="p-4">{trx.product?.product_name || 'Produk Dihapus'}</td>
                      <td className="p-4 font-bold">{formatRupiah(trx.amount)}</td>
                      <td className="p-4">{getStatusBadge(trx.status)}</td>
                    </tr>
                  ))}
                  {data?.transactions?.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-ink/50">Belum ada transaksi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-sm font-bold text-ink/70 mb-3">Tiket Komplain Baru</h2>
              <div className="card p-0 bg-white overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink/5 border-b-2 border-ink text-[10px] tracking-widest text-ink/50">
                    <tr>
                      <th className="p-4 font-bold">USER</th>
                      <th className="p-4 font-bold">SUBJEK</th>
                      <th className="p-4 font-bold">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-ink/5">
                    {data?.tickets?.map(ticket => (
                      <tr key={ticket.id} className="hover:bg-violet-50/50">
                        <td className="p-4 text-xs">{ticket.user?.email}</td>
                        <td className="p-4 font-bold text-xs truncate max-w-[150px]">{ticket.subject}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md border-2 border-ink ${ticket.status === 'OPEN' ? 'bg-gold-400' : 'bg-ink/10'}`}>
                            {ticket.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data?.tickets?.length === 0 && (
                      <tr><td colSpan="3" className="p-8 text-center text-ink/50">Tidak ada tiket baru</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-ink/70 mb-3">Audit Log Terbaru</h2>
              <div className="card p-0 bg-white overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink/5 border-b-2 border-ink text-[10px] tracking-widest text-ink/50">
                    <tr>
                      <th className="p-4 font-bold">WAKTU</th>
                      <th className="p-4 font-bold">ADMIN</th>
                      <th className="p-4 font-bold">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-ink/5">
                    {data?.audit_logs?.map(log => (
                      <tr key={log.id} className="hover:bg-violet-50/50">
                        <td className="p-4 text-xs">{formatDate(log.created_at)}</td>
                        <td className="p-4 text-xs">{log.user?.email}</td>
                        <td className="p-4 font-mono text-[10px] bg-ink/5 px-2 py-1 inline-block mt-3 ml-4 rounded border border-ink/20">
                          {log.action} {log.target}
                        </td>
                      </tr>
                    ))}
                    {data?.audit_logs?.length === 0 && (
                      <tr><td colSpan="3" className="p-8 text-center text-ink/50">Belum ada log</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [downloadingTrx, setDownloadingTrx] = useState(null);
  const hiddenReceiptRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      try {
        const userRes = await axios.get('https://artazone-api.onrender.com/api/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userRes.data);

        const trxRes = await axios.get('https://artazone-api.onrender.com/api/user/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (trxRes.data.status === 'success') {
          setTransactions(trxRes.data.data);
        }
      } catch (error) {
        console.error(error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/auth');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    if (downloadingTrx && hiddenReceiptRef.current) {
      const generateReceipt = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 200)); 
          const canvas = await html2canvas(hiddenReceiptRef.current, {
            scale: 2,
            backgroundColor: '#ffffff'
          });
          const image = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = image;
          link.download = `Struk_ArTaZone_${downloadingTrx.trx_id}.png`;
          link.click();
        } catch (error) {
          console.error('Download error:', error);
          alert('Gagal mengunduh struk.');
        } finally {
          setDownloadingTrx(null);
        }
      };
      generateReceipt();
    }
  }, [downloadingTrx]);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  };

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'SUCCESS': return <span className="badge bg-green-100 text-green-700 border-green-700">Sukses</span>;
      case 'PENDING': return <span className="badge bg-yellow-100 text-yellow-700 border-yellow-700">Tertunda</span>;
      case 'FAILED': return <span className="badge bg-red-100 text-red-700 border-red-700">Gagal</span>;
      case 'PAID': return <span className="badge bg-violet-100 text-violet-700 border-violet-700">Diproses</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const getStatusConfig = (status) => {
    if (status === 'PAID') return {title: 'Pembayaran Diterima', color: 'text-violet-600' };
    if (status === 'SUCCESS') return { title: 'Transaksi Berhasil!', color: 'text-green-600' };
    if (status === 'FAILED') return {title: 'Transaksi Gagal', color: 'text-red-600' };
    return { title: 'Sedang Diproses...', color: 'text-ink' };
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col relative">
      <Navbar />

      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
        {downloadingTrx && (
          <div 
            ref={hiddenReceiptRef} 
            className="bg-white p-8 border-4 border-ink w-[400px] text-ink font-sans"
          >
            <div className="text-center border-b-2 border-ink border-dashed pb-5 mb-5">
              <h2 className="font-display font-700 text-3xl">ArTa<span className="text-violet-600">Zone</span></h2>
              <p className="text-xs font-bold mt-1 tracking-widest text-ink/60">BUKTI PEMBAYARAN</p>
            </div>
            
            <div className="text-center mb-8">
              <div className={`text-5xl mb-3 ${getStatusConfig(downloadingTrx.status).color}`}>
                {getStatusConfig(downloadingTrx.status).icon}
              </div>
              <h1 className={`font-display font-700 text-xl mb-1 ${getStatusConfig(downloadingTrx.status).color}`}>
                {getStatusConfig(downloadingTrx.status).title}
              </h1>
            </div>

            <div className="space-y-4 text-sm font-semibold">
              <div className="flex justify-between items-start border-b-2 border-ink/10 pb-2 gap-4">
                <span className="text-ink/60 text-xs whitespace-nowrap pt-1">ID Transaksi</span>
                <span className="font-mono text-[10px] text-right break-all leading-tight">{downloadingTrx.trx_id}</span>
              </div>
              <div className="flex justify-between items-start border-b-2 border-ink/10 pb-2 gap-4">
                <span className="text-ink/60 text-xs whitespace-nowrap">Waktu</span>
                <span className="text-right text-xs">{formatDate(downloadingTrx.created_at)}</span>
              </div>
              <div className="flex justify-between items-start border-b-2 border-ink/10 pb-2 gap-4">
                <span className="text-ink/60 text-xs whitespace-nowrap">Produk</span>
                <span className="text-right text-xs break-words">{downloadingTrx.product?.product_name}</span>
              </div>
              <div className="flex justify-between items-start border-b-2 border-ink/10 pb-2 gap-4">
                <span className="text-ink/60 text-xs whitespace-nowrap">Target / User ID</span>
                <span className="text-right text-xs break-all">
                  {downloadingTrx.user_game_id} {downloadingTrx.zone_id ? `(${downloadingTrx.zone_id})` : ''}
                </span>
              </div>
              <div className="flex justify-between items-end pt-3">
                <span className="text-ink/60 text-xs">Total Pembayaran</span>
                <span className="text-xl font-bold font-display text-violet-700">{formatRupiah(downloadingTrx.amount)}</span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-ink border-dashed text-center">
              <p className="text-[10px] font-bold text-ink/40">Terima kasih telah berbelanja di ArTa Zone!</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-8 grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          <div className="card p-5 mb-6 bg-violet-50 border-violet-200">
            <p className="text-xs text-ink/50 font-bold mb-1">Total Saldo</p>
            <p className="font-display font-700 text-2xl text-violet-700">{formatRupiah(user?.balance)}</p>
            <button className="btn-accent w-full py-2 text-xs mt-3">+ Isi Saldo</button>
          </div>
          <Link to="/dashboard" className={`block w-full text-left px-4 py-3 text-sm font-bold rounded-lg ${location.pathname === '/dashboard' ? 'bg-ink text-white' : 'text-ink/60 hover:bg-ink/5'}`}>Dashboard</Link>
          <Link to="/tickets" className={`block w-full text-left px-4 py-3 text-sm font-bold rounded-lg ${location.pathname === '/tickets' ? 'bg-ink text-white' : 'text-ink/60 hover:bg-ink/5'}`}>Tiket Komplain</Link>
          <Link to="/settings" className={`block w-full text-left px-4 py-3 text-sm font-bold rounded-lg ${location.pathname === '/settings' ? 'bg-ink text-white' : 'text-ink/60 hover:bg-ink/5'}`}>Pengaturan Profil</Link>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-8">
            <h1 className="font-display font-700 text-2xl">Halo, {user?.name} 👋</h1>
            <p className="text-sm text-ink/60 mt-1">Status Member: <span className="font-bold text-ink">{user?.roles?.[0]?.name?.toUpperCase() || 'MEMBER'}</span></p>
          </div>

          <h2 className="font-display font-700 text-lg mb-4">Riwayat Transaksi Terakhir</h2>
          
          <div className="flex flex-col gap-3">
            {transactions.length > 0 ? transactions.map(trx => (
              <div key={trx.trx_id} className="card-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Link to={`/status/${trx.trx_id}`} className="font-bold text-sm hover:text-violet-600 hover:underline">
                      {trx.product?.product_name || 'Produk Tidak Diketahui'}
                    </Link>
                  </div>
                  <p className="text-xs text-ink/50">
                    {trx.user_game_id} {trx.zone_id ? `(${trx.zone_id})` : ''} • {formatDate(trx.created_at)}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <p className="font-bold text-sm">{formatRupiah(trx.amount)}</p>
                  {getStatusBadge(trx.status)}
                  <button 
                    onClick={() => setDownloadingTrx(trx)}
                    disabled={downloadingTrx?.trx_id === trx.trx_id}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-ink bg-ink/5 hover:bg-ink/10 rounded-md border border-ink/20 transition-colors disabled:opacity-50"
                  >
                    {downloadingTrx?.trx_id === trx.trx_id ? 'MEMPROSES...' : 'UNDUH'}
                  </button>
                </div>
              </div>
            )) : (
              <div className="card border-dashed p-8 text-center text-ink/40">
                <p className="text-sm font-semibold">Belum ada transaksi.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
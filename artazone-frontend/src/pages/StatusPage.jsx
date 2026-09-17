import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function StatusPage() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const receiptRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchStatus = () => {
      axios.get(`https://artazone-api-pdid.onrender.com/api/transactions/${id}`)
        .then(res => {
          setTransaction(res.data.data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoading(false);
        });
    };

    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleDownload = async () => {
    if (receiptRef.current) {
      setIsDownloading(true);
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(receiptRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `Struk_ArTaZone_${transaction.trx_id}.png`;
        link.click();
      } catch (error) {
        console.error(error);
        alert('Gagal mengunduh struk.');
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-violet-50/30 w-full overflow-y-auto">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="font-bold text-ink/70">Mencari Data Transaksi...</p>
        </main>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col min-h-screen bg-violet-50/30 w-full overflow-y-auto">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-display font-700 text-2xl mb-2">Transaksi Tidak Ditemukan</h1>
            <Link to="/" className="text-violet-600 font-bold hover:underline">Kembali ke Beranda</Link>
          </div>
        </main>
      </div>
    );
  }

  let statusConfig = {
    title: 'Sedang Diproses...',
    desc: 'Menunggu pembayaran diselesaikan.',
    color: 'text-ink'
  };

  if (transaction.status === 'PAID') {
    statusConfig = {
      title: 'Pembayaran Diterima',
      desc: 'Sedang mengirim pesanan ke server game.',
      color: 'text-violet-600'
    };
  } else if (transaction.status === 'SUCCESS') {
    statusConfig = {
      title: 'Transaksi Berhasil!',
      desc: 'Pesanan telah masuk ke akun game kamu.',
      color: 'text-green-600'
    };
  } else if (transaction.status === 'FAILED') {
    statusConfig = {
      title: 'Transaksi Gagal',
      // Sengaja tidak menampilkan transaction.status_note di sini — itu pesan teknis
      // (mis. "API Error: ...") yang cuma relevan untuk admin. User cukup tahu gagal,
      // detail lengkapnya bisa dicek admin lewat panel Manajemen Transaksi.
      desc: 'Terjadi kesalahan saat memproses pesanan. Jika saldo sudah terpotong, dana akan otomatis dikembalikan. Hubungi CS jika ada kendala.',
      color: 'text-red-600'
    };
  }

  return (
    <div className="flex flex-col min-h-screen bg-violet-50/30 w-full overflow-y-auto">
      <Navbar />

      <main className="flex-1 container mx-auto px-6 py-12 flex justify-center items-start">
        <div className="max-w-md w-full flex flex-col items-center">
          
          <div 
            ref={receiptRef} 
            className="bg-white p-8 border-4 border-ink shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] w-full text-ink font-sans mb-8 relative"
          >
            <div className="text-center border-b-2 border-ink border-dashed pb-5 mb-5">
              <h2 className="font-display font-700 text-3xl">ArTa<span className="text-violet-600">Zone</span></h2>
              <p className="text-xs font-bold mt-1 tracking-widest text-ink/60">BUKTI PEMBAYARAN</p>
            </div>
            
            <div className="text-center mb-8">
              <div className={`text-5xl mb-3 ${statusConfig.color}`}>{statusConfig.icon}</div>
              <h1 className={`font-display font-700 text-xl mb-1 ${statusConfig.color}`}>{statusConfig.title}</h1>
              <p className="text-xs font-bold text-ink/70 px-4">{statusConfig.desc}</p>
            </div>

            <div className="space-y-4 text-sm font-semibold">
              <div className="flex justify-between items-start border-b-2 border-ink/10 pb-2 gap-4">
                <span className="text-ink/60 text-xs whitespace-nowrap pt-1">ID Transaksi</span>
                <span className="font-mono text-[10px] text-right break-all leading-tight">{transaction.trx_id}</span>
              </div>
              <div className="flex justify-between items-start border-b-2 border-ink/10 pb-2 gap-4">
                <span className="text-ink/60 text-xs whitespace-nowrap">Waktu</span>
                <span className="text-right text-xs">{formatDate(transaction.created_at)}</span>
              </div>
              <div className="flex justify-between items-start border-b-2 border-ink/10 pb-2 gap-4">
                <span className="text-ink/60 text-xs whitespace-nowrap">Produk</span>
                <span className="text-right text-xs break-words">{transaction.product?.product_name}</span>
              </div>
              <div className="flex justify-between items-start border-b-2 border-ink/10 pb-2 gap-4">
                <span className="text-ink/60 text-xs whitespace-nowrap">Target / User ID</span>
                <span className="text-right text-xs break-all">
                  {transaction.user_game_id} {transaction.zone_id ? `(${transaction.zone_id})` : ''}
                </span>
              </div>
              <div className="flex justify-between items-end pt-3">
                <span className="text-ink/60 text-xs">Total Pembayaran</span>
                <span className="text-xl font-bold font-display text-violet-700">{formatRupiah(transaction.amount)}</span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-ink border-dashed text-center">
              <p className="text-[10px] font-bold text-ink/65">Terima kasih telah berbelanja di ArTa Zone!</p>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <button 
              onClick={handleDownload} 
              disabled={isDownloading}
              className="btn-ghost flex-1 py-3 text-sm disabled:opacity-50"
            >
              {isDownloading ? 'MEMPROSES...' : 'UNDUH STRUK'}
            </button>
            <Link to="/" className="btn-primary flex-1 py-3 text-sm flex items-center justify-center">
              KEMBALI KE BERANDA
            </Link>
          </div>

        </div>
      </main>
      <Footer/>
    </div>
  );
}
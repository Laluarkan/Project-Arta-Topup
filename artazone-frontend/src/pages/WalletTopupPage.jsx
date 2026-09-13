/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const QUICK_AMOUNTS = [25000, 50000, 100000, 250000, 500000, 1000000];

const formatRupiah = (num) => 'Rp' + Number(num || 0).toLocaleString('id-ID');

export default function WalletTopupPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('midtrans'); // midtrans | pakasir | manual
  const [activeGateways, setActiveGateways] = useState({ midtrans: true, pakasir: true });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Khusus manual
  const [transferInfo, setTransferInfo] = useState(null);
  const [senderBank, setSenderBank] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [manualSubmitted, setManualSubmitted] = useState(false);

  // Khusus pakasir
  const [pakasirPayment, setPakasirPayment] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const idempotencyKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }

    axios.get('https://artazone-api.onrender.com/api/payment-gateways/status')
      .then(res => { if (res.data.status === 'success') setActiveGateways(res.data.data); })
      .catch(() => {});

    axios.get('https://artazone-api.onrender.com/api/wallet/manual-transfer-info')
      .then(res => { if (res.data.status === 'success') setTransferInfo(res.data.data); })
      .catch(() => {});
  }, [token, navigate]);

  const startPollingTopup = (topupId) => {
    setIsPolling(true);
    let elapsed = 0;
    const interval = setInterval(async () => {
      elapsed += 4000;
      try {
        const res = await axios.get(`https://artazone-api.onrender.com/api/wallet/topup/${topupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.data?.status === 'PAID') {
          clearInterval(interval);
          setIsPolling(false);
          navigate('/wallet/history?topup=success');
        }
      } catch (e) { /* coba lagi interval berikutnya */ }
      if (elapsed >= 600000) { clearInterval(interval); setIsPolling(false); }
    }, 4000);
  };

  const handleAutomaticTopup = async () => {
    setError('');
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 10000) {
      setError('Minimal top up Rp10.000');
      return;
    }

    setIsLoading(true);
    const endpoint = method === 'midtrans' ? '/api/wallet/topup/midtrans' : '/api/wallet/topup/pakasir';

    try {
      const res = await axios.post(`https://artazone-api.onrender.com${endpoint}`, {
        amount: numAmount,
        idempotency_key: idempotencyKeyRef.current
      }, { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 });

      if (method === 'midtrans') {
        const { snap_token, client_key } = res.data.data;
        const script = document.createElement('script');
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', client_key);
        document.body.appendChild(script);
        script.onload = () => {
          window.snap.pay(snap_token, {
            onSuccess: () => navigate('/wallet/history?topup=success'),
            onPending: () => navigate('/wallet/history?topup=pending'),
            onError: () => setError('Pembayaran gagal. Coba lagi.'),
            onClose: () => setIsLoading(false)
          });
        };
      } else {
        const { topup, payment_number, total_payment, expired_at } = res.data.data;
        setPakasirPayment({ topupId: topup.id, paymentNumber: payment_number, totalPayment: total_payment, expiredAt: expired_at });
        startPollingTopup(topup.id);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 10000) { setError('Minimal top up Rp10.000'); return; }
    if (!senderBank || !senderName || !senderAccount || !proofFile) {
      setError('Semua kolom dan bukti transfer wajib diisi.');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('amount', numAmount);
    formData.append('sender_bank', senderBank);
    formData.append('sender_name', senderName);
    formData.append('sender_account_number', senderAccount);
    formData.append('proof_image', proofFile);

    try {
      await axios.post('https://artazone-api.onrender.com/api/wallet/topup/manual', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setManualSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim permintaan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="flex-1 max-w-xl w-full mx-auto p-8">
        <h1 className="text-2xl font-display font-700 mb-1">Isi Saldo</h1>
        <p className="text-sm text-ink/50 mb-6">Top up saldo ArTa Zone untuk checkout lebih cepat tanpa perlu bayar berulang kali.</p>

        {/* STEP 1: Nominal */}
        <div className="mb-6">
          <label className="text-xs font-bold text-ink/60 mb-2 block">STEP 1 — NOMINAL</label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {QUICK_AMOUNTS.map(v => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`py-2 text-xs border-2 border-ink rounded-lg font-bold ${String(v) === amount ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-ink/5'}`}
              >
                {formatRupiah(v)}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Atau masukkan nominal lain (min. Rp10.000)"
            className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* STEP 2: Metode */}
        <div className="mb-6">
          <label className="text-xs font-bold text-ink/60 mb-2 block">STEP 2 — METODE PEMBAYARAN</label>
          <div className="flex gap-2 flex-wrap">
            {activeGateways.midtrans && (
              <button onClick={() => setMethod('midtrans')} className={`px-4 py-2 text-xs rounded-lg border-2 border-ink font-bold ${method === 'midtrans' ? 'bg-ink text-white' : 'bg-white'}`}>
                QRIS / E-Wallet (Midtrans)
              </button>
            )}
            {activeGateways.pakasir && (
              <button onClick={() => setMethod('pakasir')} className={`px-4 py-2 text-xs rounded-lg border-2 border-ink font-bold ${method === 'pakasir' ? 'bg-ink text-white' : 'bg-white'}`}>
                QRIS (Pakasir)
              </button>
            )}
            <button onClick={() => setMethod('manual')} className={`px-4 py-2 text-xs rounded-lg border-2 border-ink font-bold ${method === 'manual' ? 'bg-ink text-white' : 'bg-white'}`}>
              Transfer Bank Manual
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

        {/* Metode otomatis */}
        {(method === 'midtrans' || method === 'pakasir') && (
          <button
            onClick={handleAutomaticTopup}
            disabled={isLoading}
            className={`w-full py-3 text-sm ${isLoading ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-primary glow'}`}
          >
            {isLoading ? 'Memproses...' : `Isi Saldo ${amount ? formatRupiah(amount) : ''}`}
          </button>
        )}

        {/* Metode manual */}
        {method === 'manual' && !manualSubmitted && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            {transferInfo ? (
              <div className="p-4 bg-violet-50 border-2 border-violet-200 rounded-lg text-sm mb-2">
                <p className="font-bold text-ink mb-1">Transfer ke rekening ini:</p>
                <p>{transferInfo.bank_name} — {transferInfo.account_number}</p>
                <p className="text-ink/60">a.n. {transferInfo.account_name}</p>
              </div>
            ) : (
              <p className="text-xs text-ink/50 mb-2">Info rekening tujuan belum diatur admin. Hubungi CS untuk info transfer.</p>
            )}

            <input className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm" placeholder="Nama Bank Pengirim (misal: BCA)" value={senderBank} onChange={(e) => setSenderBank(e.target.value)} />
            <input className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm" placeholder="Nama Pengirim (sesuai rekening)" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
            <input className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm" placeholder="Nomor Rekening Pengirim" value={senderAccount} onChange={(e) => setSenderAccount(e.target.value)} />

            <div>
              <label className="text-xs font-bold text-ink/60 mb-1 block">Bukti Transfer (JPG/PNG, maks 5MB)</label>
              <input type="file" accept="image/jpeg,image/png,image/jpg" onChange={(e) => setProofFile(e.target.files[0])} className="text-xs" />
            </div>

            <button type="submit" disabled={isLoading} className={`w-full py-3 text-sm mt-2 ${isLoading ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-primary glow'}`}>
              {isLoading ? 'Mengirim...' : 'Kirim Bukti Transfer'}
            </button>
          </form>
        )}

        {manualSubmitted && (
          <div className="p-5 bg-green-50 border-2 border-green-200 rounded-lg text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm font-bold text-ink mb-1">Permintaan Terkirim!</p>
            <p className="text-xs text-ink/60">Saldo akan otomatis ditambahkan setelah admin memverifikasi bukti transfer Anda (biasanya dalam 1x24 jam). Cek Riwayat Saldo untuk update status.</p>
            <button onClick={() => navigate('/wallet/history')} className="btn-accent px-6 py-2 text-xs mt-4">Lihat Riwayat Saldo</button>
          </div>
        )}
      </div>

      {/* Modal QR Pakasir */}
      {pakasirPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
            <h3 className="text-lg font-bold text-ink mb-4">Scan QRIS untuk Isi Saldo</h3>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(pakasirPayment.paymentNumber)}`}
              alt="QRIS Pakasir"
              className="mx-auto border-2 border-ink rounded-xl mb-4"
            />
            <p className="text-2xl font-display font-700 text-violet-700 mb-4">{formatRupiah(pakasirPayment.totalPayment)}</p>
            <p className="text-xs text-ink/60 mb-4">
              {isPolling ? '⏳ Menunggu pembayaran...' : 'Polling dihentikan (timeout).'}
            </p>
            <button onClick={() => navigate('/wallet/history')} className="btn-primary w-full py-2.5 text-sm mb-2">Cek Status Manual</button>
            <button onClick={() => setPakasirPayment(null)} className="btn-ghost w-full py-2.5 text-sm text-red-600">Batalkan</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
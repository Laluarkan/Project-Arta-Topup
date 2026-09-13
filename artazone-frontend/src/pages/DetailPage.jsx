/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { resolveIconUrl } from '../utils/resolveIconUrl';

const PopupModal = ({ isOpen, message, onClose, type = 'error' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl transform transition-all">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${type === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
          <span className={`text-2xl font-bold ${type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {type === 'error' ? '!' : '✓'}
          </span>
        </div>
        <h3 className="text-lg font-bold text-ink mb-2">
          {type === 'error' ? 'Peringatan' : 'Berhasil'}
        </h3>
        <p className="text-sm text-ink/70 mb-6">{message}</p>
        <button onClick={onClose} className="btn-primary w-full py-2.5 text-sm">
          Tutup
        </button>
      </div>
    </div>
  );
};

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categoryName, setCategoryName] = useState('Memuat...');
  const [categoryIcon, setCategoryIcon] = useState(null);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userId, setUserId] = useState('');
  const [zoneId, setZoneId] = useState('');
  
  const [nickname, setNickname] = useState('');
  const [isCheckingName, setIsCheckingName] = useState(false);

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  
  const [popup, setPopup] = useState({ isOpen: false, message: '', type: 'error' });

  const token = localStorage.getItem('token');
  const [paymentMethod, setPaymentMethod] = useState(token ? 'wallet' : 'qris');
  const [pakasirPayment, setPakasirPayment] = useState(null); // { trxId, paymentNumber, totalPayment, expiredAt }
  const [isPolling, setIsPolling] = useState(false);
  const [activeGateways, setActiveGateways] = useState({ wallet: true, midtrans: true, pakasir: true });

  useEffect(() => {
    axios.get('https://artazone-api.onrender.com/api/payment-gateways/status')
      .then(res => {
        if (res.data.status === 'success') {
          setActiveGateways(res.data.data);
          // Kalau metode bayar yang lagi kepilih ternyata mati, geser otomatis ke yang masih aktif
          setPaymentMethod(prev => {
            const stillActive = res.data.data[prev === 'qris' ? 'midtrans' : prev];
            if (stillActive) return prev;
            if (token && res.data.data.wallet) return 'wallet';
            if (res.data.data.midtrans) return 'qris';
            if (res.data.data.pakasir) return 'pakasir';
            return prev;
          });
        }
      })
      .catch(() => {}); // kalau gagal fetch, biarkan default semua aktif
  }, [token]);

  useEffect(() => {
    axios.get('https://artazone-api.onrender.com/api/categories')
      .then(res => {
        const cat = res.data.data.find(c => c.id === id);
        if (cat) {
          setCategoryName(cat.name);
          setCategoryIcon(cat.icon);
        }
      });
    axios.get(`https://artazone-api.onrender.com/api/products/${id}`)
      .then(res => {
        if (res.data.status === 'success') {
          setProducts(res.data.data);
        }
      });
  }, [id]);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const getInputConfig = (catName) => {
    const name = (catName || '').toUpperCase();
    
    if (name.includes('MOBILE LEGENDS')) return { type: 'double', label1: 'User ID', label2: 'Zone ID', desc: 'Masukkan User ID dan Zone ID. Contoh: 1234567 (1234)' };
    if (name.includes('GENSHIN')) return { type: 'server', label1: 'User ID', label2: 'Pilih Server', desc: 'Masukkan User ID dan pilih Server Anda.' };
    
    if (name.includes('FREE FIRE') || name.includes('PUBG') || name.includes('VALORANT') || name.includes('ARENA OF VALOR') || name.includes('POINT BLANK') || name.includes('CALL OF DUTY')) {
      return { type: 'single', label1: 'Player ID / User ID', desc: 'Masukkan Player ID akun game Anda.' };
    }
    
    if (name.includes('PLN') || name.includes('GAS') || name.includes('VISION') || name.includes('PDAM')) {
      return { type: 'single', label1: 'No. Pelanggan / ID Meter', desc: 'Masukkan Nomor Pelanggan yang valid.' };
    }
    
    if (name.includes('PULSA') || name.includes('DATA') || name.includes('TELKOMSEL') || name.includes('INDOSAT') || name.includes('XL') || name.includes('TRI') || name.includes('AXIS') || name.includes('SMARTFREN')) {
      return { type: 'single', label1: 'Nomor Handphone', desc: 'Masukkan nomor HP tujuan.' };
    }

    return { type: 'single', label1: 'ID Pengguna / Tujuan', desc: 'Masukkan ID akun atau nomor tujuan yang valid.' };
  };

  const inputConfig = getInputConfig(categoryName);

  const handleCheckNickname = async () => {
    if (userId.includes('<') || userId.includes('>') || zoneId.includes('<') || zoneId.includes('>')) {
      setPopup({ isOpen: true, message: 'Format ID tidak valid.', type: 'error' });
      return;
    }

    setIsCheckingName(true);
    setNickname('');
    try {
      const res = await axios.post('https://artazone-api.onrender.com/api/check-nickname', {
        game: categoryName,
        user_id: userId,
        zone_id: inputConfig.type === 'single' ? null : zoneId
      });
      
      setNickname(res.data.data.nickname);
    } catch (err) {
      setPopup({ 
        isOpen: true, 
        message: err.response?.data?.message || 'ID Game tidak ditemukan atau layanan pengecekan sedang gangguan.', 
        type: 'error' 
      });
    } finally {
      setIsCheckingName(false);
    }
  };

  const checkPromo = async () => {
    if (!promoCodeInput) return;
    setIsCheckingPromo(true);
    try {
      const res = await axios.post('https://artazone-api.onrender.com/api/promos/validate', { code: promoCodeInput });
      setAppliedPromo(res.data.data);
      setPopup({ isOpen: true, message: 'Voucher berhasil digunakan!', type: 'success' });
    } catch (err) {
      setAppliedPromo(null);
      setPopup({ isOpen: true, message: err.response?.data?.message || 'Kode voucher tidak valid.', type: 'error' });
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
  };

  // Polling status transaksi Pakasir setiap 4 detik sampai PAID atau timeout 10 menit
  const startPollingPakasir = (trxId) => {
    setIsPolling(true);
    let elapsed = 0;
    const interval = setInterval(async () => {
      elapsed += 4000;
      try {
        const res = await axios.get(`https://artazone-api.onrender.com/api/transactions/${trxId}`);
        const status = res.data?.data?.status;
        if (status === 'PAID' || status === 'SUCCESS') {
          clearInterval(interval);
          setIsPolling(false);
          navigate(`/status/${trxId}`);
        }
      } catch (err) {
        // Diamkan error polling sesaat, coba lagi di interval berikutnya
      }
      if (elapsed >= 600000) { // 10 menit
        clearInterval(interval);
        setIsPolling(false);
      }
    }, 4000);
  };

  // Idempotency key: dibuat sekali per "niat checkout", regenerate kalau produk yang dipilih berubah.
  // Dipakai backend untuk mendeteksi kalau request yang sama terkirim dua kali (double-klik/retry network).
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  useEffect(() => {
    idempotencyKeyRef.current = crypto.randomUUID();
  }, [selectedProduct]);

  // Guard sinkron ekstra selain `disabled` di tombol, supaya klik super cepat
  // sebelum re-render sempat commit tetap tidak lolos jadi 2 request.
  const isSubmittingRef = useRef(false);

  const handleCheckout = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (userId.includes('<') || userId.includes('>') || zoneId.includes('<') || zoneId.includes('>')) {
      setPopup({ isOpen: true, message: 'Format ID tidak valid. Karakter dilarang.', type: 'error' });
      isSubmittingRef.current = false;
      return;
    }

    setIsLoading(true);
    const endpointMap = {
      wallet: '/api/checkout/wallet',
      qris: '/api/checkout/midtrans',
      pakasir: '/api/checkout/pakasir'
    };
    const endpoint = endpointMap[paymentMethod];
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const payload = {
      product_id: selectedProduct.id,
      user_game_id: userId,
      zone_id: inputConfig.type === 'single' ? null : zoneId,
      promo_code: appliedPromo ? appliedPromo.code : null,
      email: email,
      idempotency_key: idempotencyKeyRef.current
    };
    
    try {
      const res = await axios.post(`https://artazone-api.onrender.com${endpoint}`, payload, { headers });
      
      if (paymentMethod === 'wallet') {
        const trxId = res.data.data.trx_id;
        navigate(`/status/${trxId}`); 
      } else if (paymentMethod === 'pakasir') {
        setIsLoading(false);
        const { transaction, payment_number, total_payment, expired_at } = res.data.data;
        setPakasirPayment({
          trxId: transaction.trx_id,
          paymentNumber: payment_number,
          totalPayment: total_payment,
          expiredAt: expired_at
        });
        startPollingPakasir(transaction.trx_id);
      } else {
        const { snap_token, client_key, api_mode, transaction } = res.data.data;
        const trxId = transaction.trx_id;
        
        const scriptUrl = api_mode === 'production' 
          ? 'https://app.midtrans.com/snap/snap.js' 
          : 'https://app.sandbox.midtrans.com/snap/snap.js';
        
        const executeSnapPay = () => {
          setIsLoading(false);
          if (window.snap) {
            window.snap.pay(snap_token, {
              onSuccess: function(){ navigate(`/status/${trxId}`); },
              onPending: function(){ navigate(`/status/${trxId}`); },
              onError: function(){ 
                setPopup({ isOpen: true, message: 'Pembayaran gagal diproses atau dibatalkan.', type: 'error' });
              },
              onClose: function(){ 
                setPopup({ isOpen: true, message: 'Anda menutup popup pembayaran sebelum menyelesaikannya.', type: 'error' });
              }
            });
          } else {
            setPopup({ isOpen: true, message: 'Pop-up pembayaran diblokir oleh browser. Matikan ekstensi AdBlock.', type: 'error' });
          }
        };
        
        if (window.snap) {
          executeSnapPay();
        } else {
          let script = document.querySelector(`script[src="${scriptUrl}"]`);
          
          if (!script) {
            script = document.createElement('script');
            script.src = scriptUrl;
            script.setAttribute('data-client-key', client_key);
            script.async = true;
            script.onload = executeSnapPay;
            document.body.appendChild(script);
          } else {
            script.onload = executeSnapPay;
          }
        }
      }
    } catch (err) {
      setIsLoading(false);
      setPopup({ 
        isOpen: true, 
        message: err.response?.data?.message || 'Terjadi kesalahan saat memproses pesanan.', 
        type: 'error' 
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const basePrice = selectedProduct ? selectedProduct.price_member : 0;
  let finalPrice = basePrice;
  
  if (appliedPromo && selectedProduct) {
    let discountAmount = appliedPromo.type === 'percent' ? basePrice * (appliedPromo.value / 100) : appliedPromo.value;
    finalPrice = Math.max(0, basePrice - discountAmount);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      <Navbar />
      
      <PopupModal 
        isOpen={popup.isOpen} 
        message={popup.message} 
        type={popup.type} 
        onClose={() => setPopup({ ...popup, isOpen: false })} 
      />

      {pakasirPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
            <h3 className="text-lg font-bold text-ink mb-1">Scan QRIS untuk Bayar</h3>
            <p className="text-xs text-ink/70 mb-4">Order ID: {pakasirPayment.trxId}</p>

            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(pakasirPayment.paymentNumber)}`}
              alt="QRIS Pakasir"
              className="mx-auto border-2 border-ink rounded-xl mb-4"
            />

            <p className="text-2xl font-display font-700 text-violet-700 mb-1">
              {formatRupiah(pakasirPayment.totalPayment)}
            </p>
            <p className="text-xs text-ink/70 mb-4">
              Sudah termasuk biaya admin. Berlaku sampai{' '}
              {pakasirPayment.expiredAt ? new Date(pakasirPayment.expiredAt).toLocaleTimeString('id-ID') : '-'}
            </p>

            <p className="text-xs text-ink/60 mb-4">
              {isPolling ? '⏳ Menunggu pembayaran... halaman ini akan otomatis lanjut setelah terbayar.' : 'Polling dihentikan (timeout).'}
            </p>

            <button
              onClick={() => navigate(`/status/${pakasirPayment.trxId}`)}
              className="btn-primary w-full py-2.5 text-sm mb-2"
            >
              Sudah Bayar / Cek Status Manual
            </button>
            <button
              onClick={() => setPakasirPayment(null)}
              className="btn-ghost w-full py-2.5 text-sm text-red-600"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 py-4 border-b-2 border-ink bg-white shrink-0">
        <span className="text-xs text-ink/65">Beranda / Kategori / </span>
        <span className="font-bold text-sm">{categoryName}</span>
      </div>
      <div className="px-4 md:px-8 py-6 grid lg:grid-cols-3 gap-8 bg-white flex-1 items-start">
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-8">
            <div className="w-full h-40 bg-violet-100 rounded-xl mb-4 border-2 border-ink/5 flex items-center justify-center overflow-hidden">
              {categoryIcon ? (
                <img
                  src={resolveIconUrl(categoryIcon, 400)}
                  alt={categoryName}
                  className="w-full h-full object-cover"
                  width="400"
                  height="160"
                />
              ) : (
                <span className="font-display font-700 text-3xl text-violet-300">
                  {categoryName.substring(0,2).toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="font-display font-700 text-2xl">{categoryName}</h2>
            <p className="text-xs text-ink/70 mt-1">Top up resmi, instan, & aman.</p>
            <div className="flex gap-2 mt-4">
              <span className="badge">Instan</span>
              <span className="badge-outline">Buka 24 Jam</span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 card p-5 md:p-6 h-fit">
          <p className="font-display font-700 text-sm tracking-widest text-ink/65 mb-1">STEP 1 — DATA AKUN</p>
          <p className="text-xs text-ink/70 mb-4">{inputConfig.desc}</p>
          
          <div className={`grid ${inputConfig.type !== 'single' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3 mb-3`}>
            <input 
              className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" 
              placeholder={inputConfig.label1} 
              value={userId} onChange={e => setUserId(e.target.value)}
            />
            
            {inputConfig.type === 'double' && (
              <input 
                className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" 
                placeholder={inputConfig.label2} 
                value={zoneId} onChange={e => setZoneId(e.target.value)}
              />
            )}
            {inputConfig.type === 'server' && (
              <select 
                className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 cursor-pointer bg-white"
                value={zoneId} onChange={e => setZoneId(e.target.value)}
              >
                <option value="" disabled>{inputConfig.label2}</option>
                <option value="os_asia">Asia Server</option>
                <option value="os_usa">America Server</option>
                <option value="os_euro">Europe Server</option>
                <option value="os_cht">TW, HK, MO Server</option>
              </select>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input 
              className="flex-1 border-2 border-ink bg-ink/5 rounded-[10px] px-3.5 py-2 text-sm outline-none font-bold text-violet-700 cursor-not-allowed placeholder-ink/40"
              placeholder="Nickname Game (Otomatis)"
              value={nickname}
              readOnly
            />
            <button 
              onClick={handleCheckNickname}
              disabled={!userId || (inputConfig.type !== 'single' && !zoneId) || isCheckingName}
              className="btn-primary w-full sm:w-auto px-4 py-2 text-sm whitespace-nowrap disabled:opacity-50"
            >
              {isCheckingName ? 'Mengecek...' : 'Cek Nickname'}
            </button>
          </div>

          <div className="mb-6">
            <input 
              type="email"
              className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" 
              placeholder="Alamat Email (Untuk bukti pembayaran)" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <p className="font-display font-700 text-sm tracking-widest text-ink/65 mb-2">STEP 2 — PILIH NOMINAL</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {products.length > 0 ? products.map(product => (
              <div 
                key={product.id} 
                onClick={() => setSelectedProduct(product)}
                className={`card-sm p-3 text-center cursor-pointer transition-all duration-200 ${
                  selectedProduct?.id === product.id 
                    ? '!bg-[#facc15] text-ink shadow-[4px_4px_0px_0px_#0f172a] -translate-y-1 !border-ink' 
                    : 'bg-white text-ink hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#0f172a]'
                }`}
              >
                <p className="font-bold text-sm">{product.product_name}</p>
                <p className={`text-xs mt-1 ${selectedProduct?.id === product.id ? 'text-ink/80 font-semibold' : 'text-ink/60'}`}>
                  {formatRupiah(product.price_member)}
                </p>
              </div>
            )) : (
              <p className="text-sm text-ink/70 col-span-full">Memuat produk...</p>
            )}
          </div>
          <p className="font-display font-700 text-sm tracking-widest text-ink/65 mb-2">STEP 3 — KODE VOUCHER</p>
          {token ? (
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  className="flex-1 border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 disabled:bg-ink/5 disabled:text-ink/70" 
                  placeholder="Masukkan Kode Voucher" 
                  value={promoCodeInput} 
                  onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                  disabled={appliedPromo !== null}
                />
                {!appliedPromo ? (
                  <button 
                    onClick={checkPromo} 
                    disabled={!promoCodeInput || isCheckingPromo || !selectedProduct}
                    className="btn-primary w-full sm:w-auto px-6 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {isCheckingPromo ? 'Cek...' : 'Terapkan'}
                  </button>
                ) : (
                  <button 
                    onClick={removePromo} 
                    className="btn-ghost w-full sm:w-auto px-6 py-2 text-sm whitespace-nowrap text-red-600 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 border-2 border-violet-200 border-dashed bg-violet-50 rounded-xl text-center">
              <p className="text-sm font-bold text-violet-700">
                🎉 Punya kode voucher? <span onClick={() => navigate('/auth')} className="underline cursor-pointer hover:text-violet-900">Login sekarang</span> untuk mendapatkan diskon spesial!
              </p>
            </div>
          )}
          <p className="font-display font-700 text-sm tracking-widest text-ink/65 mb-2">STEP 4 — METODE BAYAR</p>
          <div className="flex gap-3 flex-wrap mb-8">
            {token && activeGateways.wallet && (
              <span 
                onClick={() => setPaymentMethod('wallet')} 
                className={`cursor-pointer w-full sm:w-auto text-center ${paymentMethod === 'wallet' ? 'badge' : 'badge-outline'}`}
              >
                Saldo ArTa Zone
              </span>
            )}
            {activeGateways.midtrans && (
              <span 
                onClick={() => setPaymentMethod('qris')} 
                className={`cursor-pointer w-full sm:w-auto text-center ${paymentMethod === 'qris' ? 'badge' : 'badge-outline'}`}
              >
                QRIS / E-Wallet (Midtrans)
              </span>
            )}
            {activeGateways.pakasir && (
              <span 
                onClick={() => setPaymentMethod('pakasir')} 
                className={`cursor-pointer w-full sm:w-auto text-center ${paymentMethod === 'pakasir' ? 'badge' : 'badge-outline'}`}
              >
                QRIS (Pakasir)
              </span>
            )}
            {!activeGateways.wallet && !activeGateways.midtrans && !activeGateways.pakasir && (
              <p className="text-sm text-red-600 font-bold">Semua metode pembayaran sedang tidak tersedia. Coba lagi nanti.</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center border-t-2 border-ink pt-5 gap-4">
            <div className="text-center sm:text-left w-full sm:w-auto">
              <p className="text-xs font-bold text-ink/70">Total Bayar</p>
              {appliedPromo && selectedProduct ? (
                <div className="flex items-center gap-3 justify-center sm:justify-start mt-1">
                  <p className="text-sm font-bold text-ink/65 line-through decoration-red-500 decoration-2">
                    {formatRupiah(basePrice)}
                  </p>
                  <p className="font-display font-700 text-2xl text-violet-700">
                    {formatRupiah(finalPrice)}
                  </p>
                </div>
              ) : (
                <p className="font-display font-700 text-2xl text-violet-700 mt-1">
                  {formatRupiah(finalPrice)}
                </p>
              )}
            </div>
            <button 
              onClick={handleCheckout}
              className={`px-8 py-3 w-full sm:w-auto text-sm ${selectedProduct && userId && (!inputConfig.type.includes('double') || zoneId) && email && !isLoading ? 'btn-primary glow' : 'btn-ghost opacity-50 cursor-not-allowed'}`}
              disabled={!selectedProduct || !userId || (inputConfig.type !== 'single' && !zoneId) || !email || isLoading}
            >
              {isLoading ? 'Memproses...' : 'Lanjut ke Pembayaran'}
            </button>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
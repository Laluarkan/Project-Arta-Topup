/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

// Komponen Popup Kecil
const PopupModal = ({ isOpen, message, onClose, type = 'error', extraAction }) => {
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
        {extraAction}
        <button onClick={onClose} className="btn-ghost w-full py-2.5 text-sm">
          Tutup
        </button>
      </div>
    </div>
  );
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [popup, setPopup] = useState({ isOpen: false, message: '', type: 'error' });
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tangani hasil klik link verifikasi email (?verified=1 / ?verified=0)
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === '1') {
      setPopup({ isOpen: true, message: 'Email berhasil diverifikasi! Silakan login.', type: 'success' });
    } else if (verified === '0') {
      setPopup({ isOpen: true, message: 'Link verifikasi tidak valid atau sudah kedaluwarsa.', type: 'error' });
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || (!isLogin && (!name || !phone))) {
      setPopup({ isOpen: true, message: 'Harap isi semua kolom yang diperlukan.', type: 'error' });
      return;
    }

    if (password.length < 8) {
      setPopup({ isOpen: true, message: 'Password minimal 8 karakter.', type: 'error' });
      return;
    }

    if (!isLogin) {
      if (password !== passwordConfirmation) {
        setPopup({ isOpen: true, message: 'Konfirmasi password tidak cocok.', type: 'error' });
        return;
      }
      if (!termsAccepted) {
        setPopup({ isOpen: true, message: 'Anda harus menyetujui Syarat & Ketentuan terlebih dahulu.', type: 'error' });
        return;
      }
    }

    setIsLoading(true);
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const payload = isLogin
      ? { email, password }
      : {
          name,
          email,
          phone,
          password,
          password_confirmation: passwordConfirmation,
          terms_accepted: termsAccepted,
          referral_code: referralCode || null
        };

    try {
      const res = await axios.post(`https://artazone-api.onrender.com${endpoint}`, payload, { timeout: 20000 });

      if (res.data.status === 'success') {
        if (!isLogin) {
          // Registrasi berhasil: JANGAN auto-login. Arahkan ke halaman "cek email" dulu.
          navigate(`/verify-email-notice?email=${encodeURIComponent(email)}`);
          return;
        }

        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
        navigate('/');
      }
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0][0] : null;
      const timeoutMessage = err.code === 'ECONNABORTED' ? 'Server terlalu lama merespons. Coba lagi beberapa saat lagi.' : null;

      // Kasus khusus: login ditolak karena email belum diverifikasi
      if (err.response?.data?.email_verified === false) {
        setUnverifiedEmail(err.response.data.data?.email || email);
        setPopup({
          isOpen: true,
          message: err.response.data.message,
          type: 'error'
        });
        return;
      }

      setPopup({
        isOpen: true,
        message: timeoutMessage || firstError || err.response?.data?.message || 'Terjadi kesalahan pada server.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await axios.post('https://artazone-api.onrender.com/api/email/resend-public', { email: unverifiedEmail });
      setPopup({ isOpen: true, message: 'Link verifikasi baru sudah dikirim. Cek inbox Anda.', type: 'success' });
    } catch (err) {
      setPopup({ isOpen: true, message: 'Gagal mengirim ulang. Coba lagi beberapa saat lagi.', type: 'error' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <PopupModal
        isOpen={popup.isOpen}
        message={popup.message}
        type={popup.type}
        onClose={() => { setPopup({ ...popup, isOpen: false }); setUnverifiedEmail(''); }}
        extraAction={unverifiedEmail && popup.type === 'error' ? (
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className={`w-full py-2.5 text-sm mb-2 ${isResending ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-accent'}`}
          >
            {isResending ? 'Mengirim...' : 'Kirim Ulang Email Verifikasi'}
          </button>
        ) : null}
      />

      <div className="hidden lg:flex flex-col justify-between bg-ink text-white p-12">
        <div>
          <Link to="/" className="text-white/50 hover:text-white text-sm font-semibold transition-colors">
            ← Kembali ke Beranda
          </Link>
          <div className="mt-20">
            <h1 className="font-display font-700 text-5xl mb-6">
              ArTa<span className="text-violet-400">Zone</span>
            </h1>
            <p className="text-lg text-white/70 max-w-md leading-relaxed">
              Satu akun untuk top up semua game favoritmu — lebih cepat dengan saldo & voucher.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 relative">
        <Link to="/" className="lg:hidden absolute top-6 left-6 text-ink/70 hover:text-ink text-sm font-semibold">
          ← Beranda
        </Link>

        <form onSubmit={handleSubmit} className="card p-7 w-full max-w-sm">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-xs transition-colors ${isLogin ? 'btn-primary' : 'btn-ghost'}`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-xs transition-colors ${!isLogin ? 'btn-primary' : 'btn-ghost'}`}
            >
              Daftar
            </button>
          </div>

          <div className="space-y-3">
            {!isLogin && (
              <>
                <input
                  className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
                  placeholder="Nama Lengkap"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
                  placeholder="Nomor HP/WhatsApp"
                  type="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                />
              </>
            )}
            <input
              className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
              placeholder="Email"
              type="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
              placeholder="Password"
              type="password"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />

            {!isLogin && (
              <>
                <input
                  className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
                  placeholder="Konfirmasi Password"
                  type="password"
                  value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
                <input
                  className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
                  placeholder="Kode Referral (opsional)"
                  value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                />
                <label className="flex items-start gap-2 text-xs text-ink/60 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span>
                    Saya setuju dengan{' '}
                    <Link to="/terms" target="_blank" className="text-violet-600 underline">Syarat & Ketentuan</Link>
                    {' '}dan{' '}
                    <Link to="/privacy" target="_blank" className="text-violet-600 underline">Kebijakan Privasi</Link>
                  </span>
                </label>
              </>
            )}

            {isLogin && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-violet-600 hover:underline">
                  Lupa password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-sm mt-2 ${isLoading ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-accent'}`}
            >
              {isLoading ? 'Memproses...' : (isLogin ? 'Masuk ke Akun' : 'Buat Akun Baru')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
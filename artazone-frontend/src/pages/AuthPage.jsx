import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

// Komponen Popup Kecil
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

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk Popup
  const [popup, setPopup] = useState({ isOpen: false, message: '', type: 'error' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasi Manual untuk menghindari tooltip bawaan browser
    if (!email || !password || (!isLogin && !name)) {
      setPopup({ isOpen: true, message: 'Harap isi semua kolom yang diperlukan.', type: 'error' });
      return;
    }

    if (password.length < 8) {
      setPopup({ isOpen: true, message: 'Password minimal 8 karakter.', type: 'error' });
      return;
    }

    setIsLoading(true);
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await axios.post(`https://artazone-api.onrender.com${endpoint}`, payload);
      
      if (res.data.status === 'success') {
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
        navigate('/');
      }
    } catch (err) {
      setPopup({ 
        isOpen: true, 
        message: err.response?.data?.message || 'Terjadi kesalahan pada server.', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <PopupModal 
        isOpen={popup.isOpen} 
        message={popup.message} 
        type={popup.type} 
        onClose={() => setPopup({ ...popup, isOpen: false })} 
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
        <Link to="/" className="lg:hidden absolute top-6 left-6 text-ink/50 hover:text-ink text-sm font-semibold">
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
              <input 
                className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" 
                placeholder="Nama Lengkap" 
                value={name} onChange={(e) => setName(e.target.value)}
              />
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
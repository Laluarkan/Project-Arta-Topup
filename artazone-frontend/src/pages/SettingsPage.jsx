import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    axios.get('http://127.0.0.1:8000/api/user', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setUser(res.data);
        setName(res.data.name);
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/auth');
      })
      .finally(() => setIsLoading(false));
  }, [navigate, token]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.put('http://127.0.0.1:8000/api/user/profile', { name, password }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Profil berhasil diperbarui!');
      setPassword(''); 
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl w-full mx-auto p-8 grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          <div className="card p-5 mb-6 bg-violet-50 border-violet-200">
            <p className="text-xs text-ink/50 font-bold mb-1">Total Saldo</p>
            <p className="font-display font-700 text-2xl text-violet-700">{formatRupiah(user?.balance)}</p>
          </div>
          <Link to="/dashboard" className={`block w-full text-left px-4 py-3 text-sm font-bold rounded-lg ${location.pathname === '/dashboard' ? 'bg-ink text-white' : 'text-ink/60 hover:bg-ink/5'}`}>Dashboard</Link>
          <Link to="/tickets" className={`block w-full text-left px-4 py-3 text-sm font-bold rounded-lg ${location.pathname === '/tickets' ? 'bg-ink text-white' : 'text-ink/60 hover:bg-ink/5'}`}>Tiket Komplain</Link>
          <Link to="/settings" className={`block w-full text-left px-4 py-3 text-sm font-bold rounded-lg ${location.pathname === '/settings' ? 'bg-ink text-white' : 'text-ink/60 hover:bg-ink/5'}`}>Pengaturan Profil</Link>
        </div>

        <div className="lg:col-span-3">
          <h1 className="font-display font-700 text-2xl mb-6">Pengaturan Profil</h1>
          
          <form onSubmit={handleUpdate} className="card p-6 max-w-xl">
            <div className="mb-4">
              <label className="block text-xs font-bold text-ink/70 mb-2">Nama Lengkap</label>
              <input 
                type="text" 
                className="w-full border-2 border-ink rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-600" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-ink/70 mb-2">Email (Tidak bisa diubah)</label>
              <input 
                type="email" 
                className="w-full border-2 border-ink/20 bg-ink/5 rounded-lg px-4 py-2.5 text-sm outline-none text-ink/50 cursor-not-allowed" 
                value={user?.email}
                disabled
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-ink/70 mb-2">Password Baru (Opsional)</label>
              <input 
                type="password" 
                className="w-full border-2 border-ink rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-600" 
                placeholder="Kosongkan jika tidak ingin mengubah sandi"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-sm" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
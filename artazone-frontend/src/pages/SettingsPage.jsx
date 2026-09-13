/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import UserSidebar from '../components/UserSidebar';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    axios.get('https://artazone-api.onrender.com/api/user', { headers: { Authorization: `Bearer ${token}` } })
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
      await axios.put('https://artazone-api.onrender.com/api/user/profile', { name, password }, {
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


  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl w-full mx-auto p-8 grid lg:grid-cols-4 gap-8">
        <UserSidebar />

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
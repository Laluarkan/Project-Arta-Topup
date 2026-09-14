import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import logo from '../assets/arta_logo.svg';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (token) {
      try {
        await api.post('/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error(error);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="px-4 md:px-8 py-3 md:py-5 border-b-2 border-ink bg-white sticky top-0 z-50">
      <div className="flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
          <img src={logo} alt="ArTaZone Logo" className="h-8 w-8" />
          <div className="font-display font-700 text-xl md:text-2xl text-ink">
            ArTa<span className="text-gold-700"> Zone</span>
          </div>
        </Link>
        
        <div className="hidden lg:flex gap-7 text-sm font-semibold text-ink/70">
          <Link to="/" className="cursor-pointer hover:text-ink">Beranda</Link>
          <Link to="/categories" className="cursor-pointer hover:text-ink">Kategori</Link>
          <Link to="/promo" className="cursor-pointer hover:text-ink">Promo</Link>
          <Link to="/help" className="cursor-pointer hover:text-ink">Bantuan</Link>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {!token ? (
            <>
              <Link to="/auth" className="btn-ghost px-3 md:px-4 py-2 text-[10px] md:text-xs flex items-center justify-center">Masuk</Link>
              <Link to="/auth" className="btn-accent px-3 md:px-4 py-2 text-[10px] md:text-xs flex items-center justify-center">Daftar</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="btn-accent px-3 md:px-4 py-2 text-[10px] md:text-xs flex items-center justify-center">Dashboard</Link>
              <button onClick={handleLogout} className="btn-ghost px-3 md:px-4 py-2 text-[10px] md:text-xs flex items-center justify-center">Logout</button>
            </>
          )}

          <button 
            className="lg:hidden text-ink p-1 ml-1"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b-2 border-ink shadow-lg py-4 px-6 flex flex-col gap-4 animate-in slide-in-from-top-2">
          <Link to="/" onClick={closeMenu} className="text-sm font-semibold text-ink/70 hover:text-ink">Beranda</Link>
          <Link to="/categories" onClick={closeMenu} className="text-sm font-semibold text-ink/70 hover:text-ink">Kategori</Link>
          <Link to="/promo" onClick={closeMenu} className="text-sm font-semibold text-ink/70 hover:text-ink">Promo</Link>
          <Link to="/help" onClick={closeMenu} className="text-sm font-semibold text-ink/70 hover:text-ink">Bantuan</Link>
        </div>
      )}
    </nav>
  );
}
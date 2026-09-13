import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function LandingPage() {
  const [categories, setCategories] = useState([]);
  const [trendingGames, setTrendingGames] = useState([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  useEffect(() => {
    axios.get('https://artazone-api.onrender.com/api/categories')
      .then(res => {
        if (res.data.status === 'success') {
          const activeCategories = res.data.data.filter(c => c.is_active);
          setCategories(activeCategories);
        }
      })
      .catch(err => console.error("Gagal menarik data kategori:", err));

    axios.get('https://artazone-api.onrender.com/api/trending-games')
      .then(res => {
        if (res.data.status === 'success') {
          setTrendingGames(res.data.data);
        }
      })
      .catch(err => console.error("Gagal menarik data trending:", err))
      .finally(() => setIsLoadingTrending(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto font-sans text-ink">
      <Navbar />

      <div className="px-4 md:px-8 py-10 md:py-16 grid lg:grid-cols-2 gap-8 md:gap-10 items-center bg-gradient-to-b from-violet-50 to-white">
        <div>
          <h1 className="font-display font-700 text-4xl sm:text-5xl lg:text-6xl leading-[1.1] md:leading-[0.95] mt-4">
            TOP UP GAME,<br /><span className="text-violet-600">INSTAN</span> & <span className="text-gold-500">AMAN.</span>
          </h1>
          <p className="mt-4 md:mt-5 text-ink/60 text-sm md:text-base max-w-md">
            Isi ulang diamond, UC, token PLN, atau voucher favoritmu dalam hitungan detik. Ratusan produk, satu tempat.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-7">
            <Link to="/categories" className="btn-primary px-6 py-3 text-sm glow flex items-center justify-center">Mulai Top Up</Link>
            <Link to="/promo" className="btn-ghost px-6 py-3 text-sm flex items-center justify-center">Lihat Promo</Link>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-6 mt-6 md:mt-8 text-[10px] sm:text-xs text-ink/50 font-semibold">
            <span>✓ 500rb+ Transaksi</span>
            <span>✓ 24/7 CS Aktif</span>
            <span>✓ Auto Refund</span>
          </div>
        </div>
        
        <div className="card p-5 md:p-6 glow md:rotate-1 bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="font-display font-700 text-sm md:text-base">Trending Hari Ini</span>
            <span className="bg-gold-500 badge-outline text-[10px]">LIVE</span>
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {isLoadingTrending ? (
              <p className="text-xs text-ink/50 col-span-3 text-center py-4">Memuat trending...</p>
            ) : trendingGames.length > 0 ? (
              trendingGames.map((game, index) => (
                <Link to={`/detail/${game.id}`} key={game.id} className="card-sm p-2 md:p-3 text-center cursor-pointer hover:-translate-y-1 transition group">
                  <div className={`w-full h-12 md:h-14 rounded-lg mb-2 border border-ink/10 flex items-center justify-center overflow-hidden ${index % 2 === 0 ? 'bg-violet-100' : 'bg-gold-100'}`}>
                    {game.icon ? (
                      <img src={game.icon} alt={game.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-ink/30 text-lg md:text-xl group-hover:text-ink/60">
                        {game.name.substring(0,2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] md:text-[10px] font-bold truncate" title={game.name}>{game.name}</p>
                </Link>
              ))
            ) : (
              <p className="text-xs text-ink/50 col-span-3 text-center py-4">Belum ada data trending.</p>
            )}
          </div>
        </div>
      </div>

      <div className="cut-divider"></div>

      <div className="px-4 md:px-8 py-10 md:py-14 bg-white">
        <h2 className="font-display font-700 text-2xl md:text-3xl mb-1">Kategori Populer</h2>
        <p className="text-ink/50 text-xs md:text-sm mb-6">Pilih produk, masukkan ID, langsung masuk.</p>
        
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {categories.length > 0 ? (
            categories.slice(0, 11).map((category, index) => (
              <Link to={`/detail/${category.id}`} key={category.id} className="card-sm p-2 md:p-3 text-center hover:-translate-y-1 transition cursor-pointer group flex flex-col items-center justify-start">
                <div className={`w-full aspect-square rounded-lg mb-2 border border-ink/10 flex items-center justify-center overflow-hidden ${index % 2 === 0 ? 'bg-violet-100' : 'bg-gold-100'}`}>
                  {category.icon ? (
                    <img src={category.icon} alt={category.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-ink/30 text-xl md:text-2xl group-hover:text-ink/60">
                      {category.name.substring(0,2).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-[10px] md:text-[11px] font-bold truncate w-full" title={category.name}>{category.name}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm font-semibold text-ink/50 col-span-full">Memuat kategori...</p>
          )}
          
          {categories.length > 0 && (
            <Link to="/categories" className="card-sm p-3 md:p-4 text-center hover:-translate-y-1 transition cursor-pointer flex flex-col justify-center items-center bg-ink text-white">
              <p className="text-[10px] md:text-xs font-bold text-gold-700">Lihat Semua Kategori →</p>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-ink text-white py-3 overflow-hidden relative flex items-center w-full">
        <style>{`
          @keyframes scroll {
            0% { transform: translateX(100vw); }
            100% { transform: translateX(-100%); }
          }
          .animate-scroll {
            display: inline-block;
            white-space: nowrap;
            animation: scroll 25s linear infinite;
            will-change: transform;
          }
          .animate-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>
        
        <p className="animate-scroll font-display font-700 text-xs md:text-sm tracking-widest cursor-default">
          ⚡ PROSES TRANSAKSI OTOMATIS HANYA DALAM HITUNGAN DETIK &nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp; LAYANAN TOP UP GAME & PPOB BUKA 24 JAM NONSTOP &nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp; TRANSAKSI AMAN, CEPAT, DAN TERPERCAYA DI ARTA ZONE
        </p>
      </div>

      <Footer />
    </div>
  );
}
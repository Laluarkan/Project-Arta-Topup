import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { resolveIconUrl } from '../utils/resolveIconUrl';

export default function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');

  useEffect(() => {
    axios.get('https://artazone-api.onrender.com/api/categories')
      .then(res => {
        if (res.data.status === 'success') {
          setCategories(res.data.data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const getCategoryType = (name) => {
    const upper = name.toUpperCase();
    const providers = ['TELKOMSEL', 'INDOSAT', 'XL', 'AXIS', 'SMARTFREN', 'TRI', 'THREE', 'BY.U', 'ISAT'];
    const others = ['PLN', 'PDAM', 'BPJS', 'DANA', 'OVO', 'GOPAY', 'SHOPEEPAY', 'LINKAJA', 'E-MONEY', 'GRAB', 'GOJEK', 'MAXIM', 'WIFI', 'VISION', 'MTIX', 'TIX', 'PERTAMINA GAS'];

    if (providers.some(p => upper.includes(p))) return 'Pulsa & Data';
    if (others.some(p => upper.includes(p))) return 'Lainnya';
    return 'Game';
  };

  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'Semua' || getCategoryType(c.name) === activeTab;
    return matchesSearch && matchesTab;
  });

  const tabs = ['Semua', 'Game', 'Pulsa & Data', 'Lainnya'];

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      <Navbar />

      <div className="px-8 py-10 bg-violet-50 border-b-2 border-ink">
        <h1 className="font-display font-700 text-3xl mb-2">Kategori Produk</h1>
        <p className="text-sm text-ink/60 mb-6">Pilih kategori favoritmu dan nikmati kemudahan top up.</p>
        
        <input 
          className="w-full max-w-md border-2 border-ink rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-600 shadow-brutal-sm transition-all mb-4" 
          placeholder="Cari kategori (contoh: Free Fire, Telkomsel)..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-bold rounded-full border-2 border-ink transition-all ${activeTab === tab ? 'bg-violet-600 text-white shadow-brutal-sm' : 'bg-white text-ink/70 hover:bg-violet-100'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filteredCategories.length > 0 ? filteredCategories.map(category => (
          <Link to={`/detail/${category.id}`} key={category.id} className="card p-3 hover:-translate-y-1 hover:shadow-brutal transition-all cursor-pointer bg-white group flex flex-col items-center justify-start">
            
            <div className="w-full aspect-square bg-violet-100 rounded-lg mb-2 border-2 border-ink group-hover:bg-gold-100 transition-colors flex items-center justify-center overflow-hidden">
              {category.icon ? (
                <img src={resolveIconUrl(category.icon, 130)} alt={category.name} className="w-full h-full object-cover" loading="lazy" width="130" height="130" />
              ) : (
                <span className="font-bold text-violet-300 text-2xl group-hover:text-gold-400">
                  {category.name.substring(0,2).toUpperCase()}
                </span>
              )}
            </div>

            <p className="font-bold text-xs text-center line-clamp-2 leading-tight">{category.name}</p>
          </Link>
        )) : (
          <p className="text-sm text-ink/50 col-span-full">Kategori tidak ditemukan atau sedang memuat...</p>
        )}
      </div>
      <Footer />
    </div>
  );
}
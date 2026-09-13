import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PromoPage() {
  const [promos, setPromos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const colors = ['bg-red-100', 'bg-violet-100', 'bg-gold-100', 'bg-blue-100', 'bg-green-100'];

  useEffect(() => {
    axios.get('https://artazone-api.onrender.com/api/promos')
      .then(res => setPromos(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "Tidak ada kedaluwarsa";
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      <Navbar />

      <div className="px-8 py-10 bg-violet-50 border-b-2 border-ink">
        <h1 className="font-display font-700 text-3xl mb-2">Promo & Voucher 🔥</h1>
        <p className="text-sm text-ink/60">Gunakan kode voucher di bawah ini saat checkout untuk mendapatkan harga terbaik.</p>
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full">
        {isLoading ? (
          <p className="text-center font-bold text-ink/70 py-10">Memuat promo...</p>
        ) : promos.length === 0 ? (
          <p className="text-center font-bold text-ink/70 py-10">Yahh, saat ini belum ada promo yang tersedia.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promos.map((promo, index) => (
              <div key={promo.id} className="card p-0 overflow-hidden flex flex-col bg-white">
                <div className={`h-32 ${colors[index % colors.length]} border-b-2 border-ink flex items-center justify-center p-6 text-center`}>
                  <h2 className="font-display font-700 text-xl">{promo.title}</h2>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-sm text-ink/70 mb-6 flex-1">{promo.description || 'Dapatkan potongan harga spesial dari ArTa Zone!'}</p>
                  
                  <div className="mb-4">
                    <p className="text-xs font-bold text-ink/70 mb-1">Kode Voucher:</p>
                    <div className="border-2 border-ink border-dashed rounded-lg px-4 py-2 text-center font-mono font-bold text-lg bg-ink/5">
                      {promo.code}
                    </div>
                  </div>
                  
                  <p className="text-xs text-ink/70 text-center font-bold">
                    Berlaku hingga: {formatDate(promo.expired_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}
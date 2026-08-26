import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminSettings() {
  const [formData, setFormData] = useState({
    margin: '0',
    maintenance: false,
    api_mode: 'development'
  });
  const [digiflazzBalance, setDigiflazzBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get('https://artazone-api.onrender.com/api/admin/settings', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      const data = res.data.data;
      setFormData({
        margin: data.margin || '0',
        maintenance: data.maintenance === '1',
        api_mode: data.api_mode || 'development'
      });
      setDigiflazzBalance(data.digiflazz_balance || 0);
    })
    .catch(err => console.error("Gagal memuat pengaturan:", err))
    .finally(() => setIsLoading(false));
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Ubah format data agar sesuai dengan penanganan array di SettingController backend kita
    const payload = {
      settings: [
        { key: 'margin', value: formData.margin },
        { key: 'maintenance', value: formData.maintenance ? '1' : '0' },
        { key: 'api_mode', value: formData.api_mode }
      ]
    };

    try {
      await axios.post('https://artazone-api.onrender.com/api/admin/settings', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Pengaturan sistem berhasil disimpan!');
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat menyimpan pengaturan.');
    }
  };

  const toggleApiMode = () => {
    setFormData(prev => ({
      ...prev,
      api_mode: prev.api_mode === 'development' ? 'production' : 'development'
    }));
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-violet-50/30"><p className="font-bold text-violet-700">Memuat Pengaturan...</p></div>;
  }

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />
      
      <div className="flex-1 overflow-y-auto p-8 relative">
        <h1 className="font-display font-700 text-2xl mb-8">Pengaturan Sistem</h1>

        <form onSubmit={handleSave} className="max-w-4xl space-y-8">
          
          {/* Box Informasi Saldo Digiflazz */}
          <div className="card p-6 bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink/70">Saldo Digiflazz (Pusat)</h2>
              <p className="text-xs text-ink/50 mt-1">Sisa saldo modal untuk memproses transaksi otomatis.</p>
            </div>
            <div className="text-right">
              <p className="font-display font-700 text-3xl text-violet-700">{formatRupiah(digiflazzBalance)}</p>
            </div>
          </div>

          {/* KARTU PENGATURAN MODE API (DEVELOPMENT / PRODUCTION) */}
          <div className={`card p-6 border-2 border-ink shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-colors ${formData.api_mode === 'production' ? 'bg-red-50' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-ink/70 flex items-center gap-2">
                  Mode Sistem API (Environment Mode)
                  {formData.api_mode === 'production' ? (
                    <span className="badge bg-red-100 text-red-700 border-red-700">LIVE / PRODUCTION</span>
                  ) : (
                    <span className="badge bg-yellow-100 text-yellow-700 border-yellow-700">SANDBOX / DEVELOPMENT</span>
                  )}
                </h2>
                <p className="text-xs text-ink/60 mt-1">
                  Pilih apakah aplikasi menggunakan kunci Sandbox untuk pengujian atau kunci Live untuk transaksi nyata secara otomatis.
                </p>
              </div>
              
              {/* Tombol Toggle Brutalist */}
              <button 
                type="button" 
                onClick={toggleApiMode}
                className={`w-16 h-8 rounded-full border-2 border-ink flex items-center p-1 transition-all cursor-pointer ${formData.api_mode === 'production' ? 'bg-red-500 justify-end' : 'bg-ink/15 justify-start'}`}
              >
                <div className="w-5 h-5 rounded-full border-2 border-ink bg-white shadow-sm"></div>
              </button>
            </div>

            {formData.api_mode === 'production' && (
              <div className="p-3 bg-red-100 border-2 border-red-300 border-dashed rounded-lg text-red-800 text-xs font-bold mt-4">
                ⚠️ PERINGATAN: Sistem saat ini berada dalam mode LIVE. Semua transaksi yang dilakukan akan memotong saldo asli Digiflazz dan menagih uang nyata dari pelanggan via Midtrans!
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            <div className="card p-6 bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <h2 className="text-sm font-bold text-ink/70 mb-4">Keamanan Kunci API (.env)</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-ink/50 mb-1 block">Konfigurasi Kunci Ganda</label>
                  <input 
                    type="text" 
                    disabled
                    className="w-full border-2 border-ink rounded-lg px-4 py-2.5 text-sm outline-none bg-ink/5 text-ink/40 font-mono cursor-not-allowed" 
                    value="Diatur melalui file .env server (_DEV / _PROD)"
                  />
                </div>
                <p className="text-[10px] text-ink/50 italic leading-relaxed">
                  *Sistem otomatis mendeteksi kunci Midtrans dan Digiflazz berdasarkan mode pilihan di atas tanpa perlu mengubah file kode secara manual.
                </p>
              </div>
            </div>

            <div className="card p-6 bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <h2 className="text-sm font-bold text-ink/70 mb-4">Margin & Umum</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-ink/50 mb-1 block">Margin Keuntungan Global (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      step="0.1"
                      className="w-full border-2 border-ink rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-600 font-bold" 
                      value={formData.margin}
                      onChange={e => setFormData({...formData, margin: e.target.value})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-ink/50">%</span>
                  </div>
                  <p className="text-[10px] text-ink/50 mt-1 italic">
                    *Margin ini akan otomatis ditambahkan ke harga modal saat melakukan tarik data dari Digiflazz.
                  </p>
                </div>
                
                <div className="flex items-center justify-between border-2 border-ink rounded-lg px-4 py-2.5 bg-white mt-6">
                  <span className="text-sm font-bold text-ink/70">Mode Maintenance</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.maintenance}
                      onChange={e => setFormData({...formData, maintenance: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-ink/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>
              </div>
            </div>

          </div>

          <button type="submit" className="btn-primary px-8 py-3 text-sm glow font-bold">
            SIMPAN PENGATURAN
          </button>
        </form>
      </div>
    </div>
  );
}
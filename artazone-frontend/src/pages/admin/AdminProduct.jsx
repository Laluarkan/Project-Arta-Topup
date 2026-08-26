/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminProduct() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ price_member: 0, is_active: true });

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchProducts = () => {
    axios.get('http://127.0.0.1:8000/api/admin/products', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setProducts(res.data.data))
    .catch(err => console.error(err))
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchProducts();
  }, [navigate, token]);

  const handleSync = async () => {
    if (!window.confirm('Proses ini akan menarik data harga modal terbaru dari Digiflazz dan MENERAPKAN MARGIN yang sudah Anda atur. Lanjutkan?')) return;
    setIsSyncing(true);
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/admin/sync-products', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ ' + res.data.message);
      fetchProducts();
    } catch (error) {
      alert('❌ Gagal menyinkronkan produk. Pastikan API Key di .env sudah benar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://127.0.0.1:8000/api/admin/products/${editingProduct.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ Produk berhasil diperbarui (Edit Manual)');
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      alert('❌ Gagal memperbarui produk');
    }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(search.toLowerCase()) || 
    p.buyer_sku_code.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-violet-50/30"><p className="font-bold text-violet-700">Memuat Data...</p></div>;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-700 text-2xl">Manajemen Produk</h1>
          <button onClick={handleSync} disabled={isSyncing} className="btn-primary px-4 py-2 text-sm glow font-bold">
            {isSyncing ? 'Menyinkronkan...' : '↻ SINKRONISASI API'}
          </button>
        </div>

        <div className="card p-0 bg-white overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <div className="p-4 border-b-2 border-ink flex gap-4 bg-ink/5">
            <input 
              type="text"
              placeholder="Cari SKU, Nama Produk, atau Kategori..."
              className="flex-1 border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b-2 border-ink text-[10px] tracking-widest text-ink/50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold">SKU</th>
                  <th className="p-4 font-bold">NAMA PRODUK</th>
                  <th className="p-4 font-bold">KATEGORI</th>
                  <th className="p-4 font-bold">HARGA MODAL</th>
                  <th className="p-4 font-bold">HARGA JUAL</th>
                  <th className="p-4 font-bold text-center">STATUS</th>
                  <th className="p-4 font-bold text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-violet-50/50">
                    <td className="p-4 font-mono text-xs font-bold text-ink/60">{product.buyer_sku_code}</td>
                    <td className="p-4 font-bold">{product.product_name}</td>
                    <td className="p-4 text-xs font-bold">{product.category?.name}</td>
                    <td className="p-4 text-ink/60">{formatRupiah(product.provider_price)}</td>
                    <td className="p-4 font-bold text-violet-700">{formatRupiah(product.price_member)}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border-2 ${product.is_active ? 'bg-gold-400 border-ink' : 'bg-ink/10 border-ink/20 text-ink/50'}`}>
                        {product.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setEditForm({ price_member: product.price_member, is_active: product.is_active });
                        }}
                        className="btn-ghost px-3 py-1 text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan="7" className="p-8 text-center text-ink/50 font-bold">Produk tidak ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingProduct && (
        <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h2 className="font-display font-700 text-xl mb-1">Edit Produk (Manual)</h2>
            <p className="text-xs text-ink/50 font-mono mb-6">{editingProduct.buyer_sku_code} — {editingProduct.product_name}</p>
            
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-ink/70 mb-2">Harga Modal (Dari Provider)</label>
                <input type="text" className="w-full border-2 border-ink/20 bg-ink/5 rounded-lg px-4 py-2 text-sm text-ink/50 cursor-not-allowed font-bold" value={formatRupiah(editingProduct.provider_price)} disabled />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-ink/70 mb-2">Harga Jual (Override Manual)</label>
                <input 
                  type="number" 
                  className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 font-bold" 
                  value={editForm.price_member}
                  onChange={(e) => setEditForm({...editForm, price_member: e.target.value})}
                  required
                />
                <p className="text-[10px] text-ink/50 mt-1 italic">
                  *Peringatan: Harga manual ini akan tertimpa otomatis jika Anda menekan tombol "Sinkronisasi API".
                </p>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="isActive"
                  className="w-4 h-4 cursor-pointer accent-violet-600"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                />
                <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Produk Aktif (Tampil di website)</label>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingProduct(null)} className="btn-ghost flex-1 py-2 text-sm font-bold">Batal</button>
                <button type="submit" className="btn-primary flex-1 py-2 text-sm glow font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
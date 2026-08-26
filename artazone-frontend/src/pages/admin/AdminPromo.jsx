/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminPromo() {
  const [promos, setPromos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    title: '', description: '', code: '', type: 'percent', 
    value: '', limit: '', expired_at: '', is_active: true
  };
  const [formData, setFormData] = useState(initialForm);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchPromos = () => {
    axios.get('http://127.0.0.1:8000/api/admin/promos', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setPromos(res.data.data))
    .catch(err => console.error(err))
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchPromos();
  }, [navigate, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://127.0.0.1:8000/api/admin/promos/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://127.0.0.1:8000/api/admin/promos', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      fetchPromos();
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan promo.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus voucher ini?')) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/admin/promos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPromos();
    } catch (error) {
      alert('Gagal menghapus voucher.');
    }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const getStatusBadge = (promo) => {
    if (!promo.is_active) return <span className="text-[10px] font-bold px-2 py-1 rounded-md border-2 border-ink bg-ink/10">NONAKTIF</span>;
    if (promo.limit && promo.used >= promo.limit) return <span className="text-[10px] font-bold px-2 py-1 rounded-md border-2 border-ink bg-red-100 text-red-700">HABIS</span>;
    return <span className="text-[10px] font-bold px-2 py-1 rounded-md border-2 border-ink bg-gold-400">AKTIF</span>;
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEditModal = (promo) => {
    setEditingId(promo.id);
    setFormData({
      title: promo.title,
      description: promo.description || '',
      code: promo.code,
      type: promo.type,
      value: promo.value,
      limit: promo.limit || '',
      expired_at: promo.expired_at || '',
      is_active: promo.is_active
    });
    setShowModal(true);
  };

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-700 text-2xl">Voucher & Promo</h1>
          <button onClick={openAddModal} className="btn-primary px-4 py-2 text-sm glow">
            + Tambah Voucher
          </button>
        </div>

        <div className="card p-0 bg-white overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b-2 border-ink text-[10px] tracking-widest text-ink/50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold">KODE</th>
                  <th className="p-4 font-bold text-center">TIPE</th>
                  <th className="p-4 font-bold">NILAI</th>
                  <th className="p-4 font-bold text-center">TERPAKAI / LIMIT</th>
                  <th className="p-4 font-bold">KADALUARSA</th>
                  <th className="p-4 font-bold text-center">STATUS</th>
                  <th className="p-4 font-bold text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {promos.map(promo => (
                  <tr key={promo.id} className="hover:bg-violet-50/50">
                    <td className="p-4">
                      <p className="font-mono font-bold uppercase">{promo.code}</p>
                      <p className="text-[10px] text-ink/50 mt-1 truncate max-w-[150px]">{promo.title}</p>
                    </td>
                    <td className="p-4 text-center text-xs">{promo.type === 'percent' ? 'Persen' : 'Nominal'}</td>
                    <td className="p-4 font-bold text-violet-700">
                      {promo.type === 'percent' ? `${parseFloat(promo.value)}%` : formatRupiah(promo.value)}
                    </td>
                    <td className="p-4 text-center font-mono text-xs">
                      {promo.used} / {promo.limit ? promo.limit : '∞'}
                    </td>
                    <td className="p-4 text-xs">{formatDate(promo.expired_at)}</td>
                    <td className="p-4 text-center">{getStatusBadge(promo)}</td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => openEditModal(promo)} className="btn-ghost px-2 py-1 text-[10px]">Edit</button>
                        <button onClick={() => handleDelete(promo.id)} className="btn-ghost px-2 py-1 text-[10px] text-red-600">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {promos.length === 0 && (
                  <tr><td colSpan="7" className="p-8 text-center text-ink/50">Belum ada promo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg bg-white border-2 border-ink shadow-brutal max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-700 text-xl mb-6">{editingId ? 'Edit Voucher' : 'Tambah Voucher Baru'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-ink/70 mb-2">Judul Promo</label>
                  <input type="text" className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-ink/70 mb-2">Kode Voucher (Unik)</label>
                  <input type="text" className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 uppercase" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} required />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/70 mb-2">Tipe Potongan</label>
                  <select className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="percent">Persentase (%)</option>
                    <option value="nominal">Nominal (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/70 mb-2">Nilai Potongan</label>
                  <input type="number" className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} required min="0" step="any" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/70 mb-2">Batas Penggunaan (Opsional)</label>
                  <input type="number" placeholder="Kosong = Unlimited" className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" value={formData.limit} onChange={e => setFormData({...formData, limit: e.target.value})} min="1" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/70 mb-2">Tanggal Kedaluwarsa (Opsional)</label>
                  <input type="date" className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" value={formData.expired_at} onChange={e => setFormData({...formData, expired_at: e.target.value})} />
                </div>

                <div className="col-span-2 mb-4">
                  <label className="block text-xs font-bold text-ink/70 mb-2">Deskripsi Singkat (Opsional)</label>
                  <textarea className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 h-20 resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <input type="checkbox" id="isActive" className="w-4 h-4 cursor-pointer" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Voucher Aktif</label>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1 py-2 text-sm">Batal</button>
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">Simpan Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
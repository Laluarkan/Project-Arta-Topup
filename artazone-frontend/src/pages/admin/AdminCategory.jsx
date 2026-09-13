/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';
import { resolveIconUrl } from '../../utils/resolveIconUrl';

export default function AdminCategory() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingLogos, setIsFetchingLogos] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const [editingCategory, setEditingCategory] = useState(null);
  const [editForm, setEditForm] = useState({ is_active: true });
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const externalCount = categories.filter(c => c.icon && c.icon.startsWith('http')).length;

  const fetchCategories = () => {
    axios.get('https://artazone-api.onrender.com/api/admin/categories', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setCategories(res.data.data))
    .catch(err => console.error(err))
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchCategories();
  }, [navigate, token]);

  const handleAutoFetch = async () => {
    if (!window.confirm('Proses ini akan menebak dan mencari logo secara otomatis dari internet untuk kategori yang logonya masih kosong (langsung disimpan ke server sendiri, bukan hotlink). Lanjutkan?')) return;

    setIsFetchingLogos(true);
    try {
      const res = await axios.post('https://artazone-api.onrender.com/api/admin/categories/auto-fetch-logos', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchCategories();
    } catch (error) {
      alert('Gagal melakukan pencarian logo otomatis.');
    } finally {
      setIsFetchingLogos(false);
    }
  };

  const handleMigrateExternal = async () => {
    if (!window.confirm(`Ada ${externalCount} logo yang masih hotlink ke sumber luar. Proses ini akan download semua dan simpan permanen di server sendiri. Lanjutkan?`)) return;

    setIsMigrating(true);
    try {
      const res = await axios.post('https://artazone-api.onrender.com/api/admin/categories/migrate-external-icons', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchCategories();
    } catch (error) {
      alert('Gagal migrasi logo.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`https://artazone-api.onrender.com/api/admin/categories/${editingCategory.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Data kategori berhasil diperbarui');
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      alert('Gagal memperbarui kategori');
    }
  };

  const handleIconUpload = async () => {
    if (!iconFile) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('icon', iconFile);
    try {
      await axios.post(`https://artazone-api.onrender.com/api/admin/categories/${editingCategory.id}/upload-icon`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      alert('Logo berhasil diupload ke server sendiri!');
      setIconFile(null);
      setIconPreview(null);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal upload logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-violet-50/30"><p className="font-bold text-violet-700">Memuat Data...</p></div>;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-4">
          <h1 className="font-display font-700 text-2xl">Manajemen Kategori</h1>
          <div className="flex gap-2">
            <button onClick={handleAutoFetch} disabled={isFetchingLogos} className="btn-ghost px-4 py-2 text-sm font-bold">
              {isFetchingLogos ? 'Mencari Logo...' : 'AUTO-FETCH LOGO'}
            </button>
            <button onClick={handleMigrateExternal} disabled={isMigrating || externalCount === 0} className="btn-primary px-4 py-2 text-sm glow font-bold disabled:opacity-40">
              {isMigrating ? 'Migrasi...' : `MIGRASI KE SELF-HOSTED (${externalCount})`}
            </button>
          </div>
        </div>

        {externalCount > 0 && (
          <div className="p-3 bg-yellow-100 border-2 border-yellow-300 border-dashed rounded-lg text-yellow-800 text-xs font-bold mb-4">
            ⚠️ Ada {externalCount} logo yang masih hotlink ke sumber luar (bikin web lambat & rapuh). Klik "Migrasi ke Self-Hosted" untuk pindahkan semua ke server sendiri secara otomatis.
          </div>
        )}

        <div className="card p-0 bg-white overflow-hidden flex flex-col h-[calc(100vh-190px)]">
          <div className="p-4 border-b-2 border-ink flex gap-4 bg-ink/5">
            <input 
              type="text"
              placeholder="Cari Nama Kategori..."
              className="flex-1 border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b-2 border-ink text-[10px] tracking-widest text-ink/70 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold text-center w-24">LOGO</th>
                  <th className="p-4 font-bold">NAMA KATEGORI</th>
                  <th className="p-4 font-bold text-center">SUMBER</th>
                  <th className="p-4 font-bold text-center">JML PRODUK</th>
                  <th className="p-4 font-bold text-center">STATUS</th>
                  <th className="p-4 font-bold text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {filteredCategories.map(category => {
                  const isExternal = category.icon && category.icon.startsWith('http');
                  return (
                    <tr key={category.id} className="hover:bg-violet-50/50">
                      <td className="p-4 flex justify-center">
                        <div className="w-10 h-10 rounded-lg border-2 border-ink/20 bg-ink/5 flex items-center justify-center overflow-hidden">
                          {category.icon ? (
                            <img src={resolveIconUrl(category.icon)} alt={category.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-xs text-ink/70 font-bold">?</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-bold">{category.name}</td>
                      <td className="p-4 text-center">
                        {!category.icon ? (
                          <span className="text-[10px] text-ink/70">-</span>
                        ) : isExternal ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">HOTLINK</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">SELF-HOSTED</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-violet-700">{category.products_count || 0}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border-2 ${category.is_active ? 'bg-gold-400 border-ink' : 'bg-ink/10 border-ink/20 text-ink/70'}`}>
                          {category.is_active ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => {
                            setEditingCategory(category);
                            setEditForm({ is_active: category.is_active });
                            setIconFile(null);
                            setIconPreview(null);
                          }}
                          className="btn-ghost px-3 py-1 text-xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredCategories.length === 0 && (
                  <tr><td colSpan="6" className="p-8 text-center text-ink/70 font-bold">Kategori tidak ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingCategory && (
        <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <h2 className="font-display font-700 text-xl mb-1">Edit Kategori</h2>
            <p className="text-xs text-ink/70 font-mono mb-6">{editingCategory.name}</p>

            {/* Upload logo langsung ke server sendiri (best practice, bukan paste URL) */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-ink/70 mb-2">Upload Logo (disimpan di server sendiri)</label>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-16 h-16 rounded-lg border-2 border-ink/20 bg-ink/5 flex items-center justify-center overflow-hidden shrink-0">
                  {iconPreview ? (
                    <img src={iconPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : editingCategory.icon ? (
                    <img src={resolveIconUrl(editingCategory.icon)} alt="Current" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-ink/70 font-bold">?</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="text-xs w-full"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setIconFile(file);
                      if (file) setIconPreview(URL.createObjectURL(file));
                    }}
                  />
                  <p className="text-[10px] text-ink/70 mt-1">Maks 1MB. PNG/JPG/WEBP/SVG.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleIconUpload}
                disabled={!iconFile || isUploading}
                className="btn-accent w-full py-2 text-xs disabled:opacity-40"
              >
                {isUploading ? 'Mengupload...' : 'Upload & Simpan Logo Ini'}
              </button>
            </div>

            <hr className="border-ink/10 mb-6" />

            <form onSubmit={handleEditSubmit}>
              <div className="mb-6 flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="isActive"
                  className="w-4 h-4 cursor-pointer accent-violet-600"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                />
                <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Kategori Aktif (Tampil di website)</label>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingCategory(null)} className="btn-ghost flex-1 py-2 text-sm font-bold">Tutup</button>
                <button type="submit" className="btn-primary flex-1 py-2 text-sm glow font-bold">Simpan Status</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
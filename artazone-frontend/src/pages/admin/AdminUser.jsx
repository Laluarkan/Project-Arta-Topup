/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminUser() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: 'member', balance: 0 });

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchUsers = () => {
    api.get('/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setUsers(res.data.data))
    .catch(err => console.error(err))
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchUsers();
  }, [navigate, token]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${editingUser.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Data user berhasil diperbarui');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal memperbarui user');
    }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-700 text-2xl">Manajemen User</h1>
        </div>

        <div className="card p-0 bg-white overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <div className="p-4 border-b-2 border-ink flex gap-4 bg-ink/5">
            <input 
              type="text"
              placeholder="Cari Nama atau Email User..."
              className="flex-1 border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b-2 border-ink text-[10px] tracking-widest text-ink/70 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold">NAMA</th>
                  <th className="p-4 font-bold">EMAIL</th>
                  <th className="p-4 font-bold text-center">ROLE</th>
                  <th className="p-4 font-bold">SALDO WALLET</th>
                  <th className="p-4 font-bold text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-violet-50/50">
                    <td className="p-4 font-bold">{user.name}</td>
                    <td className="p-4 text-xs">{user.email}</td>
                    <td className="p-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md border-2 border-ink bg-ink/10 uppercase">
                        {user.roles?.[0]?.name || 'MEMBER'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-violet-700">{formatRupiah(user.balance)}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => {
                          setEditingUser(user);
                          setEditForm({ 
                            role: user.roles?.[0]?.name || 'member', 
                            balance: user.balance 
                          });
                        }}
                        className="btn-ghost px-3 py-1 text-xs"
                      >
                        Kelola
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-ink/70">User tidak ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md bg-white border-2 border-ink shadow-brutal">
            <h2 className="font-display font-700 text-xl mb-1">Kelola User</h2>
            <p className="text-xs text-ink/70 font-mono mb-6">{editingUser.name} — {editingUser.email}</p>
            
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-ink/70 mb-2">Role Akses</label>
                <select 
                  className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white"
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                >
                  <option value="member">Member</option>
                  <option value="reseller">Reseller (Harga Khusus)</option>
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-ink/70 mb-2">Saldo Wallet (Rp)</label>
                <input 
                  type="number" 
                  className="w-full border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600" 
                  value={editForm.balance}
                  onChange={(e) => setEditForm({...editForm, balance: e.target.value})}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="btn-ghost flex-1 py-2 text-sm">Batal</button>
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
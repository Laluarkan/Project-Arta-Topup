/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

const formatRupiah = (num) => 'Rp' + Number(num || 0).toLocaleString('id-ID');

const METHOD_LABEL = { manual: 'Transfer Manual', midtrans: 'Midtrans', pakasir: 'Pakasir' };
const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
};

export default function AdminWalletTopup() {
  const [topups, setTopups] = useState([]);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchTopups = () => {
    setIsLoading(true);
    const methodParam = filterMethod !== 'ALL' ? `&payment_method=${filterMethod}` : '';
    api.get(`/admin/wallet-topups?status=${filterStatus}${methodParam}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setTopups(res.data.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }
    fetchTopups();
  }, [navigate, token, filterStatus, filterMethod]);

  const handleApprove = async (id) => {
    if (!confirm('Yakin approve top up ini? Saldo user akan langsung ditambahkan.')) return;
    try {
      await api.post(`/admin/wallet-topups/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTopups();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal approve.');
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) { alert('Alasan penolakan wajib diisi.'); return; }
    try {
      await api.post(`/admin/wallet-topups/${rejectModal.id}/reject`,
        { admin_note: rejectNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRejectModal(null);
      setRejectNote('');
      fetchTopups();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal reject.');
    }
  };

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-display font-700 mb-1">Riwayat & Review Top Up Saldo</h1>
        <p className="text-sm text-ink/70 mb-6">Semua metode top up (otomatis & manual) tercatat di sini. Approve/Tolak hanya berlaku untuk transfer manual.</p>

        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <div className="flex gap-2">
            {['PENDING', 'PAID', 'REJECTED'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 text-xs rounded-lg border-2 border-ink font-bold ${filterStatus === s ? 'bg-ink text-white' : 'bg-white'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border-2 border-ink font-bold bg-white"
          >
            <option value="ALL">Semua Metode</option>
            <option value="manual">Transfer Manual</option>
            <option value="midtrans">Midtrans</option>
            <option value="pakasir">Pakasir</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-ink/70">Memuat...</p>
        ) : topups.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-ink/70">Tidak ada data dengan filter ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topups.map((t) => (
              <div key={t.id} className="card p-5 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_BADGE[t.status] || 'bg-gray-100'}`}>{t.status}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-700">{METHOD_LABEL[t.payment_method] || t.payment_method}</span>
                  </div>
                  <p className="text-sm font-bold text-ink">{t.user?.name} <span className="text-ink/65 font-normal">({t.user?.email})</span></p>
                  <p className="text-xl font-display font-700 text-violet-700 my-1">{formatRupiah(t.amount)}</p>
                  {t.payment_method === 'manual' && (
                    <p className="text-xs text-ink/60">Bank: {t.sender_bank} — a.n {t.sender_name} ({t.sender_account_number})</p>
                  )}
                  <p className="text-xs text-ink/65">ID: {t.id} • Diajukan: {new Date(t.created_at).toLocaleString('id-ID')}</p>
                  {t.admin_note && <p className="text-xs text-red-500 mt-1">Catatan: {t.admin_note}</p>}
                </div>

                <div className="flex flex-col items-center gap-2">
                  {t.payment_method === 'manual' && t.proof_image_path && (
                    <img
                      src={`/storage/${t.proof_image_path}`}
                      alt="Bukti transfer"
                      className="w-24 h-24 object-cover rounded-lg border-2 border-ink cursor-pointer"
                      onClick={() => setPreviewImage(`/storage/${t.proof_image_path}`)}
                    />
                  )}
                  {t.payment_method === 'manual' && t.status === 'PENDING' ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(t.id)} className="btn-primary px-4 py-2 text-xs">Approve</button>
                      <button onClick={() => setRejectModal({ id: t.id })} className="btn-ghost px-4 py-2 text-xs text-red-600">Tolak</button>
                    </div>
                  ) : t.payment_method !== 'manual' ? (
                    <p className="text-[10px] text-ink/65 italic">Diproses otomatis via webhook</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-ink mb-3">Alasan Penolakan</h3>
            <textarea
              className="w-full border-2 border-ink rounded-lg px-3 py-2 text-sm mb-4"
              rows="3"
              placeholder="Contoh: Nominal transfer tidak sesuai"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={handleReject} className="btn-primary flex-1 py-2.5 text-sm">Kirim Penolakan</button>
              <button onClick={() => { setRejectModal(null); setRejectNote(''); }} className="btn-ghost flex-1 py-2.5 text-sm">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
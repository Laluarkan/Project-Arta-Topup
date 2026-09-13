import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    axios.get('https://artazone-api.onrender.com/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setLogs(res.data.data))
    .catch(err => console.error(err))
    .finally(() => setIsLoading(false));
  }, [navigate, token]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

  const filteredLogs = logs.filter(log => 
    (log.user?.email || '').toLowerCase().includes(search.toLowerCase()) || 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    (log.target || '').toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8 relative">
        <h1 className="font-display font-700 text-2xl mb-8">Audit Log</h1>

        <div className="card p-0 bg-white overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <div className="p-4 border-b-2 border-ink flex gap-4 bg-ink/5">
            <input 
              type="text"
              placeholder="Cari Admin, Aksi, atau Target..."
              className="flex-1 border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b-2 border-ink text-[10px] tracking-widest text-ink/70 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold">WAKTU</th>
                  <th className="p-4 font-bold">ADMIN</th>
                  <th className="p-4 font-bold text-center">AKSI</th>
                  <th className="p-4 font-bold">TARGET</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-violet-50/50">
                    <td className="p-4 text-xs">{formatDate(log.created_at)}</td>
                    <td className="p-4 text-xs font-bold">{log.user?.email || 'System'}</td>
                    <td className="p-4 text-center">
                      <span className="font-mono text-[10px] bg-ink/5 px-2 py-1 rounded border border-ink/20 inline-block uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono">{log.target || '—'}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-ink/70">Belum ada catatan log aktivitas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
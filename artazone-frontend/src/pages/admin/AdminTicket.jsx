/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminTicket() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchTickets = () => {
    axios.get('https://artazone-api.onrender.com/api/admin/tickets', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setTickets(res.data.data))
    .catch(err => console.error(err))
    .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchTickets();
  }, [navigate, token]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`https://artazone-api.onrender.com/api/admin/tickets/${id}/status`, 
        { status: newStatus }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTickets();
    } catch (error) {
      alert('Gagal memperbarui status tiket.');
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'OPEN': return <span className="bg-gold-400 border-2 border-ink text-ink text-[10px] font-bold px-2 py-1 rounded-md">OPEN</span>;
      case 'REPLIED': return <span className="bg-green-100 border-2 border-green-700 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md">DIBALAS</span>;
      case 'CLOSED': return <span className="bg-ink/10 border-2 border-ink/20 text-ink/50 text-[10px] font-bold px-2 py-1 rounded-md">SELESAI</span>;
      default: return <span className="bg-ink/10 text-ink text-[10px] font-bold px-2 py-1 rounded-md">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchSearch = (ticket.subject.toLowerCase().includes(search.toLowerCase()) || 
                        (ticket.user?.email || '').toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'ALL' || ticket.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 flex w-full h-full bg-violet-50/30">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display font-700 text-2xl">Komplain (CS)</h1>
        </div>

        <div className="card p-0 bg-white overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <div className="p-4 border-b-2 border-ink flex gap-4 bg-ink/5">
            <input 
              type="text"
              placeholder="Cari Subjek atau Email User..."
              className="flex-1 border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select 
              className="border-2 border-ink rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 bg-white cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="OPEN">OPEN (Baru)</option>
              <option value="REPLIED">DIBALAS</option>
              <option value="CLOSED">SELESAI</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b-2 border-ink text-[10px] tracking-widest text-ink/50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold">WAKTU</th>
                  <th className="p-4 font-bold">USER</th>
                  <th className="p-4 font-bold">DETAIL KOMPLAIN</th>
                  <th className="p-4 font-bold text-center">STATUS</th>
                  <th className="p-4 font-bold text-center">TINDAKAN</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/5">
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-violet-50/50">
                    <td className="p-4 text-xs whitespace-nowrap">{formatDate(ticket.created_at)}</td>
                    <td className="p-4 text-xs font-bold">{ticket.user?.email}</td>
                    <td className="p-4 max-w-sm">
                      <p className="font-bold text-sm mb-1">{ticket.subject}</p>
                      <p className="text-xs text-ink/70 line-clamp-2">{ticket.message}</p>
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(ticket.status)}</td>
                    <td className="p-4 text-center">
                      <select 
                        className="border-2 border-ink rounded px-2 py-1 text-xs outline-none bg-white cursor-pointer"
                        value={ticket.status}
                        onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                      >
                        <option value="OPEN">Set: OPEN</option>
                        <option value="REPLIED">Set: DIBALAS</option>
                        <option value="CLOSED">Set: SELESAI</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-ink/50">Tidak ada tiket komplain ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
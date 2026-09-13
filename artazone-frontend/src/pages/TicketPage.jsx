/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import UserSidebar from '../components/UserSidebar';

export default function TicketPage() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const fetchTickets = async () => {
    try {
      const res = await axios.get('https://artazone-api.onrender.com/api/user/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    axios.get('https://artazone-api.onrender.com/api/user', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setUser(res.data);
        fetchTickets();
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/auth');
      })
      .finally(() => setIsLoading(false));
  }, [navigate, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('https://artazone-api.onrender.com/api/user/tickets', { subject, message }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubject('');
      setMessage('');
      fetchTickets(); // Refresh list tiket
      alert('Tiket berhasil dikirim! Admin akan segera membalas.');
    } catch (error) {
      alert('Gagal mengirim tiket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><p>Memuat Data...</p></div>;

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      <Navbar />

        <div className="lg:col-span-3">
        <UserSidebar />

          <h1 className="font-display font-700 text-2xl mb-6">Pusat Bantuan & Komplain</h1>          
          <form onSubmit={handleSubmit} className="card p-6 mb-8 bg-violet-50/50">
            <h2 className="font-bold mb-4">Buat Tiket Baru</h2>
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="Subjek (Contoh: Transaksi Gagal TRX-123)"
                className="w-full border-2 border-ink rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-600" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <textarea 
                placeholder="Jelaskan kendala Anda sedetail mungkin..."
                className="w-full border-2 border-ink rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-600 h-24 resize-none" 
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit" className="btn-primary px-6 py-2.5 text-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Mengirim...' : 'Kirim Tiket'}
            </button>
          </form>

          <h2 className="font-display font-700 text-lg mb-4">Riwayat Tiket</h2>
          <div className="flex flex-col gap-3">
            {tickets.length > 0 ? tickets.map(ticket => (
              <div key={ticket.id} className="card-sm p-5">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-sm">{ticket.subject}</p>
                  <span className={`text-xs font-bold px-2 py-1 border-2 border-ink rounded-md ${ticket.status === 'OPEN' ? 'bg-yellow-100' : ticket.status === 'REPLIED' ? 'bg-green-100' : 'bg-ink/10'}`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-sm text-ink/70 mb-3">{ticket.message}</p>
                <p className="text-xs text-ink/40">{formatDate(ticket.created_at)}</p>
              </div>
            )) : (
              <div className="card border-dashed p-8 text-center text-ink/40">
                <p className="text-sm font-semibold">Belum ada tiket komplain.</p>
              </div>
            )}
          </div>
        </div> 
      <Footer />
    </div>
  );
}
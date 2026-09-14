/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';

export default function VerifyEmailNoticePage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isSending, setIsSending] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  const handleResend = async () => {
    setIsSending(true);
    setSentMessage('');
    try {
      await api.post('/email/resend-public', { email });
      setSentMessage('Link verifikasi baru sudah dikirim. Cek inbox atau folder Spam.');
    } catch (err) {
      setSentMessage('Terjadi kesalahan. Coba lagi beberapa saat lagi.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="card p-8 w-full max-w-md text-center">
        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-violet-100 mb-4">
          <span className="text-3xl">✉️</span>
        </div>
        <h2 className="text-xl font-display font-700 mb-2">Cek Email Anda</h2>
        <p className="text-sm text-ink/60 mb-1">
          Kami sudah mengirim link verifikasi ke:
        </p>
        <p className="text-sm font-bold text-ink mb-4">{email || 'email Anda'}</p>
        <p className="text-sm text-ink/60 mb-6">
          Klik link di email tersebut untuk mengaktifkan akun Anda sepenuhnya, lalu login seperti biasa. Jangan lupa cek folder Spam kalau belum muncul.
        </p>

        {sentMessage && <p className="text-xs text-violet-700 mb-4">{sentMessage}</p>}

        <button
          onClick={handleResend}
          disabled={isSending || !email}
          className={`w-full py-3 text-sm mb-3 ${isSending ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-accent'}`}
        >
          {isSending ? 'Mengirim...' : 'Kirim Ulang Email Verifikasi'}
        </button>

        <Link to="/auth" className="text-sm text-violet-600 hover:underline">
          Kembali ke halaman Login
        </Link>
      </div>
    </div>
  );
}
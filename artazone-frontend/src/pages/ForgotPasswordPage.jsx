import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await axios.post('https://artazone-api.onrender.com/api/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="card p-7 w-full max-w-sm">
        <Link to="/auth" className="text-ink/70 hover:text-ink text-sm font-semibold">← Kembali ke Login</Link>

        <h2 className="text-xl font-display font-700 mt-4 mb-2">Lupa Password</h2>

        {sent ? (
          <p className="text-sm text-ink/70">
            Kalau email <b>{email}</b> terdaftar, kami sudah kirim link reset password ke sana. Cek juga folder Spam kalau tidak muncul di 5 menit.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-ink/60 mb-2">Masukkan email akun Anda, kami kirimkan link untuk membuat password baru.</p>
            <input
              className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
              placeholder="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-sm mt-2 ${isLoading ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-accent'}`}
            >
              {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
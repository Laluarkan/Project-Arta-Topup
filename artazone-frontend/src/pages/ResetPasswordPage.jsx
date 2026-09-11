import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post('https://artazone-api.onrender.com/api/reset-password', {
        email,
        token,
        password,
        password_confirmation: passwordConfirmation
      });
      alert('Password berhasil diubah! Silakan login dengan password baru.');
      navigate('/auth');
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan. Link mungkin sudah kedaluwarsa.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-white text-center">
        <div>
          <p className="text-sm text-red-600 mb-4">Link reset password tidak valid.</p>
          <Link to="/forgot-password" className="text-violet-600 underline text-sm">Minta link baru</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="card p-7 w-full max-w-sm">
        <h2 className="text-xl font-display font-700 mb-1">Buat Password Baru</h2>
        <p className="text-xs text-ink/50 mb-4">Untuk akun: {email}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
            placeholder="Password Baru"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="w-full border-2 border-ink rounded-[10px] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600"
            placeholder="Konfirmasi Password Baru"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 text-sm mt-2 ${isLoading ? 'btn-ghost opacity-50 cursor-not-allowed' : 'btn-accent'}`}
          >
            {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}
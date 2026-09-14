import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://artazone-api.onrender.com/api';

// Dipakai oleh resolveIconUrl.js untuk membangun URL /storage/... (bukan /api/...).
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Kalau token sudah kedaluwarsa/tidak valid, backend akan balas 401.
// Bersihkan sesi lokal supaya UI tidak "nyangkut" seolah-olah masih login,
// tapi jangan paksa redirect di sini karena beberapa halaman (mis. status
// transaksi guest) sengaja tetap bisa diakses tanpa login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
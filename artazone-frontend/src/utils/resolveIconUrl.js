import { API_ROOT_URL } from '../api/client';

// URL dasar untuk file yang disimpan sebagai path relatif (bukan URL http penuh).
// Setelah migrasi ke Cloudflare R2, file-file baru disimpan di sana, jadi base URL-nya
// diarahkan ke bucket publik R2 (VITE_R2_PUBLIC_URL). Kalau env ini belum diisi (misal
// saat development lokal belum setup R2), fallback ke /storage backend seperti semula.
const RELATIVE_PATH_BASE_URL = import.meta.env.VITE_R2_PUBLIC_URL || `${API_ROOT_URL}/storage`;

/**
 * Resolve URL icon kategori/produk maupun file upload lain (misal bukti transfer).
 * - Kalau sudah URL lengkap (http/https) -> pakai apa adanya (untuk data lama yang belum dimigrasi).
 * - Kalau path lokal (hasil upload/migrasi ke storage sendiri) -> gabung dengan base URL storage.
 *
 * @param {string} icon - path/URL icon dari API
 * @param {number} [size] - lebar target dalam px (opsional). Kalau diisi, gambar akan
 *   di-resize on-the-fly via images.weserv.nl sebelum sampai ke browser, supaya file
 *   600x600 asli tidak dikirim penuh untuk slot tampilan yang jauh lebih kecil
 *   (mengatasi temuan PageSpeed "Meningkatkan penayangan gambar").
 */
export function resolveIconUrl(icon, size) {
  if (!icon) return null;

  const fullUrl = icon.startsWith('http://') || icon.startsWith('https://')
    ? icon
    : `${RELATIVE_PATH_BASE_URL}/${icon}`;

  if (!size) return fullUrl;

  // images.weserv.nl adalah proxy resize gambar gratis & cepat (dipakai luas, termasuk
  // oleh banyak situs production) yang juga otomatis mengonversi ke format modern (webp)
  // sesuai dukungan browser dan menambahkan cache header yang panjang di sisi mereka.
  const withoutProtocol = fullUrl.replace(/^https?:\/\//, '');
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio > 1 ? 2 : 1;
  const targetSize = Math.round(size * dpr);

  return `https://images.weserv.nl/?url=${encodeURIComponent(withoutProtocol)}&w=${targetSize}&h=${targetSize}&fit=cover&q=80&output=webp`;
}
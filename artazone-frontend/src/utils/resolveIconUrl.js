/**
 * Resolve URL icon kategori/produk.
 * - Kalau sudah URL lengkap (http/https) -> pakai apa adanya (untuk data lama yang belum dimigrasi).
 * - Kalau path lokal (hasil upload/migrasi ke storage sendiri) -> gabung dengan base URL storage backend.
 */
export function resolveIconUrl(icon) {
  if (!icon) return null;
  if (icon.startsWith('http://') || icon.startsWith('https://')) {
    return icon;
  }
  return `https://artazone-api.onrender.com/storage/${icon}`;
}
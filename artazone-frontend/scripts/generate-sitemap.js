// Generate public/sitemap.xml sebelum build (dijalankan otomatis lewat npm "prebuild").
// Menggabungkan halaman statis + satu <url> per kategori aktif yang diambil langsung dari API,
// supaya sitemap selalu sinkron dengan kategori yang sedang tayang tanpa perlu update manual.

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://kansss.my.id';
const API_URL = 'https://artazone-api.onrender.com/api/categories';

const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/categories', changefreq: 'daily', priority: '0.9' },
  { path: '/promo', changefreq: 'daily', priority: '0.7' },
  { path: '/help', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

function buildXml(urls) {
  const today = new Date().toISOString().split('T')[0];
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${SITE_URL}${u.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

async function fetchCategoryRoutes() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`API responded with ${res.status}`);
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) {
      throw new Error('Unexpected API response shape');
    }

    return json.data
      .filter((category) => category.is_active)
      .map((category) => ({
        path: `/detail/${category.id}`,
        changefreq: 'weekly',
        priority: '0.8',
      }));
  } catch (err) {
    console.warn(
      '[generate-sitemap] Gagal mengambil kategori dari API, sitemap hanya akan berisi halaman statis:',
      err.message
    );
    return [];
  }
}

async function main() {
  const categoryRoutes = await fetchCategoryRoutes();
  const xml = buildXml([...staticRoutes, ...categoryRoutes]);
  const outPath = join(__dirname, '..', 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(
    `[generate-sitemap] sitemap.xml ditulis dengan ${staticRoutes.length + categoryRoutes.length} URL (${categoryRoutes.length} kategori dinamis).`
  );
}

main();

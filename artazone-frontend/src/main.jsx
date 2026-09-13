import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Font di-self-host (bundled) lewat @fontsource, bukan lewat <link> ke fonts.googleapis.com.
// Ini menghapus round-trip DNS+koneksi+download ke domain pihak ketiga yang sebelumnya
// jadi bagian terlama di jalur render kritis (lihat temuan "Hierarki dependensi jaringan"
// di PageSpeed, fonts.gstatic.com woff2 ~1.5 detik). Hanya ketebalan (weight) yang benar-benar
// dipakai di UI yang di-import supaya ukuran bundle tetap kecil.
import '@fontsource/rajdhani/500.css'
import '@fontsource/rajdhani/600.css'
import '@fontsource/rajdhani/700.css'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

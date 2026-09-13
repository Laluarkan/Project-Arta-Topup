import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Pisahkan library pihak ketiga ke chunk vendor sendiri: browser bisa cache chunk ini
    // dalam waktu lama karena jarang berubah, terpisah dari kode aplikasi yang sering di-deploy.
    // html2canvas & sweetalert2 sengaja TIDAK dimasukkan ke sini karena sudah di-dynamic-import
    // / dipakai di halaman tertentu saja, jadi biarkan Vite pisahkan otomatis per-route.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/react-router|\/react\/|\/react-dom\//.test(id)) return 'vendor-react';
            if (id.includes('axios')) return 'vendor-axios';
          }
        },
      },
    },
  },
})

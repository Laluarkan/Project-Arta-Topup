# Dokumen Arsitektur & Perancangan Sistem Website Top-Up Game (v2 — Full Admin & User System)

## 0. Catatan Revisi
Dokumen v1 sudah bagus untuk MVP (alur transaksi, security dasar, performance). Versi ini menambahkan bagian yang **wajib ada** untuk web top-up "kompleks" skala production:

- Sistem **Role & Permission** (Admin, Sub-Admin/CS, Reseller, Member).
- Sistem **Wallet/Saldo** (deposit, refund otomatis ke saldo, bukan cuma bayar per transaksi).
- Sistem **Voucher/Diskon** dan **Referral/Affiliate**.
- **Audit Log** & **Notifikasi** (email/WhatsApp/Telegram bot untuk alert transaksi).
- Skema database dinormalisasi (categories, providers, payment_methods sebagai tabel terpisah, bukan hardcode).
- Modul **Admin Panel** & **Member Area** yang jelas fitur-fiturnya.
- Penanganan **komplain/refund** sebagai state machine, bukan cuma `SUCCESS/FAILED`.

---

## 1. Tech Stack Overview

| Layer | Teknologi | Alasan |
|---|---|---|
| Frontend (User) | React.js + Vite + TailwindCSS | SPA cepat, mudah di-cache di CDN |
| Frontend (Admin) | React.js (project terpisah) atau Laravel Blade + Livewire | Pisahkan dari user-facing untuk keamanan & load |
| Backend | Laravel 11 (Sanctum untuk auth API) | Stabil, punya Queue, Job, Scheduler bawaan |
| Database | SQLite (dev) → MySQL/PostgreSQL (prod) | Sesuai skala |
| Cache/Queue | Redis | Queue driver + cache produk + rate limiter |
| Provider/PPOB | Digiflazz | API top-up lengkap & cepat |
| Payment Gateway | Midtrans (Snap + Core API) | QRIS, VA, e-wallet, webhook realtime |
| Notifikasi | Telegram Bot API / Fonnte (WhatsApp) / Mail (SMTP) | Alert transaksi ke admin & user |
| Monitoring | Laravel Telescope (dev), Sentry (prod) | Debug & error tracking |

---

## 2. Sistem Role & Permission (Baru)

Gunakan package **Spatie Laravel-Permission**. Role minimum:

1. **Super Admin** — akses penuh (kelola produk, user, transaksi, setting, keuangan).
2. **Admin/CS** — kelola transaksi, respon komplain, tidak bisa ubah setting keuangan/margin.
3. **Reseller** (opsional) — dapat harga khusus (`price_reseller`), akses API key sendiri untuk top-up massal.
4. **Member/User** — user biasa, transaksi + wallet.

Middleware Laravel (`role:admin`, `permission:manage-products`) memisahkan route API admin (`/api/admin/*`) dari user (`/api/*`).

---

## 3. Alur Transaksi Utama (Diperluas)

Tetap asinkron via **Queue**, ditambah penanganan status yang lebih realistis:

1. **User pilih game & isi ID** → validasi ID game (nickname checker via Digiflazz jika game mendukung).
2. **Checkout** → pilih metode bayar: **Wallet/Saldo** (instan, tanpa Midtrans) **atau** Midtrans (QRIS/VA/E-wallet).
3. **Jika bayar via Wallet:** saldo langsung dipotong (locking row untuk race condition) → status langsung `PAID` → masuk Queue eksekusi.
4. **Jika bayar via Midtrans:**
   - Order dicatat `PENDING`, Snap Token dibuat.
   - Webhook masuk → validasi **Signature SHA512** → status `PAID`.
5. **Eksekusi Top-Up (Job/Queue):**
   - Job menembak Digiflazz dengan `ref_id` unik (idempotent).
   - Respon `SUKSES` → `SUCCESS`. Respon `GAGAL` → `FAILED` → **auto-refund ke wallet user** (bukan hilang begitu saja).
   - Respon `PENDING` → dicek ulang via **Cron Job** setiap beberapa menit (max retry, misal 10x dalam 30 menit, lalu eskalasi ke admin jika masih pending).
6. **Notifikasi:** setiap perubahan status kirim notifikasi ke user (email/WA) dan log ke admin dashboard.
7. **Komplain (jika ada):** user bisa buka tiket komplain terhubung ke `trx_id`, admin proses manual, hasil akhir: `resolved-refund` atau `resolved-resend`.

---

## 4. Skema Database (Lengkap & Ternormalisasi)

### `users`
| Kolom | Tipe | Ket |
|---|---|---|
| id | uuid/pk | |
| name, email, phone | string | |
| password | string | hashed |
| role_id | fk | via Spatie roles |
| balance | decimal(15,2) | saldo wallet |
| referral_code | string, unique | kode referral milik user ini |
| referred_by | fk nullable → users.id | siapa yang mereferensikan |
| is_active | boolean | banned/suspend flag |
| email_verified_at, two_factor_secret | | keamanan |

### `categories`
`id`, `name` (Mobile Legends, Free Fire, dll), `icon`, `is_active`

### `providers` *(baru — antisipasi multi-provider, tidak cuma Digiflazz)*
`id`, `name` (Digiflazz, VIP Reseller, dll), `api_config` (json terenkripsi), `is_active`

### `products`
| Kolom | Tipe | Ket |
|---|---|---|
| id | pk | |
| category_id | fk | |
| provider_id | fk | |
| buyer_sku_code | string | kode dari provider |
| product_name | string | |
| price_member | decimal | harga user biasa |
| price_reseller | decimal | harga reseller |
| provider_price | decimal | modal (untuk hitung profit) |
| stock_status | enum | `available`, `empty`, `disturbed` |
| is_active | boolean | |

### `wallets_transactions` *(baru — histori saldo)*
`id`, `user_id`, `type` (`topup`, `deduction`, `refund`), `amount`, `balance_before`, `balance_after`, `reference_id` (bisa `trx_id`), `created_at`

### `transactions`
| Kolom | Tipe | Ket |
|---|---|---|
| trx_id | uuid pk | |
| user_id | fk nullable | nullable jika guest checkout diizinkan |
| product_id | fk | |
| user_game_id, zone_id | string | |
| amount | decimal | harga final (setelah diskon) |
| discount_amount | decimal | dari voucher |
| voucher_code | string nullable | |
| payment_method | enum | `wallet`, `qris`, `va`, `ewallet` |
| midtrans_transaction_id | string nullable | |
| digiflazz_ref_id | string | idempotency key |
| status | enum | `PENDING`, `PAID`, `PROCESSING`, `SUCCESS`, `FAILED`, `REFUNDED`, `COMPLAINED` |
| status_note | text nullable | pesan error/alasan dari provider |
| created_at, updated_at | | |

### `vouchers` *(baru)*
`id`, `code`, `type` (`percent`/`fixed`), `value`, `min_transaction`, `max_discount`, `usage_limit`, `used_count`, `expired_at`, `is_active`

### `complaints` *(baru)*
`id`, `trx_id` (fk), `user_id`, `message`, `status` (`open`, `in_progress`, `resolved-refund`, `resolved-resend`, `rejected`), `admin_response`, `handled_by` (fk admin), `created_at`

### `audit_logs` *(baru — wajib untuk admin panel)*
`id`, `admin_id`, `action` (misal `update_price`, `manual_refund`), `target_table`, `target_id`, `old_value` (json), `new_value` (json), `created_at`

### `notifications`
`id`, `user_id` nullable, `type` (`transaction`, `promo`, `system`), `channel` (`email`,`wa`,`in-app`), `message`, `is_read`, `sent_at`

---

## 5. Modul Admin Panel (Baru — Wajib Ada)

1. **Dashboard:** grafik omzet harian/bulanan, profit (harga jual − provider_price), transaksi pending yang butuh perhatian.
2. **Manajemen Produk:** sinkron manual/otomatis dari Digiflazz, override harga jual & margin per kategori.
3. **Manajemen Transaksi:** filter by status, resend manual ke Digiflazz, refund manual ke wallet.
4. **Manajemen User:** ban/suspend, reset saldo, lihat riwayat, ubah role jadi reseller.
5. **Manajemen Voucher & Promo.**
6. **Manajemen Komplain/Tiket CS.**
7. **Audit Log Viewer** — histori semua aksi admin (transparansi & investigasi fraud).
8. **Pengaturan Sistem:** API key provider, Server Key Midtrans, margin default, mode maintenance.

## 6. Modul Member Area (Baru — Wajib Ada)

1. Riwayat transaksi + status realtime (polling atau WebSocket/Pusher).
2. Wallet: lihat saldo, riwayat mutasi, top-up saldo.
3. Program referral: kode unik, komisi otomatis masuk wallet saat orang yang direferensikan bertransaksi.
4. Klaim voucher & lihat promo aktif.
5. Buat tiket komplain terhubung transaksi tertentu.

---

## 7. Keamanan (Diperluas)

1. **Validasi Signature Midtrans (SHA512)** — mutlak, tidak boleh trust request tanpa validasi.
2. **Idempotency Key** ke Digiflazz berbasis `trx_id` — cegah double top-up.
3. **Rate Limiting** per IP & per user (Laravel Throttle + Redis) di endpoint checkout.
4. **Row Locking** saat potong saldo wallet (`lockForUpdate()`) — cegah race condition double-spend saat user checkout dua kali cepat.
5. **RBAC ketat** — route admin tidak bisa diakses token user biasa (middleware `role:` + `permission:`).
6. **2FA untuk Admin** (Google Authenticator) — wajib mengingat admin bisa refund manual & lihat data keuangan.
7. **Audit Log** — setiap aksi sensitif admin tercatat, tidak bisa dihapus (append-only).
8. **Environment Variables** — Server Key Midtrans & Secret Digiflazz hanya di `.env` backend, tidak pernah dikirim ke response API.
9. **Enkripsi kolom sensitif** (`api_config` provider) pakai Laravel `Crypt`.

---

## 8. Performance

1. **Cron Sinkron Produk** tiap 1 jam, simpan di DB lokal + cache Redis (jangan hit API Digiflazz tiap load halaman).
2. **Redis Cache** untuk `products` & `categories`.
3. **Queue Worker terpisah** (`supervisor`) khusus untuk job eksekusi top-up, biar tidak numpuk dengan job lain (notifikasi, email).
4. **Pisah server:** Frontend user di Vercel/Cloudflare Pages, Backend Laravel + Admin di VPS (DigitalOcean/AWS), DB terpisah dari app server jika traffic besar.
5. **WebSocket/Pusher/Laravel Reverb** untuk update status transaksi realtime di frontend user tanpa polling berat.

---

## 9. Roadmap Pengembangan

| Fase | Scope |
|---|---|
| **Fase 1** | Setup Laravel + Sanctum + Spatie Permission, migration semua tabel, sinkron produk Digiflazz |
| **Fase 2** | Sistem Wallet (topup, deduction, refund) + integrasi Snap Midtrans |
| **Fase 3** | Webhook Midtrans → Queue → Digiflazz + Cron cek status pending |
| **Fase 4** | Frontend User (React) — catalog, checkout, riwayat, wallet |
| **Fase 5** | Admin Panel — dashboard, manajemen produk/transaksi/user, audit log |
| **Fase 6** | Voucher, Referral, Sistem Komplain/Tiket |
| **Fase 7** | Notifikasi (email/WA/Telegram bot), monitoring (Sentry), load testing |


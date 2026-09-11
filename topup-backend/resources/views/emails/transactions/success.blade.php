@component('mail::message')
@slot('header')
@component('mail::header', ['url' => config('app.url')])
<span style="font-size: 28px; font-weight: 800; color: #0f172a; font-family: sans-serif;">ArTa<span style="color: #7c3aed;">Zone</span></span>
@endcomponent
@endslot

# Transaksi Berhasil!

Halo **{{ $transaction->user ? $transaction->user->name : 'Pelanggan ArTa Zone' }}**,

Terima kasih telah melakukan pembelian di **ArTa Zone**. Pesanan kamu telah berhasil kami proses dan item game sudah dikirimkan ke akun kamu. Berikut adalah detail transaksinya:

**ID Transaksi:**
`{{ $transaction->trx_id }}`

**Produk:**
{{ $transaction->product->product_name }}

**Target / User ID:**
{{ $transaction->user_game_id }} {{ $transaction->zone_id ? '(' . $transaction->zone_id . ')' : '' }}

**Total Pembayaran:**
Rp {{ number_format($transaction->amount, 0, ',', '.') }}

**Waktu Pembelian:**
{{ $transaction->created_at->format('d M Y, H:i') }} WIB

@component('mail::button', ['url' => env('FRONTEND_URL', 'http://localhost:5173') . '/status/' . $transaction->trx_id])
Lihat Struk Lengkap
@endcomponent

Jika terdapat kendala pada pesanan ini, silakan buat tiket bantuan di menu dashboard kamu.

Terima kasih,<br>
Tim {{ config('app.name') }}
@endcomponent
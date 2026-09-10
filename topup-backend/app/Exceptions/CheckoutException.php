<?php

namespace App\Exceptions;

/**
 * Exception khusus untuk pesan error yang MEMANG DITUJUKAN untuk dilihat user
 * (misal: "Saldo tidak mencukupi", "Kode voucher tidak valid").
 * Kalau exception yang ditangkap BUKAN instance ini, berarti itu error sistem
 * yang tidak terduga (bug, koneksi gagal, dll) dan pesannya TIDAK boleh
 * ditampilkan mentah-mentah ke user.
 */
class CheckoutException extends \Exception
{
}
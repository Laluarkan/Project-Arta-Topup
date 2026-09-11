<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Password</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 24px;">
    <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 2px solid #0f172a;">
        <h2 style="color: #7c3aed; margin-top: 0;">ArTa Zone</h2>
        <p>Halo, {{ $name }}!</p>
        <p>Kami menerima permintaan untuk reset password akun Anda. Klik tombol di bawah untuk membuat password baru:</p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{{ $url }}" style="background: #7c3aed; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Reset Password
            </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">Link ini berlaku selama 60 menit. Kalau Anda tidak meminta reset password, abaikan saja email ini &mdash; password Anda tetap aman.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="font-size: 12px; color: #94a3b8;">Kalau tombol di atas tidak berfungsi, salin link berikut ke browser Anda:<br>{{ $url }}</p>
    </div>
</body>
</html>
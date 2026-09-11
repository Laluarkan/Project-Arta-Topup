<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends BaseVerifyEmail implements ShouldQueue
{
    use Queueable;
    protected function verificationUrl($notifiable)
    {
        // Buat signed URL yang mengarah ke endpoint backend seperti biasa...
        $backendUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        // ...tapi kita kirim ke user sebagai link FRONTEND yang nanti
        // otomatis memanggil backendUrl di atas lewat backend redirect.
        return $backendUrl;
    }

    public function toMail($notifiable)
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verifikasi Alamat Email - ArTa Zone')
            ->greeting('Halo, ' . $notifiable->name . '!')
            ->line('Terima kasih sudah mendaftar di ArTa Zone. Klik tombol di bawah untuk verifikasi email Anda.')
            ->action('Verifikasi Email', $verificationUrl)
            ->line('Link ini berlaku selama 60 menit.')
            ->line('Kalau Anda tidak merasa mendaftar, abaikan email ini.');
    }
}
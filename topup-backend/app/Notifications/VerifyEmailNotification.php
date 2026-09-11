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
        // 1. Buat signed URL yang mengarah ke endpoint backend
        $backendUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        // 2. Pisahkan query parameter (expires dan signature) dari backend URL
        $query = parse_url($backendUrl, PHP_URL_QUERY);

        // 3. Arahkan ke URL Frontend (React JS) milikmu
        // Akan membaca env('FRONTEND_URL'), jika tidak ada maka default ke kansss.my.id
        $frontendUrl = rtrim(env('FRONTEND_URL', 'https://kansss.my.id'), '/');

        // 4. Susun link lengkap untuk diklik oleh user di email
        return $frontendUrl . '/verify-email/' . $notifiable->getKey() . '/' . sha1($notifiable->getEmailForVerification()) . '?' . $query;
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
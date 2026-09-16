<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AdminLogin2FAMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $otp;
    public $name;

    public function __construct($otp, $name)
    {
        $this->otp = $otp;
        $this->name = $name;
    }

    public function build()
    {
        return $this->subject('Kode Keamanan (2FA) Login - ArTa Zone')
            ->html("
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;'>
                    <h2 style='color: #333;'>Verifikasi Keamanan</h2>
                    <p>Halo <strong>{$this->name}</strong>,</p>
                    <p>Seseorang (kemungkinan Anda) sedang mencoba login sebagai Admin di ArTa Zone.</p>
                    <p>Silakan masukkan 6-digit kode keamanan berikut untuk melanjutkan login:</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <span style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; padding: 15px 25px; background: #EEF2FF; border-radius: 8px;'>{$this->otp}</span>
                    </div>
                    <p style='color: #e11d48; font-size: 14px;'>Kode ini akan kedaluwarsa dalam 10 menit.</p>
                    <p style='font-size: 12px; color: #666; margin-top: 40px;'>Jika Anda tidak sedang mencoba login, segera abaikan email ini dan periksa keamanan akun Anda.</p>
                </div>
            ");
    }
}
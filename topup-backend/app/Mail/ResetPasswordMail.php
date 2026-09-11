<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $resetUrl;
    public $userName;

    public function __construct(string $resetUrl, string $userName)
    {
        $this->resetUrl = $resetUrl;
        $this->userName = $userName;
    }

    public function build()
    {
        return $this->subject('Reset Password - ArTa Zone')
            ->view('emails.reset-password', [
                'url' => $this->resetUrl,
                'name' => $this->userName,
            ]);
    }
}
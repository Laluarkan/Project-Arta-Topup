<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * Daftar exception yang TIDAK AKAN dilaporkan ke Sentry atau log error.
     * Ini berguna agar error bisnis yang wajar (seperti saldo kurang/voucher invalid)
     * tidak membanjiri notifikasi peringatan Sentry kamu.
     *
     * @var array<int, string>
     */
    protected $dontReport = [
        \App\Exceptions\CheckoutException::class,
    ];

    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            // Mengirim error sistem yang tidak tertangani ke dashboard Sentry
            if (app()->bound('sentry')) {
                \Sentry\Laravel\Integration::captureUnhandledException($e);
            }
        });
    }
}
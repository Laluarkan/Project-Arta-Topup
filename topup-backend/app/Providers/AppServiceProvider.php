<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\URL;
use Illuminate\Queue\Events\JobFailed;

class AppServiceProvider extends ServiceProvider
{
    public function register()
    {
    }

    public function boot()
    {
        // 1. PAKSA LARAVEL MENGGUNAKAN HTTPS UNTUK SEMUA URL/SIGNATURE
        // Ini wajib untuk mengatasi error "403 Invalid Signature" di server Render
        if (env('APP_ENV') !== 'local') {
            URL::forceScheme('https');
        }

        // 2. Debugger Antrean (Tetap dipertahankan)
        Queue::failing(function (JobFailed $event) {
            $errorMsg = sprintf(
                "\n[DEBUG ANTREAN GAGAL] \nJob: %s \nError: %s \nPesan: %s\n",
                $event->job->resolveName(),
                get_class($event->exception),
                $event->exception->getMessage()
            );
            
            error_log($errorMsg);
        });
    }
}
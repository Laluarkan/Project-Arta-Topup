<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Queue;
use Illuminate\Queue\Events\JobFailed;

class AppServiceProvider extends ServiceProvider
{
    public function register()
    {
    }

    public function boot()
    {
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
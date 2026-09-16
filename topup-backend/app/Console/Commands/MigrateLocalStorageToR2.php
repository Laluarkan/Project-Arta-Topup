<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Command SEKALI JALAN untuk memindahkan file yang sudah terlanjur tersimpan di disk
 * lokal ('public', yaitu storage/app/public) ke disk 'r2' (Cloudflare R2), SEBELUM
 * env UPLOADS_DISK diubah ke 'r2' secara permanen.
 *
 * Kenapa ini penting: disk lokal di Render bersifat ephemeral (hilang tiap redeploy).
 * Kalau tidak dimigrasi dulu, semua icon kategori & bukti transfer yang sudah pernah
 * diupload akan hilang link-nya begitu UPLOADS_DISK diubah ke 'r2' (karena filenya
 * tetap di disk lama yang sudah tidak dibaca lagi).
 *
 * Cara pakai (jalankan SEBELUM mengubah UPLOADS_DISK=r2 di Render):
 *   php artisan storage:migrate-to-r2
 *
 * Aman dijalankan berkali-kali (idempotent) -- file yang sudah ada di R2 akan dilewati.
 */
class MigrateLocalStorageToR2 extends Command
{
    protected $signature = 'storage:migrate-to-r2';
    protected $description = 'Pindahkan semua file dari disk local (public) ke disk r2 (Cloudflare R2)';

    public function handle(): int
    {
        if (!config('filesystems.disks.r2.key')) {
            $this->error('Kredensial R2 belum diisi di .env (R2_ACCESS_KEY_ID dkk). Isi dulu sebelum menjalankan command ini.');
            return self::FAILURE;
        }

        $localDisk = Storage::disk('public');
        $r2Disk = Storage::disk('r2');

        $files = $localDisk->allFiles();

        if (empty($files)) {
            $this->info('Tidak ada file di disk lokal untuk dimigrasi.');
            return self::SUCCESS;
        }

        $this->info(count($files) . ' file ditemukan di disk lokal. Memulai migrasi ke R2...');
        $bar = $this->output->createProgressBar(count($files));

        $migrated = 0;
        $failed = 0;

        foreach ($files as $path) {
            try {
                if ($r2Disk->exists($path)) {
                    $bar->advance();
                    continue; // sudah pernah dimigrasi, lewati
                }

                $r2Disk->put($path, $localDisk->get($path));
                $migrated++;
            } catch (\Throwable $e) {
                $failed++;
                $this->newLine();
                $this->error("Gagal migrasi {$path}: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Selesai. {$migrated} file berhasil dipindah ke R2, {$failed} gagal.");
        $this->comment('Setelah ini dipastikan berhasil, baru aman mengubah UPLOADS_DISK=r2 di environment variable Render.');

        return self::SUCCESS;
    }
}
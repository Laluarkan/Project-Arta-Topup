<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RoleAndAdminSeeder extends Seeder
{
    public function run(): void
    {
        // firstOrCreate supaya aman dijalankan berkali-kali (tidak error kalau role sudah ada)
        Role::firstOrCreate(['name' => 'super-admin']);
        Role::firstOrCreate(['name' => 'admin']);
        Role::firstOrCreate(['name' => 'reseller']);
        Role::firstOrCreate(['name' => 'member']);

        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        // Kalau ADMIN_PASSWORD tidak diset di .env, generate password acak
        // dan tampilkan di terminal SEKALI SAJA saat seeding — tidak pernah disimpan di kode.
        $generatedPassword = null;
        if (empty($password)) {
            $generatedPassword = Str::random(16);
            $password = $generatedPassword;
        }

        if (empty($email)) {
            $email = 'admin@' . parse_url(config('app.url'), PHP_URL_HOST) ?: 'admin@example.com';
        }

        $superAdmin = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'Super Admin'),
                'password' => Hash::make($password),
                'balance' => 0,
                'is_active' => true,
            ]
        );

        if (!$superAdmin->hasRole('super-admin')) {
            $superAdmin->assignRole('super-admin');
        }

        if ($generatedPassword) {
            $this->command->warn('=================================================');
            $this->command->warn(' ADMIN_PASSWORD tidak diset di .env.');
            $this->command->warn(' Password sementara di-generate otomatis:');
            $this->command->warn(" Email    : {$email}");
            $this->command->warn(" Password : {$generatedPassword}");
            $this->command->warn(' SIMPAN password ini sekarang, lalu SEGERA login');
            $this->command->warn(' dan ganti passwordnya. Password ini TIDAK disimpan di mana pun.');
            $this->command->warn('=================================================');
        } else {
            $this->command->info("Admin '{$email}' berhasil dibuat/diupdate menggunakan ADMIN_PASSWORD dari .env.");
        }
    }
}
#!/bin/sh

# Menjalankan migrasi database otomatis ke Supabase
php artisan migrate --force

# Membersihkan dan mengunci cache untuk performa maksimal
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Menjalankan Supervisor (PHP, Nginx, dan Queue Worker)
exec /usr/bin/supervisord -c /etc/supervisord.conf
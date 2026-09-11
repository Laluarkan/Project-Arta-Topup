#!/bin/sh

# Pastikan folder storage ada & writable saat container BENAR-BENAR jalan
# (chown di Dockerfile hanya berlaku saat build image, bisa "hilang" kalau
# storage di-mount sebagai persistent disk oleh Render saat runtime)
mkdir -p /var/www/html/storage/logs
mkdir -p /var/www/html/storage/framework/cache
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Menjalankan migrasi database otomatis ke Supabase
php artisan migrate --force

# Membersihkan dan mengunci cache untuk performa maksimal
php artisan optimize:clear
php artisan queue:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Menjalankan Supervisor (PHP, Nginx, dan Queue Worker)
exec /usr/bin/supervisord -c /etc/supervisord.conf
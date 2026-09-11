#!/bin/sh

# Pastikan folder storage ada & writable saat container BENAR-BENAR jalan
mkdir -p /var/www/html/storage/logs
mkdir -p /var/www/html/storage/framework/cache
mkdir -p /var/www/html/storage/framework/sessions
mkdir -p /var/www/html/storage/framework/views
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Menjalankan migrasi database otomatis
php artisan migrate --force

# Membersihkan dan mengunci cache untuk performa maksimal
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# MENGHAPUS ANTREAN LAMA YANG MACET (Agar tidak mencoba SMTP terus-menerus)
php artisan queue:clear --force

# Menjalankan Supervisor (PHP, Nginx, dan Queue Worker)
exec /usr/bin/supervisord -c /etc/supervisord.conf
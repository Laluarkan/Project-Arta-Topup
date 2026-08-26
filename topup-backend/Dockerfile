FROM php:8.2-fpm-alpine

# Menginstal Nginx, Supervisor, dan ekstensi PostgreSQL
RUN apk add --no-cache nginx supervisor postgresql-dev \
    && docker-php-ext-install pdo pdo_pgsql

# Mengatur direktori kerja
WORKDIR /var/www/html

# Menyalin Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Menyalin seluruh file Laravel ke dalam Docker
COPY . .

# Menginstal dependensi PHP (Tanpa file development)
RUN composer install --no-dev --optimize-autoloader

# Memberikan izin akses folder ke Nginx
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Menyalin konfigurasi dari folder docker/
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/start.sh /usr/local/bin/start.sh

# Memberikan izin eksekusi pada script start
RUN chmod +x /usr/local/bin/start.sh

# Membuka port 80 untuk akses publik
EXPOSE 80

# Perintah yang dijalankan saat server Render menyala
ENTRYPOINT ["/usr/local/bin/start.sh"]
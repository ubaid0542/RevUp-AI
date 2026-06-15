FROM php:8.4-cli-alpine

# Install dependencies
RUN apk add --no-cache postgresql-dev libzip-dev zip unzip git

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy files
COPY . .

# Ensure storage framework directories exist and have write permissions
RUN mkdir -p storage/framework/cache/data \
    && mkdir -p storage/framework/sessions \
    && mkdir -p storage/framework/views \
    && mkdir -p storage/logs \
    && chmod -R 777 storage bootstrap/cache

# Install php packages
RUN composer install --no-dev --optimize-autoloader

EXPOSE 80

# Run migrations and start Laravel server
CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${PORT:-80}

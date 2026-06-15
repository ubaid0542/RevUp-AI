<?php

/*
|--------------------------------------------------------------------------
| Create The Application
|--------------------------------------------------------------------------
*/

$app = new Illuminate\Foundation\Application(
    $_ENV['APP_BASE_PATH'] ?? dirname(__DIR__)
);

/*
|--------------------------------------------------------------------------
| Bind Important Interfaces
|--------------------------------------------------------------------------
*/

$app->singleton(
    Illuminate\Contracts\Http\Kernel::class,
    App\Http\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Console\Kernel::class,
    App\Console\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Debug\ExceptionHandler::class,
    App\Exceptions\Handler::class
);

/*
|--------------------------------------------------------------------------
| Load Routes
|--------------------------------------------------------------------------
*/

$app->booted(function () use ($app) {
    $router = $app['router'];

    // Web routes
    if (file_exists(base_path('routes/web.php'))) {
        $router->middleware('web')
               ->group(base_path('routes/web.php'));
    }

    // API routes
    if (file_exists(base_path('routes/api.php'))) {
        $router->prefix('api')
               ->middleware('api')
               ->group(base_path('routes/api.php'));
    }
});

/*
|--------------------------------------------------------------------------
| Return The Application
|--------------------------------------------------------------------------
*/

return $app;

<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\ReviewController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Review Generator API endpoints.
| All routes are prefixed with /api
|
*/

// Business management
Route::prefix('businesses')->group(function () {
    Route::post('/', [BusinessController::class, 'store']);
    Route::get('/{business}', [BusinessController::class, 'show']);
    Route::put('/{business}', [BusinessController::class, 'update']);
    Route::post('/{business}/logo', [BusinessController::class, 'uploadLogo']);
});

// Review generation
Route::prefix('reviews')->group(function () {
    Route::post('/generate', [ReviewController::class, 'generate']);
    Route::post('/regenerate', [ReviewController::class, 'regenerate']);
    Route::get('/history/{businessId}', [ReviewController::class, 'history']);
});

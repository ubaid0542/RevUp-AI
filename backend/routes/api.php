<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\ReviewController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Security model:
| - Public customer routes (QR scan flow): throttle:10,1 per IP
| - Auth routes: throttle:5,1
| - Generate-proxy (uses server AI credits): throttle:10,1 per IP + business token
| - All owner/admin routes: auth:sanctum required
|
*/

// ─── Public Auth (no token, rate-limited) ────────────────────────────────────
Route::prefix('auth')->middleware('throttle:20,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    // Email Verification
    Route::post('/verify-email',     [AuthController::class, 'verifyEmail']);

    // Forgot Password
    Route::post('/forgot-password', [\App\Http\Controllers\PasswordResetController::class, 'sendResetLink']);
    Route::post('/verify-otp',      [\App\Http\Controllers\PasswordResetController::class, 'verifyOtp']);
    Route::post('/reset-password',  [\App\Http\Controllers\PasswordResetController::class, 'resetPassword']);
});

// ─── Admin Login (rate-limited) ──────────────────────────────────────────────
Route::post('/admin/login', [AuthController::class, 'adminLogin'])->middleware('throttle:10,1');

// ─── Protected Owner Routes (Sanctum token required) ─────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth management
    Route::prefix('auth')->group(function () {
        Route::get('/me',       [AuthController::class, 'me']);
        Route::post('/logout',  [AuthController::class, 'logout']);
        Route::put('/profile',  [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'changePassword']);
    });

    // Business CRUD (owner only — ownership checked inside controller)
    Route::prefix('businesses')->group(function () {
        Route::get('/',                      [BusinessController::class, 'index']);
        Route::post('/',                     [BusinessController::class, 'store']);
        Route::get('/{business}',            [BusinessController::class, 'show']);
        Route::put('/{business}',            [BusinessController::class, 'update']);
        Route::post('/{business}/logo',      [BusinessController::class, 'uploadLogo']);
        Route::delete('/{business}',         [BusinessController::class, 'destroy']);
    });

    // Review history — owner can only see their own business reviews (enforced in controller)
    Route::get('/reviews/history/{businessId}', [ReviewController::class, 'history']);

    // Backend AI review generation (uses DB business ID — owner only)
    Route::post('/reviews/generate',    [ReviewController::class, 'generate']);
    Route::post('/reviews/regenerate',  [ReviewController::class, 'regenerate']);
});

// ─── Admin Routes (admin token required) ─────────────────────────────────────
Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/businesses', [BusinessController::class, 'adminIndex']);
    Route::get('/users',      [AuthController::class, 'adminUsersIndex']);
    Route::delete('/users/{id}', [AuthController::class, 'adminDeleteUser']);
    Route::get('/stats',         [BusinessController::class, 'adminStats']);
});


// ─── Public Customer Routes (QR scan flow — no auth, rate-limited) ───────────
// throttle:10,1 = 10 requests per minute per IP — enough for one customer session
Route::middleware('throttle:10,1')->group(function () {

    // Show public business info for QR scan page
    Route::get('/public/business/{business}',       [BusinessController::class, 'showPublic']);

    // Log QR scan event
    Route::post('/public/business/{business}/scan', [BusinessController::class, 'logScan']);

    // Proxy AI generation for customers (no DB business ID needed)
    // Uses server-side AI keys — protected by rate limiting
    Route::post('/reviews/generate-proxy', [ReviewController::class, 'generateProxy']);

    // Save externally-generated review (public for QR scans)
    Route::post('/reviews/save-external', [ReviewController::class, 'saveExternal']);

    // Photo upload for reviews (public for QR scans)
    Route::post('/reviews/{review}/photos', [ReviewController::class, 'uploadPhotos']);

    // Mark review as posted to Google (public for QR scans)
    Route::post('/reviews/{review}/posted', [ReviewController::class, 'markPosted']);

    // Log customer analytics events (copy, post) — public for QR scans
    Route::post('/public/business/{business}/event', [BusinessController::class, 'logEvent']);
});

// ─── Public Business Registration (standalone/no-login flow) ─────────────────
Route::middleware('throttle:5,1')->group(function () {
    Route::post('/public/businesses',                    [BusinessController::class, 'storePublic']);
    Route::post('/public/businesses/{business}/logo',    [BusinessController::class, 'uploadLogoPublic']);
});


// ─── Health Check (Keep-alive for cron-job.org) ──────────────────────────────
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
    ]);
});

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken() ?? $request->header('X-Admin-Token');

        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Admin authentication required.',
            ], 401);
        }

        $adminPassword = env('ADMIN_PASSWORD');
        if (empty($adminPassword)) {
            return response()->json([
                'success' => false,
                'message' => 'Admin access not configured.',
            ], 503);
        }

        // Use a server-side cache to validate tokens (not derived from static values)
        // Falls back to HMAC-based token for backward compatibility
        $sessionKey  = 'admin_session:' . $token;
        $cachedToken = \Illuminate\Support\Facades\Cache::get($sessionKey);

        if ($cachedToken) {
            // Valid session token — refresh TTL
            \Illuminate\Support\Facades\Cache::put($sessionKey, true, now()->addHours(8));
            return $next($request);
        }

        // Legacy: validate HMAC-derived token (used during transition)
        $expectedToken = hash_hmac('sha256', $adminPassword, env('APP_KEY', ''));
        if (hash_equals($expectedToken, $token)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid admin credentials.',
        ], 401);
    }
}

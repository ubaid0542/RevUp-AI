<?php

namespace App\Http\Middleware;

use App\Models\Business;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifies a short-lived ownership token issued at public business creation.
 * Token is stored in cache with a 30-minute TTL.
 *
 * Usage: attach middleware('verify.business.token') to uploadLogoPublic.
 */
class VerifyBusinessOwnershipToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('X-Business-Token') ?? $request->input('business_token');
        $business = $request->route('business');

        if (!$token || !$business) {
            return response()->json([
                'success' => false,
                'message' => 'Ownership token required.',
            ], 403);
        }

        $businessId = $business instanceof Business ? $business->id : $business;
        $cacheKey = 'biz_token:' . $businessId;
        $stored = Cache::get($cacheKey);

        if (!$stored || !hash_equals($stored, $token)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired ownership token.',
            ], 403);
        }

        return $next($request);
    }
}

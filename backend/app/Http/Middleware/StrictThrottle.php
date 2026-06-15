<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Strict per-IP throttle for sensitive public endpoints.
 * Default: 5 requests per minute per IP.
 */
class StrictThrottle
{
    public function __construct(protected RateLimiter $limiter) {}

    public function handle(Request $request, Closure $next, int $maxAttempts = 5, int $decayMinutes = 1): Response
    {
        $key = 'strict_throttle:' . $request->ip() . ':' . $request->path();

        if ($this->limiter->tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = $this->limiter->availableIn($key);
            return response()->json([
                'success' => false,
                'message' => 'Too many requests. Please try again later.',
                'retry_after_seconds' => $retryAfter,
            ], 429);
        }

        $this->limiter->hit($key, $decayMinutes * 60);

        return $next($request);
    }
}

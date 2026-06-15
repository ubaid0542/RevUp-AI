<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Always return JSON 401 for unauthenticated API requests.
     * Never redirect to a login page.
     */
    protected function redirectTo(Request $request): ?string
    {
        return null; // no redirect — triggers JSON 401 response
    }

    protected function unauthenticated($request, array $guards)
    {
        abort(response()->json([
            'success' => false,
            'message' => 'Unauthenticated. Please login to continue.',
        ], 401));
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserOtp;
use App\Mail\EmailVerificationMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AuthController extends Controller
{
    /**
     * Register a new user (Signup)
     * POST /api/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'     => 'required|string|max:60',
            'email'    => 'required|email|max:100|unique:users,email',
            'phone'    => 'nullable|string|max:15',
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = new User([
            'name'     => $request->name,
            'email'    => $request->email,
            'phone'    => $request->phone,
            'password' => Hash::make($request->password),
        ]);
        $user->role = 'owner';
        $user->save();

        // Create OTP for email verification
        $otp = sprintf("%06d", mt_rand(100000, 999999));
        UserOtp::updateOrCreate(
            ['email' => $request->email, 'type' => 'email_verification'],
            ['otp' => $otp, 'expires_at' => Carbon::now()->addMinutes(15)]
        );

        try {
            Mail::to($request->email)->send(new EmailVerificationMail($otp));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Mail sending failed: ' . $e->getMessage());
        }

        // Create Sanctum token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registration successful! Verification OTP sent to your email. 🎉',
            'data'    => [
                'user'  => $user,
                'token' => $token,
            ],
        ], 201);
    }

    /**
     * Verify User Email
     * POST /api/auth/verify-email
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp'   => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $userOtp = UserOtp::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('type', 'email_verification')
            ->first();

        if (!$userOtp || $userOtp->expires_at < Carbon::now()) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 400);
        }

        $user = User::where('email', $request->email)->first();
        if ($user) {
            $user->email_verified_at = now();
            $user->save();
        }

        $userOtp->delete();

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully! ✅',
            'user'    => $user,
        ]);
    }

    /**
     * Login an existing user
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Email ya password galat hai! ❌',
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful! 🎉',
            'data'    => [
                'user'  => $user,
                'token' => $token,
            ],
        ]);
    }

    /**
     * Get current logged-in user
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data'    => [
                'user'       => $user,
                'businesses' => $user->businesses()->with('reviews')->get(),
            ],
        ]);
    }

    /**
     * Logout — delete current token
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully! 👋',
        ]);
    }

    /**
     * Update profile
     * PUT /api/auth/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name'  => 'sometimes|required|string|max:60',
            'phone' => 'nullable|string|max:15',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user->update($request->only(['name', 'phone']));

        return response()->json([
            'success' => true,
            'message' => 'Profile updated! ✅',
            'data'    => $user,
        ]);
    }

    /**
     * Change password
     * PUT /api/auth/password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password'         => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password galat hai! ❌',
            ], 401);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully! 🔒',
        ]);
    }

    /**
     * Admin login — verify password and return admin token
     * POST /api/admin/login
     */
    public function adminLogin(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Password is required.'], 422);
        }

        $adminPassword = env('ADMIN_PASSWORD');

        // Timing-safe comparison to prevent timing attacks
        if (empty($adminPassword) || !hash_equals($adminPassword, $request->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid admin password.'], 401);
        }

        // Generate token using hash_hmac (must match AdminMiddleware)
        $token = hash_hmac('sha256', $adminPassword, env('APP_KEY', ''));

        // Store token in cache for session-based validation (8 hour TTL)
        \Illuminate\Support\Facades\Cache::put(
            'admin_session:' . $token,
            true,
            now()->addHours(8)
        );

        return response()->json([
            'success' => true,
            'token'   => $token,
        ]);
    }

    /**
     * Get all registered users/accounts (Admin only)
     * GET /api/admin/users
     * Protected by admin middleware — no password check needed here
     */
    public function adminUsersIndex(Request $request): JsonResponse
    {

        $users = User::with(['businesses' => function ($query) {
            $query->withCount(['reviews', 'qrScans'])->latest();
        }])
        ->latest()
        ->get();

        $formatted = $users->map(function ($u) {
            $bizList = $u->businesses->map(function ($biz) {
                return [
                    'id' => $biz->id,
                    'name' => $biz->name,
                    'type' => $biz->type,
                    'emoji' => $biz->emoji,
                    'plan' => $biz->plan,
                    'registeredAt' => $biz->created_at ? $biz->created_at->timestamp * 1000 : null,
                    'reviews' => $biz->reviews_count,
                    'scans' => $biz->qr_scans_count,
                    'lastActive' => $biz->updated_at ? $biz->updated_at->timestamp * 1000 : null,
                ];
            });

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone ?? 'N/A',
                'registeredAt' => $u->created_at ? $u->created_at->timestamp * 1000 : null,
                'businesses' => $bizList,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    /**
     * Delete user/account and all associated business data (Admin only)
     * DELETE /api/admin/users/{id}
     */
    public function adminDeleteUser(int $id): JsonResponse
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found.'], 404);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($user) {
            foreach ($user->businesses as $business) {
                // Delete reviews
                $business->reviews()->delete();
                // Delete scans
                $business->qrScans()->delete();
                // Delete analytics
                $business->analyticsEvents()->delete();
                // Delete business
                $business->delete();
            }

            // Delete subscriptions
            $user->subscriptions()->delete();

            // Delete user tokens (Sanctum tokens)
            $user->tokens()->delete();

            // Delete the user
            $user->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'User and all associated business data deleted successfully. 🗑️',
        ]);
    }
}


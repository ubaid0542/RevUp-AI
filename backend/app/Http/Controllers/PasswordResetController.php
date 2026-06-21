<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserOtp;
use App\Mail\PasswordResetMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class PasswordResetController extends Controller
{
    public function sendResetLink(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'No account found with this email.'], 404);
        }

        $otp = sprintf("%06d", mt_rand(100000, 999999));

        UserOtp::updateOrCreate(
            ['email' => $request->email, 'type' => 'password_reset'],
            ['otp' => $otp, 'expires_at' => Carbon::now()->addMinutes(15)]
        );

        try {
            Mail::to($request->email)->send(new PasswordResetMail($otp));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Password reset mail failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to send email. Please check SMTP settings.'], 500);
        }

        return response()->json(['success' => true, 'message' => 'OTP sent to your email.']);
    }

    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'otp' => 'required|digits:6'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Invalid data provided.'], 422);
        }

        $userOtp = UserOtp::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('type', 'password_reset')
            ->first();

        if (!$userOtp || $userOtp->expires_at < Carbon::now()) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 400);
        }

        return response()->json(['success' => true, 'message' => 'OTP verified successfully.']);
    }

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|digits:6',
            'password' => 'required|min:6'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Invalid data provided.'], 422);
        }

        $userOtp = UserOtp::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('type', 'password_reset')
            ->first();

        if (!$userOtp || $userOtp->expires_at < Carbon::now()) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 400);
        }

        $user = User::where('email', $request->email)->first();
        $user->password = Hash::make($request->password);
        $user->save();

        $userOtp->delete();

        return response()->json(['success' => true, 'message' => 'Password reset successfully. You can now login.']);
    }
}

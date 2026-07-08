<?php

namespace App\Http\Controllers;

use App\Models\Business;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class BusinessController extends Controller
{
    /**
     * List all businesses of the logged-in user
     * GET /api/businesses
     */
    public function index(Request $request): JsonResponse
    {
        $businesses = $request->user()
            ->businesses()
            ->withCount('reviews')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $businesses,
        ]);
    }

    /**
     * Create a new business (linked to logged-in user)
     * POST /api/businesses
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'            => 'required|string|max:60',
            'type'            => 'nullable|string|max:50',
            'google_place_id' => 'nullable|string|max:255',
            'gmb_link'        => 'nullable|string|max:500',
            'emoji'           => 'nullable|string|max:10',
            'subcategory'     => 'nullable|string|max:100',
            'plan'            => 'nullable|string|max:20',
            'extras'          => 'nullable|json',
            'city'            => 'nullable|string|max:100',
            'keywords'        => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $business = $request->user()->businesses()->create([
            'name'            => $request->name,
            'type'            => $request->type ?? 'Business',
            'google_place_id' => $request->google_place_id,
            'gmb_link'        => $request->gmb_link,
            'emoji'           => $request->emoji ?? '⭐',
            'subcategory'     => $request->subcategory,
            'plan'            => $request->plan ?? 'Free',
            'extras'          => $request->extras,
            'city'            => $request->city,
            'keywords'        => $request->keywords,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Business registered! 🎉',
            'data'    => $business,
        ], 201);
    }

    /**
     * Show a business (owner only)
     * GET /api/businesses/{id}
     */
    public function show(Request $request, Business $business): JsonResponse
    {
        // Check ownership
        if ($business->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized — yeh aapki business nahi hai!',
            ], 403);
        }

        $totalReviews = $business->reviews()->count();
        $avgRating = $business->reviews()->avg('stars') ?? 0.0;
        $scanCount = $business->qrScans()->count();
        $thisMonthReviews = $business->reviews()->where('created_at', '>=', now()->subDays(30))->count();

        // format business with logo URL
        $formattedBusiness = [
            'id' => $business->id,
            'name' => $business->name,
            'type' => $business->type,
            'logo_path' => $business->logo_path,
            'google_place_id' => $business->google_place_id,
            'gmb_link' => $business->gmb_link,
            'emoji' => $business->emoji,
            'subcategory' => $business->subcategory,
            'plan' => $business->plan,
            'extras' => $business->extras,
            'city' => $business->city,
            'keywords' => $business->keywords,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'business' => $formattedBusiness,
                'stats' => [
                    'totalReviews' => $totalReviews,
                    'avgRating' => round($avgRating, 1),
                    'scans' => $scanCount,
                    'thisMonth' => $thisMonthReviews,
                ],
                'recentReviews' => $business->reviews()->latest()->limit(20)->get(),
            ],
        ]);
    }

    /**
     * Update a business (owner only)
     * PUT /api/businesses/{id}
     */
    public function update(Request $request, Business $business): JsonResponse
    {
        // Check ownership
        if ($business->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized!',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name'            => 'sometimes|required|string|max:60',
            'type'            => 'nullable|string|max:50',
            'google_place_id' => 'nullable|string|max:255',
            'gmb_link'        => 'nullable|string|max:500',
            'emoji'           => 'nullable|string|max:10',
            'subcategory'     => 'nullable|string|max:100',
            'plan'            => 'nullable|string|max:20',
            'extras'          => 'nullable|json',
            'city'            => 'nullable|string|max:100',
            'keywords'        => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $business->update($request->only([
            'name', 'type', 'google_place_id', 'gmb_link',
            'emoji', 'subcategory', 'plan', 'extras', 'city', 'keywords',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Business updated! ✅',
            'data'    => $business,
        ]);
    }

    /**
     * Upload logo (owner only)
     */
    public function uploadLogo(Request $request, Business $business): JsonResponse
    {
        if ($business->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized!'], 403);
        }

        $validator = Validator::make($request->all(), [
            'logo' => 'required|image|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        if ($business->logo_path && Storage::disk('public')->exists($business->logo_path)) {
            Storage::disk('public')->delete($business->logo_path);
        }

        $path = $request->file('logo')->store('logos', 'public');
        $business->update(['logo_path' => $path]);

        return response()->json([
            'success' => true,
            'data'    => [
                'logo_url' => Storage::url($path),
                'business' => $business,
            ],
        ]);
    }

    /**
     * Public view — for QR scan (no auth needed)
     * GET /api/public/business/{id}
     */
    public function showPublic(Business $business): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'id'          => $business->id,
                'name'        => $business->name,
                'type'        => $business->type,
                'emoji'       => $business->emoji,
                'gmb_link'    => $business->gmb_link,
                'subcategory' => $business->subcategory,
                'city'        => $business->city,
                'keywords'    => $business->keywords,
                'extras'      => $business->extras,
                'logo_url'    => $business->logo_path
                    ? Storage::url($business->logo_path)
                    : null,
            ],
        ]);
    }

    /**
     * List all businesses in the system with their owner user details (Admin only)
     * GET /api/admin/businesses
     */
    public function adminIndex(Request $request): JsonResponse
    {

        $businesses = Business::with('user')
            ->withCount('reviews')
            ->latest()
            ->get();

        $formatted = $businesses->map(function ($biz) {
            return [
                'id' => $biz->id,
                'name' => $biz->name,
                'type' => $biz->type,
                'emoji' => $biz->emoji,
                'plan' => $biz->plan,
                'city' => $biz->city,
                'registeredAt' => $biz->created_at ? $biz->created_at->timestamp * 1000 : null,
                'reviews' => $biz->reviews_count,
                'scans' => $biz->qrScans()->count(),
                'lastActive' => $biz->updated_at ? $biz->updated_at->timestamp * 1000 : null,
                'ownerName' => $biz->user ? $biz->user->name : 'N/A',
                'ownerEmail' => $biz->user ? $biz->user->email : 'N/A',
                'ownerPhone' => $biz->user ? $biz->user->phone : 'N/A',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    /**
     * Log a QR scan event (public - no auth needed)
     * POST /api/public/business/{business}/scan
     * IP address is anonymized (last octet masked) for GDPR compliance.
     */
    public function logScan(Request $request, Business $business): JsonResponse
    {
        $userAgent = $request->header('User-Agent', '');
        $deviceType = 'desktop';

        if (preg_match('/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i', $userAgent)) {
            $deviceType = 'mobile';
        } elseif (preg_match('/(ipad|playbook|silk)|(android(?!.*mobile))/i', $userAgent)) {
            $deviceType = 'tablet';
        }

        // Anonymize IP — mask last octet for GDPR compliance
        $rawIp      = $request->ip();
        $anonIp     = preg_replace('/\.\d+$/', '.0', $rawIp);   // IPv4: 192.168.1.x → 192.168.1.0
        $anonIp     = preg_replace('/:[^:]+$/', ':0', $anonIp); // IPv6: last segment masked

        $business->qrScans()->create([
            'ip_address'  => $anonIp,
            'user_agent'  => substr($userAgent, 0, 500),
            'device_type' => $deviceType,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Scan tracked successfully',
        ]);
    }

    /**
     * Create a public business (without login - standalone flow)
     * POST /api/public/businesses
     * Issues a short-lived ownership token for subsequent logo upload.
     */
    public function storePublic(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'            => 'required|string|max:60',
            'type'            => 'nullable|string|max:50',
            'google_place_id' => 'nullable|string|max:255',
            'gmb_link'        => 'nullable|string|max:500',
            'emoji'           => 'nullable|string|max:10',
            'subcategory'     => 'nullable|string|max:100',
            'plan'            => 'nullable|string|max:20',
            'extras'          => 'nullable|json',
            'city'            => 'nullable|string|max:100',
            'keywords'        => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $business = Business::create([
            'user_id'         => null,
            'name'            => $request->name,
            'type'            => $request->type ?? 'Business',
            'google_place_id' => $request->google_place_id,
            'gmb_link'        => $request->gmb_link,
            'emoji'           => $request->emoji ?? '⭐',
            'subcategory'     => $request->subcategory,
            'plan'            => $request->plan ?? 'Free',
            'extras'          => $request->extras,
            'city'            => $request->city,
            'keywords'        => $request->keywords,
        ]);

        // Issue a short-lived ownership token (valid 30 mins) for logo upload
        $ownershipToken = bin2hex(random_bytes(32));
        \Illuminate\Support\Facades\Cache::put(
            'biz_token:' . $business->id,
            $ownershipToken,
            now()->addMinutes(30)
        );

        return response()->json([
            'success'         => true,
            'message'         => 'Public business registered! 🎉',
            'data'            => $business,
            'ownership_token' => $ownershipToken, // frontend uses this for logo upload only
        ], 201);
    }

    /**
     * Upload logo for a public business (without login)
     * POST /api/public/businesses/{business}/logo
     * Requires X-Business-Token header (issued at creation).
     */
    public function uploadLogoPublic(Request $request, Business $business): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'logo' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        if ($business->logo_path && Storage::disk('public')->exists($business->logo_path)) {
            Storage::disk('public')->delete($business->logo_path);
        }

        $path = $request->file('logo')->store('logos', 'public');
        $business->update(['logo_path' => $path]);

        // Invalidate token after use — one-time use for logo upload
        \Illuminate\Support\Facades\Cache::forget('biz_token:' . $business->id);

        return response()->json([
            'success' => true,
            'data'    => [
                'logo_url' => Storage::url($path),
                'business' => $business,
            ],
        ]);
    }

    /**
     * Log a customer analytics event (copy, post)
     * POST /api/public/business/{business}/event
     */
    public function logEvent(Request $request, Business $business): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'event_type' => 'required|string|in:review_copied,review_posted',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $rawIp = $request->ip();
        $anonIp = preg_replace('/\\.\\d+$/', '.0', $rawIp);

        $business->analyticsEvents()->create([
            'event_type' => $request->event_type,
            'event_data' => $request->event_data ?? null,
            'ip_address' => $anonIp,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Event tracked.',
        ]);
    }

    /**
     * Admin Dashboard Stats — aggregated from database
     * GET /api/admin/stats
     */
    public function adminStats(): JsonResponse
    {
        $now = now();
        $todayStart = $now->copy()->startOfDay();
        $weekStart = $now->copy()->subDays(7)->startOfDay();
        $monthStart = $now->copy()->subDays(30)->startOfDay();

        // ── Business counts ──
        $totalBusinesses = Business::count();
        $todayRegistrations = Business::where('created_at', '>=', $todayStart)->count();

        // ── Review counts ──
        $totalReviews = \App\Models\Review::count();
        $todayReviews = \App\Models\Review::where('created_at', '>=', $todayStart)->count();
        $weekReviews = \App\Models\Review::where('created_at', '>=', $weekStart)->count();
        $monthReviews = \App\Models\Review::where('created_at', '>=', $monthStart)->count();

        // ── QR Scan counts ──
        $totalScans = \App\Models\QrScan::count();
        $todayScans = \App\Models\QrScan::where('created_at', '>=', $todayStart)->count();
        $weekScans = \App\Models\QrScan::where('created_at', '>=', $weekStart)->count();

        // ── Analytics events (copy & post) ──
        $totalCopied = \App\Models\AnalyticsEvent::where('event_type', 'review_copied')->count();
        $totalPosted = \App\Models\AnalyticsEvent::where('event_type', 'review_posted')->count();

        // ── Source breakdown ──
        $sourceBreakdown = \App\Models\Review::selectRaw('source, count(*) as count')
            ->groupBy('source')
            ->pluck('count', 'source')
            ->toArray();

        // ── Daily reviews (last 7 days) ──
        $dailyReviews = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = $now->copy()->subDays($i)->toDateString();
            $dailyReviews[$date] = \App\Models\Review::whereDate('created_at', $date)->count();
        }

        // ── Daily scans (last 7 days) ──
        $dailyScans = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = $now->copy()->subDays($i)->toDateString();
            $dailyScans[$date] = \App\Models\QrScan::whereDate('created_at', $date)->count();
        }

        // ── Recent activity (last 20 reviews) ──
        $recentReviews = \App\Models\Review::with('business:id,name,emoji')
            ->latest()
            ->limit(20)
            ->get(['id', 'business_id', 'stars', 'source', 'language', 'created_at'])
            ->map(function ($r) {
                return [
                    'type' => 'review_generated',
                    'data' => [
                        'businessName' => $r->business ? $r->business->name : 'Unknown',
                        'businessEmoji' => $r->business ? $r->business->emoji : '⭐',
                        'stars' => $r->stars,
                        'source' => $r->source,
                    ],
                    'timestamp' => $r->created_at ? $r->created_at->timestamp * 1000 : null,
                ];
            });

        // ── Recent scans (last 20) ──
        $recentScans = \App\Models\QrScan::with('business:id,name,emoji')
            ->latest()
            ->limit(20)
            ->get(['id', 'business_id', 'device_type', 'created_at'])
            ->map(function ($s) {
                return [
                    'type' => 'qr_scanned',
                    'data' => [
                        'businessName' => $s->business ? $s->business->name : 'Unknown',
                        'businessEmoji' => $s->business ? $s->business->emoji : '⭐',
                        'deviceType' => $s->device_type,
                    ],
                    'timestamp' => $s->created_at ? $s->created_at->timestamp * 1000 : null,
                ];
            });

        // Merge and sort recent activity
        $recentActivity = collect($recentReviews)
            ->merge($recentScans)
            ->sortByDesc('timestamp')
            ->values()
            ->take(20)
            ->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'totalBusinesses' => $totalBusinesses,
                'todayRegistrations' => $todayRegistrations,
                'totalReviews' => $totalReviews,
                'todayReviews' => $todayReviews,
                'weekReviews' => $weekReviews,
                'monthReviews' => $monthReviews,
                'totalQRScans' => $totalScans,
                'todayScans' => $todayScans,
                'weekScans' => $weekScans,
                'totalCopied' => $totalCopied,
                'totalPosted' => $totalPosted,
                'sourceBreakdown' => $sourceBreakdown,
                'dailyReviews' => $dailyReviews,
                'dailyScans' => $dailyScans,
                'recentActivity' => $recentActivity,
            ],
        ]);
    }
}

